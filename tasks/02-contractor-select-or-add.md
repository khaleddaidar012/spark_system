# Task 2 — Contractor: Choose Existing or Add New Person

## Task Description
The owner wants, when adding a contractor to a project, to either **choose from the
existing contractors** or **add a brand new person** without leaving the form.

Current behavior: the "Add Contractor" modal on the project detail page only accepts a
free-text name, so the owner must retype the contractor every time.

Required behavior (owner's words):
- "عاوزين وانا بضيف المقاولين عاوز يا اما اختار من ال موجود يا اما اضيف شخص جديد"
- When adding a contractor to a project: pick from already-saved contractors, or open
  the quick-add person flow to create a new one.

## Goal
Let the user add a contractor to a project in one of two ways:
1. Select an existing contractor (name + role auto-filled from the selected person).
2. Open the reusable Quick Add person modal (already exists) to create a new
   contractor on the spot, then select it automatically.

## Required Implementation Steps
1. In `frontend/pages/project.html`, extend the contractor modal form:
   - Add a select field "Choose existing contractor" with an empty default option
     ("— Choose contractor —").
   - Keep the manual Name input (used when no existing person is selected).
   - Add a "+" button beside the select that opens `openQuickAddPerson` pre-set to the
     `contractor` type.
2. In `frontend/assets/js/pages/project.js`:
   - Add `fillContractorSelect()` that populates the select from `peopleWithRole("contractor")`
     (existing contractors collection + any person holding a contractor role).
   - On selecting an existing contractor: auto-fill the Name input and the Role select
     from the person's data; skip the `addContractorToProject` free-text path.
   - On quick-add "onCreated": refresh the select, auto-select the new person, auto-fill
     name/role, and toast success (mirror the existing supplier quick-add pattern).
   - In `submitContractor`, if an existing person was chosen, use that person's `id` so
     `addContractorToProject` links the project row to the real contractor record.
3. Update `frontend/assets/js/modules/actions.js` → `addContractorToProject` to accept an
   optional `contractorId`; when provided, attach `contractorId` to the project's
   contractor row and update that contractor's `total`/`paid` instead of matching by name.
4. Add i18n keys (en/ar):
   - `project.formConChoose` / "Choose existing contractor" / "اختر مقاولاً موجوداً"
   - `project.formConChooseNone` / "—" / "—"
5. Add responsive CSS for the new select + button row in `frontend/assets/css/pages/project.css`.

## Expected Files to Modify
- `frontend/pages/project.html`
- `frontend/assets/js/pages/project.js`
- `frontend/assets/js/modules/actions.js`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`
- `frontend/assets/css/pages/project.css`

## Completion Criteria
- The contractor modal offers "choose existing" OR "add new person".
- Selecting an existing contractor auto-fills name + role and links to that contractor's
  record (their total/paid update on the contractors page).
- The quick-add "+" button creates a contractor and selects it immediately.
- English and Arabic labels work.
- Existing contractors / seed data still balance correctly on the Contractors page.
