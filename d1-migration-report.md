# D1 Migration Report — localStorage → Cloudflare D1 + Pages Functions

The ERP frontend previously stored all data in the browser's `localStorage`, so
each device had its own isolated copy. This migration moves the data to a
single shared **Cloudflare D1** database served through **Cloudflare Pages
Functions**, without changing the frontend UI.

---

## 1. New Architecture

```
Browser (frontend/ static pages)
   │  fetch("/api/...")  +  Bearer token
   ▼
Cloudflare Pages Function  (functions/api/[[path]].js)
   │  D1 binding: DB
   ▼
Cloudflare D1 (SQLite) — single shared database for all devices
   │  KV binding: BACKUP_KV (automatic twice-daily snapshots)
   ▼
Cloudflare KV — backup copies
```

- `wrangler.toml` declares the `DB` (D1) and `BACKUP_KV` (KV) bindings and sets
  `pages_build_output_dir = "./frontend"`.
- Functions live in the **repo root `functions/`** (the Pages convention for
  Git-connected projects). The build output is `frontend/`.

---

## 2. Database Schema — `migrations/0001_init.sql`

Five tables. Each stores the full item JSON in a `data` column plus a few key
columns so the API returns **byte-identical objects** to the frontend (no
field loss) and insertion order is preserved via `rowid`.

| Table | Key columns | Mapped frontend collections |
| ----- | ----------- | --------------------------- |
| `projects` | `id`, `name`, `type`, `status`, `created_at`, `data` | `projects` |
| `people` | `id`, `kind`, `name`, `roles`, `data` | `suppliers`, `contractors`, `clients`, `others` |
| `materials` | `id`, `name`, `data` | `materials` |
| `money_transactions` | `id`, `direction`, `person_id`, `project_id`, `created_at`, `data` | `moneyTransactions` |
| `material_transactions` | `id`, `direction`, `project_id`, `created_at`, `data` | `materialTransactions` |

People of all four kinds share the `people` table; the `kind` column maps them
back to the correct collection in every snapshot. All writes use
`INSERT ... ON CONFLICT(id) DO UPDATE`, so upserts are idempotent and safe to
re-run (e.g. for network retries).

Apply once per database:

```bash
npx wrangler d1 migrations apply DB --local    # local
npx wrangler d1 migrations apply DB --remote   # production
```

---

## 3. API Endpoints (Pages Function `functions/api/[[path]].js`)

All under `/api`. Everything except `/health` and `/auth/login` requires
`Authorization: Bearer <token>`.

| Method & Path | Description |
| ------------- | ----------- |
| `GET  /health` | Health check `{status, service, time}` |
| `POST /auth/login` | Verify username/password (server-side), returns `{token, username}` |
| `POST /auth/verify` | Check a password without logging in (settings page) → `{ok}` |
| `POST /auth/logout` | Returns 204 (token is stateless) |
| `GET  /data` | Full snapshot of all 8 collections (project + 4 person kinds + materials + both transaction kinds) |
| `POST /data` | Upsert one item `{collection, item}` |
| `DELETE /data` | Delete one item `{collection, id}` |
| `POST /data/reset` | Empty all tables |
| `POST /data/seed` | Insert demo data, only when the DB is empty |
| `POST /data/restore` | Replace the whole DB from `{db}` (used by backup restore) |
| `POST /backup` | Store a snapshot in KV (requires `BACKUP_KV`) |
| `GET  /backup/latest` | Retrieve the latest KV snapshot |

Unsupported/invalid requests return `400`, unknown routes `404`, unauthenticated
`401`, and `BACKUP_KV` missing returns `501`.

---

## 4. Authentication (was: hardcoded in frontend)

The old `auth.js` embedded `ADMIN.username` + password hash in the browser.
Now:

- Credentials live only in environment variables:
  - `SPARK_ADMIN_USERNAME`
  - `SPARK_ADMIN_PASSWORD_HASH` (SHA-256 hex of the password)
  - `AUTH_SECRET` (long random string used to sign tokens)
- `POST /auth/login` hashes the submitted password and compares it with a
  constant-time check. On success it returns an HMAC-SHA256 **bearer token**
  (base64url payload `{u, exp}` + signature), valid 30 days.
- The browser stores the token in `sessionStorage` (or `localStorage` when
  "Remember me" is checked) via the new `frontend/assets/js/modules/api.js`.
- `requireAuth()` on every protected page redirects to `login.html` when no
  token exists; any `401` from the API clears the token and redirects.
