# Task 03 — Sync Stuck Fix

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

**What:** When the user performs operations offline on the phone and then reconnects to the internet, the sync process gets permanently stuck. The UI shows "syncing" indefinitely but never completes, and the pending changes are never pushed to the server.

**Why:** This is a critical data integrity issue. If sync is stuck, data entered offline is never saved to the server and will be lost if the browser data is cleared. Users cannot trust the system with important business data.

**How it fits:** The offline-first architecture uses:
- `SyncEngine.triggerSync()` which sets `this.isSyncing = true`
- If the sync fails with an uncaught error or a deadlock, `this.isSyncing` is never reset to `false`
- The `ConnectivityMonitor` detects reconnection and calls `triggerSync()` but it returns early due to `if (this.isSyncing) return`
- Result: permanently stuck in "syncing" state until page reload

---

## Requirements

- **REQ-003:** When I do something offline on the phone and connect to the internet, it gets stuck saying "syncing" and never moves.

---

## Current Implementation

### What exists:

**`SyncEngine.js` — `triggerSync()`:**
```
async triggerSync() {
  if (this.isSyncing) return;           // Guard: prevents re-entry
  this.isSyncing = true;                // Set lock
  ...
  try {
    ... push + pull ...
  } catch (err) {
    this._emitStatus("error", { error: err.message });
  } finally {
    this.isSyncing = false;             // Release lock in finally
  }
}
```

The `finally` block should always release the lock. However, there are known failure modes:
1. **`api.pushSync()` hangs indefinitely** — if the network request never resolves (no timeout), `triggerSync()` stays awaited forever, `this.isSyncing` stays `true`.
2. **`api.pullSync()` hangs** — same issue after push completes.
3. **Silent error in push loop** — the `while(true)` loop in `pushPendingOperations()` has a `batchNum > 20` guard but can still loop for a very long time.
4. **`_getPendingIndexedDBItems()` hangs** — if IndexedDB is locked or corrupted on mobile, the initial Dexie query never resolves.
5. **Sync queue items with `status: "error"` (retryCount >= 10)** — these are permanently failed and are skipped, but the queue count may still show them as pending, causing a mismatch.

**`ConnectivityMonitor.js`:**
- Fires `spark:connectivity-changed` with `isServerReachable: true` on reconnection
- `SyncEngine` listens and calls `triggerSync()` — but if `isSyncing` is true, it returns immediately
- The 60-second periodic sync will also fail silently if `isSyncing` is stuck

**`sync-queue.js` — `markFailed()`:**
- Items with `retryCount >= 10` are permanently marked `status: "error"` and never retried
- These items still exist in `syncQueue` but `getPendingCount()` queries `status === "pending"` only
- However, the `_getPendingIndexedDBItems()` in SyncEngine may pick these up from IndexedDB `syncStatus: "pending"` which could cause a count mismatch

**`sync-status-badge.js`:**
- Listens to `spark:sync-status` events
- Shows "syncing" state when `status === "syncing"`
- The panel auto-closes after 3 seconds on success
- If no `synced` event fires, the panel stays visible indefinitely showing "syncing"

### Root Cause Hypotheses (to verify):
1. **No network timeout on fetch** — `api.js` has no timeout wrapper. A slow/stalled mobile network can cause fetch to hang for minutes.
2. **`isSyncing` lock not released after partial failure** — if a specific error path exits `triggerSync()` without hitting the `finally` block (JavaScript engine crash, unhandled promise rejection), the lock stays.
3. **IndexedDB locked on mobile after background** — when a mobile app is backgrounded, the browser may lock IndexedDB. On foreground return, the Dexie query hangs.
4. **`api.pushSync()` endpoint does not exist on the deployed server** — if `POST /api/sync/push` is not deployed to Cloudflare Pages Functions (only `GET /api/data` and `POST /api/data` exist in the documented API in README), the push call returns 404, the error is caught, and sync fails. Looking at the code: `/api/sync/push` IS implemented in `functions/api/[[path]].js` lines 505-519, but the README does not document it, suggesting it may have been added after the README was written and may not be deployed.

---

## Files / Modules Affected

