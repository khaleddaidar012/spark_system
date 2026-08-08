# Task 12 — Settings Page + "Delete All Data" with Password Confirmation

## Task Description
Add a **Settings** page to the app that contains a "Delete all data" button in a
danger zone. Clicking it opens a confirmation modal that requires the admin
**password to be entered twice** (type password, then confirm password). Only when
both match the admin password is the database wiped.

To protect the owner, a full backup file is downloaded automatically **before** the
data is deleted, so the deletion can always be undone from the backup.

## Required Implementation Steps
1. Add `frontend/assets/js/modules/auth.js` exporting the admin credentials and a
   `verifyAdminPassword(password)` helper (single source of truth; reuse the same
   `admin` / `Spark@2026#ERP` credentials used by `login.js`).
2. Add `frontend/pages/settings.html` (modeled on `contractors.html` structure) with:
   - standard `data-page="settings"` + sidebar/navbar roots
   - a **Danger Zone** card with a "Delete all data" button
   - a confirmation modal (`modal-overlay` + `modal modal-sm`) with two password
     inputs and an inline error message
3. Add `frontend/assets/js/pages/settings.js`:
   - open the modal on click
   - validate both passwords match and equal the admin password
   - on success: download a backup first, then `clearAll()` from the store, show a
     toast, and redirect to `login.html`
   - on mismatch/wrong password: show inline error
4. Add Settings link to `frontend/components/sidebar.html` and register
   `settings` in `PAGE_META` inside `frontend/assets/js/modules/layout.js`.
5. Add i18n keys (en/ar) for all new labels (title, subtitle, danger zone,
   password, confirm password, error messages, cancel/delete buttons, backup card).
6. Add `frontend/assets/css/pages/settings.css` and import it in `main.css`.

## Expected Files to Modify
- `frontend/assets/js/modules/auth.js` (new)
- `frontend/pages/settings.html` (new)
- `frontend/assets/js/pages/settings.js` (new)
- `frontend/assets/css/pages/settings.css` (new)
- `frontend/components/sidebar.html`
- `frontend/assets/js/modules/layout.js`
- `frontend/assets/js/modules/store.js` (`clearAll` already exists)
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`
- `frontend/assets/css/main.css`

## Completion Criteria
- Settings page reachable from the sidebar, breadcrumb works.
- Delete button opens a modal requiring the password twice.
- Wrong/mismatched password shows an inline error and does nothing.
- Correct password downloads a backup then wipes the DB and returns to login.
- Works in both English and Arabic.
