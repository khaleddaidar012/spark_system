# Task 5 — Material Assigned to a Contractor

## Task Description
The owner wants, when adding a material to a project, a field to choose **which
contractor the material goes to** ("الخامة رايحة للمقاول مين"). This assignment must be
**visible in the Contractors page** (each contractor shows the materials consumed for each
project).

Owner's words:
- "عند اضافه خامة في خانة اختايرة رايحة للمقاول مين؟ وتسمع في صفحة المقاوليين"

## Goal
- Add an optional "Contractor" selector to the material forms (project detail form +
  Quick Materials incoming flow).
- Store `contractorId` / `contractorName` on each project material entry.
- Reflect the assignment on the Contractors page: each contractor shows the projects they
  worked on and the materials consumed per project with cost.

## Required Implementation Steps
1. `frontend/pages/project.html`:
   - Add a "Contractor" select field (empty default option) to the material modal,
     populated with contractors.
2. `frontend/assets/js/pages/project.js`:
   - Add `fillMaterialContractors()`; auto-fill from `peopleWithRole("contractor")`.
   - Pass `contractorId` from the form to `addMaterialToProject`.
   - Render the assigned contractor name in each material row (`materialsList`).
3. `frontend/components/quick-add.html` + `frontend/assets/js/modules/quick-add.js`:
   - Add a Contractor select to the Quick Materials form (visible for incoming only).
   - Pass `contractorId` to `addMaterialToProject`.
4. `frontend/assets/js/modules/actions.js` → `addMaterialToProject`:
   - Accept and store `contractorId` + `contractorName` on the material item.
   - Also store them on the `materialTransactions` record.
5. `frontend/assets/js/modules/store.js`:
   - Add `contractorId` / `contractorName` to seed material entries (optional but useful
     for testing).
6. Add i18n keys (en/ar):
   - `project.formMatContractor` / "Contractor" / "رايحة لمقاول"
   - `project.formMatContractorNone` / "No contractor" / "بدون مقاول"
   - `quick.contractor` already exists — reuse where possible.
7. CSS: small styling for the contractor select row (reuse `.form-row`).

## Expected Files to Modify
- `frontend/pages/project.html`
- `frontend/assets/js/pages/project.js`
- `frontend/components/quick-add.html`
- `frontend/assets/js/modules/quick-add.js`
- `frontend/assets/js/modules/actions.js`
- `frontend/assets/js/modules/store.js`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`

## Completion Criteria
- Material forms have a "Contractor" field; selecting one assigns the material.
- The project detail page shows the assigned contractor on each material row.
- The Contractors page (task 6) can show which materials each contractor consumed per
  project with cost.
- Materials without a contractor remain valid (field optional).
- English and Arabic labels work.
