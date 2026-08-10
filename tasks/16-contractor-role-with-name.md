# Task 16 — Show Contractor as "Role (Name)" everywhere

## Task Description (all_plan.md "جديد المطلوب — تاسك 1")
The owner wants every contractor to be shown as **"role (name)"** — e.g. **"مقاول
السباكة (خالد هشام)"** / "Plumbing Contractor (Khaled Hesham)" — in four places:

1. **Project detail page → Contractors** section — next to e.g. "مقاول السباكة"
   the contractor's name is written between parentheses.
2. **Add contractor to project** modal — the "choose existing contractor" list and
   the material's "assigned contractor" list show the same "role (name)" format.
3. **Contractors page** — the contractor's name appears next to the profession.
4. **Quick Add Money** — the contractor dropdown options show the same format.

Currently the role and the name are shown separately (title = name, sub = role), so
the owner cannot tell at a glance which contractor does which profession.

## Required Implementation Steps
1. `frontend/assets/js/modules/person-roles.js`
   - Add a shared helper `contractorLabel(role, name, lang)`:
     - ar: `مقاول {roleAr} ({name})` — e.g. `مقاول سباكة (خالد هشام)`
     - en: `{roleEn} Contractor ({name})` — e.g. `Plumbing Contractor (Khaled Hesham)`
     - Uses `CONTRACTOR_SPECIALTIES` to resolve the role label; falls back to
       the "other" specialty when the role is unknown.
2. `frontend/assets/js/pages/project.js`
   - `renderContractors()` — in the contractors list, keep the name as the row title
     and set the subtitle to `contractorLabel(c.role, c.name, lang())`.
   - `fillContractorSelect()` and `fillMaterialContractors()` — the option label for
     each contractor becomes `contractorLabel(role, name, lang())` instead of the
     plain "name — roles".
3. `frontend/assets/js/pages/contractors.js`
   - `renderContractors()` — the subtitle becomes
     `contractorLabel(c.role, c.name, lang()) + phone part` so the name sits next to
     the profession.
4. `frontend/assets/js/modules/quick-add.js`
   - `fillPersonSelect()` — when the type is "contractor", each option label uses
     `contractorLabel(role, name, lang())` so the Quick Money dropdown shows the same
     "role (name)" text.
   - `fillContractorSelect()` — same format for Quick Materials.

## Expected Files to Modify
- `frontend/assets/js/modules/person-roles.js`
- `frontend/assets/js/pages/project.js`
- `frontend/assets/js/pages/contractors.js`
- `frontend/assets/js/modules/quick-add.js`

## Completion Criteria
- On the project detail page, each contractor row shows the profession with the name
  in parentheses, e.g. "مقاول سباكة (خالد هشام)".
- The "choose existing contractor" and material "assigned contractor" dropdowns show
  "role (name)".
- On the contractors page, the name appears next to the profession.
- Quick Money and Quick Materials contractor dropdowns show "role (name)".
- Verified in browser in both English and Arabic.