| File | Change Type |
|---|---|
| `frontend/assets/js/sync/SyncEngine.js` | Fix lock management, add timeout, fix error handling |
| `frontend/assets/js/modules/api.js` | Add fetch timeout wrapper |
| `frontend/assets/js/sync/sync-queue.js` | Verify error item handling |
| `frontend/assets/js/sync/ConnectivityMonitor.js` | Possibly: add forced sync after N minutes if stuck |
| `frontend/assets/js/components/sync-status-badge.js` | Add stuck-sync detection and manual retry UI |
| `functions/api/[[path]].js` | Verify `/api/sync/push` and `/api/sync/pull` are deployed |

---

## Data / Architecture Changes

### Sync Architecture:
- **No change to data schema** (IndexedDB or D1).
- **Add fetch timeout** to `api.js` — all API calls should timeout after 30 seconds.
- **Add stuck-sync watchdog** — if `isSyncing` has been `true` for more than 2 minutes, force-reset it and retry.
- **Add sync retry button** — the sync panel already has a "retry" button (`panelRetry`), but it may not properly reset the stuck state.
- **Verify `/api/sync/push` deployment** — this endpoint must be live on Cloudflare Pages.

### Business Logic Safety:
- The sync queue uses FIFO ordering. If stuck items are forcibly cleared without being pushed to the server, data will be lost. The fix must NOT clear pending items — it must either push them successfully or retain them for the next retry.
- Items with `status: "error"` (permanent failures after 10 retries) should be surfaced to the user as "unsynced changes" rather than silently ignored.

---

## UI / UX Changes

- **Sync Panel — Stuck State**: Add a maximum timeout for the "syncing" display. If syncing takes > 2 minutes with no progress, show: "Sync is taking longer than expected. Tap to retry." with a retry button.
- **Manual Retry**: The existing retry button (`panelRetry`) must reset `SyncEngine.isSyncing = false` before calling `triggerSync()` again.
- **Permanent failure items**: Show a warning badge or message if sync queue has items with `status: "error"` that will never be retried.
- **Progress**: The sync panel shows "pushed X of Y" — this must remain accurate.
- **RTL**: All sync messages are already in Arabic. Verify after changes.
- **Mobile**: The sync panel must be visible and usable on mobile screen sizes.

---

## Implementation Plan

1. **Verify the `/api/sync/push` endpoint is deployed** on the live Cloudflare Pages project.
   - Open the Cloudflare Pages dashboard → Functions → check if the catch-all function includes the `/sync/push` route.
   - Or: manually call `POST /api/sync/push` with a valid token and verify it returns `{ ok: true }`.

2. **Add a fetch timeout to `api.js`**:
   - Wrap all `fetch()` calls with `Promise.race([fetch(...), timeout(30000)])`.
   - If the request times out, throw `new Error("request-timeout")`.
   - This prevents the sync from hanging indefinitely on slow/stalled mobile networks.

3. **Fix `SyncEngine.js` lock management**:
   - Add a watchdog timer: if `this.isSyncing` remains `true` for more than 120 seconds, force-reset it and emit an error status.
   - Or: convert `triggerSync()` to guarantee the `finally` block runs even if an unhandled rejection occurs (already the case with try/finally — verify this).

4. **Fix the retry button**:
   - In `sync-status-badge.js`, the `panelRetry` click handler calls `syncEngine.triggerSync()` but if `isSyncing` is stuck at `true`, `triggerSync()` returns immediately.
   - Fix: the retry button must call `syncEngine.forceResetSync()` then `syncEngine.triggerSync()`.
   - Add `forceResetSync()` method to `SyncEngine`: `this.isSyncing = false`.

5. **Add permanent-failure item visibility**:
   - Check `db.syncQueue` for items with `status: "error"`. If any exist, show a warning.
   - Add a "clear failed items" option in Settings.

6. **Test the full offline → online sync cycle on phone**:
   - Work offline: add a transaction.
   - Reconnect to internet.
   - Observe sync panel: it must reach 100% within 30 seconds.
   - Verify the transaction appears on the laptop (or another device) after sync.

---

## Small Tasks

