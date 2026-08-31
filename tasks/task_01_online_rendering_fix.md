# Task 01 — Online Rendering Fix (Laptop)

## Status

Status: COMPLETED

- [x] Task created
- [x] Implementation started
- [x] Implementation completed
- [x] Testing completed
- [x] Acceptance criteria verified
- [x] AI_MAP updated
- [x] Task completed

---

## Overview

**What:** The full Spark ERP system does not render completely when accessed online on the laptop. Only the dashboard cards and basic initial info appear. The rest of the system (projects list, finance, suppliers, contractors, reports, settings) either does not load or shows empty/broken state.

**Why:** This breaks the primary use case of the system as a shared, online ERP. If the online mode does not render properly, the laptop user cannot see data entered from other devices or use most features.

**How it fits:** The system is an offline-first PWA built on IndexedDB (Dexie.js) + Cloudflare D1. The store (`store.js`) initializes from local IndexedDB first (instant), then hydrates from the server API in the background (`api.snapshot()`). If API calls fail silently, pages render from an empty local IndexedDB (showing only seed data = default cards/info), making it appear the system is "partly working" while actually being disconnected from the real server data.

---

## Requirements

- **REQ-001:** The project is not working online on the laptop — only cards and basic initial info show, not the full system.

---

## Current Implementation

### What exists:
- `store.js` → `initStore()`: Loads from IndexedDB first, then fires background API hydration via `api.snapshot()`. If snapshot fails, the catch block is silently ignored: `catch { /* Running on local IndexedDB */ }`.
- `SyncEngine.js` → `triggerSync()` / `pullRemoteChanges()`: Periodic sync pulling from `/api/sync/pull`.
- `ConnectivityMonitor.js`: Polls `/api/health` every 60s to determine if server is reachable.
- `api.js`: Thin fetch wrapper that redirects to `login.html` on 401.
- Pages call `await initStore()` then render from the in-memory cache.

### What can be reused:
- All existing store, sync, and API modules.
- Existing error handling patterns.
- Existing connectivity monitoring events.

### What needs investigation / may need modification:
1. **Silent failure in `initStore()`**: The background snapshot catch silently swallows all errors. If the token is expired, the API URL is wrong, or the D1 database returns an error, the page still renders with empty/stale data.
2. **Auth token expiry**: The `spark_token` may be expired or missing. API returns 401, `api.js` redirects to login, but this redirect may not trigger during background hydration in some browser contexts.
3. **`/api/sync/pull` vs `/api/data`**: The frontend calls `api.snapshot()` which hits `GET /api/data`, but `SyncEngine` uses `api.pullSync()` which hits `GET /api/sync/pull`. Both exist in the backend. Need to verify both return correct data.
4. **Cloudflare D1 binding**: If the D1 database ID in `wrangler.toml` is for local dev only and the deployed database is different, production data won't match.
5. **Service Worker interference**: The SW (`sw.js`) uses CacheFirst strategy for all non-API requests. If old JS modules are cached from a previous broken version, the SW may serve stale code that doesn't render the full system.
6. **CORS / CSP issues**: Cloudflare Pages may block certain requests with CORS or CSP headers.

### What is missing:
- User-visible error reporting when API hydration fails.
- A diagnostic/health check visible in the UI.

---

## Files / Modules Affected

| File | Change Type |
|---|---|
| `frontend/assets/js/modules/store.js` | Investigate + possibly modify error handling in `initStore()` |
| `frontend/assets/js/modules/api.js` | Investigate API call failures |
| `frontend/assets/js/sync/SyncEngine.js` | Investigate `pullRemoteChanges()` silent failures |
| `frontend/assets/js/sync/ConnectivityMonitor.js` | Investigate health check logic |
| `frontend/assets/js/modules/preloader.js` | Possibly add error state |
| `frontend/sw.js` | Investigate stale cache interference |
| `functions/api/[[path]].js` | Verify API endpoints respond correctly |
| `frontend/pages/*.html` | All pages may need investigation |
| `frontend/assets/js/pages/*.js` | Page init scripts (all use `initStore()`) |

---

## Data / Architecture Changes

No schema changes expected. The fix is likely:
- Improved error handling and user feedback on API failure.
- Possible cache invalidation fix in Service Worker.
- Possible auth token refresh or re-login flow.
- Possibly: calling `initStore({ force: true })` on reconnect if data is stale.

---

## UI / UX Changes

- **Error state**: If API hydration fails, show a clear toast or banner: "Could not load server data. Showing cached data."
- **Connectivity indicator**: The existing `sync-status-badge.js` should show the correct state. Verify it is correctly wired.
- **No blank pages**: Pages should never silently show empty content — must show either real data or a proper empty state with explanation.
- **RTL/Arabic**: All error messages must be in Arabic (ar.json translations).
- **Loading state**: The preloader should accurately reflect when data is loaded.

