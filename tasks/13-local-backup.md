# Task 13 — Automatic Local Backup (Twice Daily) Synced with the DB

## Task Description
The app must automatically keep a local backup of all data so that the owner's
records survive a database failure. A backup is taken **automatically twice a day**
(after ~12 hours of elapsed time) in addition to being available on demand from the
Settings page.

Because the current data layer is `localStorage` (`spark_db_v1`), the local backup is
implemented as a **full snapshot export** of the database that the browser downloads
as a JSON file, keeping the last backup timestamp so the "twice daily" schedule can be
enforced. Restoring is done from a downloaded backup file in the Settings page.

## Required Implementation Steps
1. Add `frontend/assets/js/modules/backup.js` with:
   - `buildBackupData()` — collects the DB (`spark_db_v1`) plus app prefs
     (`spark_lang`, `spark_theme`) into one structured object with a version + date.
   - `downloadBackup()` — serializes to JSON and triggers a browser file download
     named `spark-backup-YYYY-MM-DD.json`, then records the backup timestamp.
   - `restoreBackup(file, onOk, onError)` — reads the file, validates the shape,
     writes the keys back into `localStorage`, then calls `onOk()`; otherwise `onError()`.
   - `getLastBackupTime()` — ISO timestamp of the last backup (or null).
   - `maybeAutoBackup()` — if the last backup is older than ~12 hours and the app has
     not already auto-backed up this session, download a backup automatically.
2. Call `maybeAutoBackup()` once from `initLayout()` in `layout.js` (guarded by a
   `sessionStorage` flag so it fires at most once per browser session).
3. In the Settings page add a **Backup** card with:
   - "Download backup now" button → `downloadBackup()`
   - "Restore backup" file input → `restoreBackup()` → toast + reload on success
   - a "Last backup" line showing `getLastBackupTime()`.
4. Add i18n keys (en/ar) for backup labels and success/error toasts.

## Expected Files to Modify
- `frontend/assets/js/modules/backup.js` (new)
- `frontend/assets/js/modules/layout.js`
- `frontend/pages/settings.html`
- `frontend/assets/js/pages/settings.js`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`

## Completion Criteria
- "Download backup now" downloads a JSON file containing the full DB + prefs.
- Restore loads the file back into localStorage and reloads with data intact.
- After 12+ hours without a backup, the first app open in a session auto-downloads a
  backup (checked against the stored timestamp); never more than once per session.
- Works in both English and Arabic.
