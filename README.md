# Spark Engineering ERP System

A modern, responsive ERP web application for **Spark Engineering Company**.
Runs on **Cloudflare Pages** (static frontend) + **Cloudflare Pages Functions**
(API) backed by **Cloudflare D1** (SQLite), so the same company data is shared
and accessible from every device through one online system.

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6 Modules), RTL/LTR + i18n |
| API | Cloudflare Pages Functions (root `functions/`) |
| Database | Cloudflare D1 (SQLite) — single shared DB |
| Backups | Cloudflare KV (automatic twice-daily snapshots + manual) |
| Auth | Server-verified login (username/password) + HMAC-signed bearer token |

---

## Features

- Modern responsive dashboard (mobile-first), Dark/Light mode, Arabic/English
- **Shared online database** — data entered on one device appears on all others
- Projects, materials, finance (money), suppliers, contractors, clients
- Full project financial statements (statement page)
- Automatic twice-daily server backups + manual export/restore
- Server-side authentication — no password stored in the frontend

---

## Folder Structure

```
functions/
  api/[[path]].js   Cloudflare Pages Function (the entire API)
migrations/
  0001_init.sql     D1 schema (apply once per D1 database)
scripts/
  test-api.mjs      Offline API test harness (node:sqlite, no wrangler needed)
frontend/
  assets/js/modules/
    api.js          fetch wrapper + token storage
    store.js        in-memory data facade (sync reads, async sync to API)
    auth.js         login / logout / requireAuth
    backup.js       export/restore + auto server backups
    theme.js, i18n.js, layout.js, modal.js, toast.js, calc.js
  assets/js/pages/  page scripts (await initStore() before rendering)
  pages/            HTML pages
  components/       sidebar / navbar / footer
  data/i18n/        en.json, ar.json
backend/            Legacy local Express server (no longer required)
wrangler.toml       Pages + D1 + KV bindings (no secrets)
```

---

## Local Development

Prerequisite: Node.js 18+ (16 is not supported by Pages Functions).

```bash
# 1. Configure local secrets (copy the template)
cp .dev.vars.example .dev.vars

# 2. Run the Pages site locally (functions + frontend together)
npx wrangler pages dev frontend
```

Open the printed URL (default `http://localhost:8000`). The API is served by
`functions/` and the D1 binding is simulated on your machine.

> The old Express flow (`npm start` in `backend/`) still serves the static
> frontend but provides **no** database API, so use `wrangler pages dev`.

### Offline API tests (no wrangler / no Cloudflare account)

```bash
node scripts/test-api.mjs
```

Runs the full function against an in-memory SQLite database and checks auth,
seed, upsert/delete round-trips, restore, and reset.

---

## Database & Migrations

```bash
# Local
npx wrangler d1 migrations apply DB --local

# Production (run once per D1 database)
npx wrangler d1 migrations apply DB --remote
```

Tables: `projects`, `people` (kind: suppliers/contractors/clients/others),
`materials`, `money_transactions`, `material_transactions`. Each row stores the
full item JSON in a `data` column plus key columns, so the API returns
byte-identical objects to the frontend.

---

## Deploying to Cloudflare

1. Create a **D1 database** and a **KV namespace** (Dashboard > Workers & Pages
   > D1 / KV), copy their IDs into `wrangler.toml`.
2. Run the migration above (set your D1 `database_id` first).
3. Push the repo to GitHub and connect the **Pages project** to it
   (build output directory: `frontend`). Functions under `functions/` are
   deployed automatically. No build command required.
4. In the Pages project settings add the **Environment Variables**:
   - `SPARK_ADMIN_USERNAME`
   - `SPARK_ADMIN_PASSWORD_HASH` (SHA-256 hex of the admin password)
   - `AUTH_SECRET` (long random string)
5. Add the **Bindings** with the same names as `wrangler.toml`:
   - `DB` → the D1 database
   - `BACKUP_KV` → the KV namespace
6. Deploy via the dashboard or `npx wrangler pages deploy frontend`.

Generate the password hash:

```bash
node -e "process.stdout.write(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" 'YOUR_PASSWORD'
```

---

## API Endpoints (all under `/api`)

| Method & Path | Description |
| ------------- | ----------- |
| `GET  /health` | Health check |
| `POST /auth/login` | Verify username/password, returns bearer token |
| `POST /auth/verify` | Check a password (used by settings) |
| `POST /auth/logout` | Invalidate the token |
| `GET  /data` | Full database snapshot (all 8 collections) |
| `POST /data` | Upsert one item `{collection, item}` |
| `DELETE /data` | Delete one item `{collection, id}` |
| `POST /data/seed` | Insert demo data when the DB is empty |
| `POST /data/restore` | Replace the whole DB `{db}` |
| `POST /data/reset` | Empty the DB |
| `POST /backup` | Store a backup snapshot (KV) |
| `GET  /backup/latest` | Retrieve the latest server backup (KV) |

All endpoints except `/health` and `/auth/login` require `Authorization:
Bearer <token>`.

---

## Development Login

```
Username: admin
Password: Spark@2026#ERP
```

The password hash is configured via `SPARK_ADMIN_PASSWORD_HASH` (see
`.dev.vars.example`). Change it before going live and rotate `AUTH_SECRET`.

---

## GitHub

Repository: `https://github.com/khaleddaidar012/spark_system`

---

## License

Private project — Spark Engineering Company.