- [ ] Verify `POST /api/sync/push` endpoint is live on Cloudflare Pages (call from browser devtools with Bearer token).
- [ ] Verify `GET /api/sync/pull` endpoint is live on Cloudflare Pages.
- [ ] Add a 30-second timeout to all `fetch()` calls in `frontend/assets/js/modules/api.js`.
- [ ] Add `forceResetSync()` method to `SyncEngine` class in `SyncEngine.js`.
- [ ] Fix the `panelRetry` click handler in `sync-status-badge.js` to call `forceResetSync()` before `triggerSync()`.
- [ ] Add a stuck-sync watchdog timer in `SyncEngine.init()`: if `isSyncing` is true for > 120s, auto-reset and emit error.
- [ ] Check `db.syncQueue` for items with `status: "error"` on sync completion and surface count to user.
- [ ] Add a "Clear Failed Sync Items" button in the Settings page for items permanently stuck at error status.
- [ ] Test offline operation on phone: save a transaction offline.
- [ ] Reconnect phone to internet and verify sync completes within 30 seconds.
- [ ] Verify transaction appears on the server (check `/api/data` response from another browser).
- [ ] Test multiple rapid offline saves, then reconnect — all must sync.
- [ ] Verify sync panel auto-closes after 3 seconds on success.
- [ ] Verify sync badge shows green "synced" after successful sync.
- [ ] Verify retry button works correctly when sync is stuck.

---

## Edge Cases

- **Network stalls mid-sync**: fetch starts but data stops flowing. The timeout will trigger the error path.
- **Simultaneous sync from two devices**: The D1 backend uses upsert semantics. Last-write-wins. This is acceptable for now.
- **Empty sync queue but dirty IndexedDB**: `_getPendingIndexedDBItems()` fallback path picks these up. Ensure timeout applies to this fallback path too.
- **Sync during page navigation**: if the user navigates away mid-sync, the Service Worker may interrupt the network request. The sync queue items will remain `pending` and will retry on next page load.
- **Permanent error items** (retryCount >= 10): These must be surfaced to the user and must NOT silently consume sync attempts.
- **IndexedDB locked (mobile background)**: If Dexie throws while the phone was backgrounded, the catch block must reset `isSyncing`.
- **Auth token expires during long offline period**: When reconnecting after a long time offline (> 30 days), the auth token will be expired. The sync will fail with 401. The user must be redirected to login — but offline data must NOT be lost. The sync queue must persist through the re-login.

---

## Testing Checklist

- [ ] Normal flow: work offline on phone → reconnect → sync completes → data appears on another device
- [ ] Empty sync queue: reconnect with no pending changes → sync runs and completes quickly with no errors
- [ ] Large batch: 50+ offline changes → reconnect → all sync successfully (verify batch processing)
- [ ] Network timeout: simulate a stalled network → verify sync fails gracefully with an error message (not stuck)
- [ ] Retry button: when sync shows error → click retry → sync succeeds
- [ ] Stuck lock: if `isSyncing` is true → watchdog resets it → next sync triggers correctly
- [ ] Permanent error items: after 10 retries → items show as permanently failed → user sees warning
- [ ] Token expiry during offline period: re-login → sync queue preserved → sync completes after re-login
- [ ] Mobile background/foreground: background the app mid-sync → foreground it → sync resumes or retries
- [ ] Desktop and mobile: sync works on both
- [ ] API error responses: `POST /api/sync/push` returns 500 → sync marks batch as failed → retries next cycle
- [ ] Sync badge: accurately shows syncing/synced/error/offline states
- [ ] Console: no unhandled promise rejections during sync

---

## Acceptance Criteria

- After working offline on the phone and reconnecting to the internet, all pending changes sync to the server within 30 seconds.
- The sync badge transitions from "syncing" to "synced" (green) after successful sync.
- The sync panel closes automatically 3 seconds after successful sync.
- The sync never gets permanently stuck — the watchdog resets any stuck state within 2 minutes.
- The retry button always works to restart a failed or stuck sync.
- A user-visible warning appears if sync items have permanently failed (after 10 retries).
- No data is lost during the sync process.
- Sync works correctly on both laptop and mobile.

---

## Dependencies

Depends on:
- Task 01 (Online Rendering Fix) — the sync endpoint must be reachable; the auth token must be valid
- Task 02 (Mobile Compatibility Fix) — the mobile environment must work (IndexedDB, network, SW)

---

## AI_MAP Impact

After implementation, update:
- `README.md` — document `/api/sync/push` and `/api/sync/pull` in the API endpoints table
- `TESTING_GUIDE.md` — add sync testing section (offline → online flow)
- `COMMIT_TRACKING.md` — add commit entry for this fix