---

## Implementation Plan

1. **Open the deployed app on the laptop in Chrome DevTools.**
2. **Check Console for JavaScript errors** — record all errors.
3. **Check Network tab** — verify which API calls are being made and what responses they return.
4. **Check `spark_token` in localStorage/sessionStorage** — is it present and valid?
5. **Check `/api/health` response** — is the server reachable?
6. **Check `/api/data` response** — does it return the full dataset or an error?
7. **Check `/api/sync/pull` response** — same verification.
8. **Check Service Worker status** in DevTools → Application → Service Workers.
9. **Clear the Service Worker cache** and reload — does the full system appear?
10. **Based on findings**, implement the minimal fix:
    - If token expired → fix re-auth flow or extend TTL.
    - If API returns wrong data → fix API or D1 binding.
    - If SW serves stale JS → fix SW cache key versioning (`CACHE_NAME = "spark-erp-cache-v21"`, bump version).
    - If `initStore()` silent error → add user-facing error toast + retry.
    - If Cloudflare D1 misconfigured → fix `wrangler.toml` or dashboard bindings.
11. **Add visible error feedback** so future failures are diagnosable.
12. **Test that all pages render correctly** with real data after fix.

---

## Small Tasks

- [ ] Open the live deployed URL on the laptop in Chrome with DevTools → Console and Network tabs open.
- [ ] Record all JavaScript errors from the console.
- [ ] Check Network tab: identify which API calls fail or return unexpected results.
- [ ] Inspect `spark_token` in Application → Local Storage → verify it exists and is not expired (token TTL is 30 days).
- [ ] Call `/api/health` manually (browser address bar or fetch in console) — verify `{ status: "ok" }`.
- [ ] Call `GET /api/data` with the Bearer token — verify it returns all collections with actual data.
- [ ] Call `GET /api/sync/pull` with the Bearer token — verify it returns `{ ok: true, data: {...} }`.
- [ ] Check Application → Service Workers → verify SW is active and not stuck in "waiting" state.
- [ ] Clear SW cache (Application → Cache Storage → delete `spark-erp-cache-v21`) and force reload — does the system render fully?
- [ ] If SW cache is the issue: bump `CACHE_NAME` version in `sw.js` to force cache invalidation.
- [ ] If API fails: fix the root cause (auth, D1 binding, API route).
- [ ] If `initStore()` silently fails: add error handling that shows a toast and retries after 3 seconds.
- [ ] If token expired: implement a re-login prompt or automatic token refresh.
- [ ] Verify all 10 pages render with real data after the fix.
- [ ] Verify no console errors remain.

---

## Edge Cases

- **Token stored in sessionStorage**: if the browser restored a session without the token (e.g. after restart), the app may not auto-redirect to login in some browser modes.
- **Partial data**: The API returns all 8 collections. If one collection fails (e.g., D1 query error), other collections may still load. The fix must handle partial failures gracefully.
- **Multiple browser tabs**: if one tab has a valid token and another does not, the SW may serve cached pages cross-tab.
- **Dev vs Production D1**: The `wrangler.toml` database_id `3946df07-a2bd-4038-8790-67b9ce59d027` is the local/dev DB. The production Cloudflare Pages project may use a different database_id set in the dashboard.
- **Empty database**: If the D1 production database was never migrated (no `0001_init.sql` applied), all API calls will return 500 errors.

---

## Testing Checklist

- [ ] Normal flow: open app online → full system renders with real data
- [ ] Empty state: if no data in DB, appropriate empty states show (not blank/broken UI)
- [ ] Invalid/expired token: user is redirected to login page, not stuck on blank page
- [ ] API error: user sees a clear error message / toast (not silent blank state)
- [ ] After fix: all 10 pages navigate correctly (dashboard, projects, project detail, finance, suppliers, contractors, reports, settings, statement, login)
- [ ] Browser console: zero JavaScript errors
- [ ] Network: all API calls return 200 (or expected responses)
- [ ] Service Worker: no stuck "waiting" state
- [ ] After clearing cache and reloading: system still works correctly
- [ ] Mobile layout (verify this fix does not break mobile — related to Task 02)

---

## Acceptance Criteria

- The full Spark ERP system renders all pages and all data when accessed online on the laptop.
- No pages show only "basic cards" — all collections (projects, suppliers, contractors, finance, materials) are visible with real server data.
- Zero JavaScript errors in the browser console.
- The sync badge shows "synced" (green) when online.
- The system correctly shows a user-visible error when offline or when the API is unreachable.
- The login flow works correctly (expired session redirects to login).

---

## Dependencies

Depends on:
- None (this is the first task)

---

## AI_MAP Impact

After implementation, update:
- `README.md` — if API endpoint behavior changed
- `COMMIT_TRACKING.md` — add commit entry for this fix
- `TESTING_GUIDE.md` — add new test cases for online rendering regression