- A fallback hash is built into the function so the app keeps working with the
  existing development login until real secrets are set in Cloudflare.

---

## 5. Changed Frontend Files

New modules:

- `frontend/assets/js/modules/api.js` — fetch wrapper, token storage,
  401 handling, `api.login/verifyPassword/snapshot/save/remove/reset/seed/
  restore/backup/backupLatest/health`.

Rewritten modules (same exported names, so pages kept working):

- `frontend/assets/js/modules/store.js` — in-memory cache hydrated by
  `await initStore()`. `all/get/personHasRole/allPeople/peopleWithRole/
  findPersonById` read from memory (synchronous, unchanged callers); `save/
  remove` update the cache optimistically then push to the API. Added
  `dbSnapshot()` (used by backup) and async `wipeAll()`/`clearAll()`.
- `frontend/assets/js/modules/auth.js` — `login(username, password, remember)`
  calls the API; kept `isLoggedIn`, `requireAuth`, `logout`. Removed
  `ADMIN`, `verifyAdminPassword`, `createSession`.
- `frontend/assets/js/modules/backup.js` — backup/restore now operate on the
  shared DB via `api.restore()`; server push uses the bearer token; kept local
  download fallback and `initAutoBackup()`.

Edited page scripts (each now `await initStore()` before rendering):

- `login.js` (API login), `settings.js` (`api.verifyPassword`, `await wipeAll()`)
- `projects.js`, `project.js`, `suppliers.js`, `contractors.js`, `finance.js`,
  `reports.js`, `statement.js`

New config/docs:

- `wrangler.toml` — Pages + D1 + KV bindings
- `.dev.vars.example` — local secrets template
- `.gitignore` — added `.dev.vars`, `.wrangler/`
- `README.md` — rewritten with local dev + Cloudflare deploy steps
- `scripts/test-api.mjs` — offline API tests (see §7)

Unchanged: `backend/` legacy Express server (no longer required), all HTML,
CSS, `actions.js`, `quick-add.js`, `calc.js`, theme/i18n/modal/layout/toast.

---

## 6. Env / Config Required in Cloudflare

In the Pages project → Settings → **Variables and Secrets**:

| Variable | Value |
| -------- | ----- |
| `SPARK_ADMIN_USERNAME` | admin username |
| `SPARK_ADMIN_PASSWORD_HASH` | SHA-256 hex of the password |
| `AUTH_SECRET` | long random string |

In the Pages project → Settings → **Bindings**:

| Binding | Type | Target |
| ------- | ---- | ------ |
| `DB` | D1 database | the D1 database |
| `BACKUP_KV` | KV namespace | the KV namespace |

Generate the password hash:

```bash
node -e "process.stdout.write(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" 'YOUR_PASSWORD'
```

---

## 7. Verification

**Offline API tests** (`node scripts/test-api.mjs`, uses Node's built-in
`node:sqlite`; no wrangler needed):

```
RESULT: 27 passed, 0 failed
```

Covers: health, auth required, login reject/accept, empty snapshot shape,
seed insert + skip-when-full, seed counts, nested project arrays, upsert
persistence, transaction add/delete, exact JSON round-trip, password verify,
backup-without-KV → 501, full restore replace, reset, auth on protected
endpoints, invalid token rejection.

**Browser end-to-end** (via `scripts/dev-server.mjs` serving the real function
over in-memory D1):

- Login with `admin / Spark@2026#ERP` → redirects to dashboard, layout renders.
- Projects page lists the seeded project; project detail page shows cost
  summary, analytics, contractors, materials, and money — all from the API.
- Quick Add → new money transaction saved (2 `POST /api/data` → 200).
- After a full page reload the new transaction still appears (persisted in the
  DB) on the project detail page and the finance page.
- Zero console errors across login/dashboard/projects/project/statement/finance.

---

## 8. Cloudflare Deploy Steps (summary)

1. Set your real IDs in `wrangler.toml` (`database_id`, KV `id`).
2. Create the D1 database and KV namespace in the dashboard.
3. `npx wrangler d1 migrations apply DB --remote`.
4. Connect the GitHub repo to a Pages project (build output `frontend`).
5. Add the three env vars and the `DB` + `BACKUP_KV` bindings.
6. Deploy (dashboard auto-deploy on push, or `npx wrangler pages deploy frontend`).

Note: this machine's C: drive is full (`ENOSPC`), so `wrangler` could not be
installed locally; all API logic was verified with the `node:sqlite` harness
and the browser smoke test instead.
