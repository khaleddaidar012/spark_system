# Task 7 — Project Statement of Account (كشف حساب) + A4 PDF

## Task Description
Very important. In the Projects page, every project needs a **"Statement of Account"
(كشف حساب)** button. Pressing it opens a dedicated page titled
**"كشف حساب شركة سبارك للأعمال الهندسية"** ("Spark Engineering Co. — Statement of
Account").

### What the page shows (per owner's latest edit)
1. **Each material of the project with its cost** — when opening the page from a project,
   every material that belongs to the project is listed with its cost.
2. **Editable "contractor workmanship" per material** — next to each material the owner
   can write how much the contractor took for that material in this project.
   Example: "الرمل ب 50 الف وخالد المقاول اخد مصنعية 5 الاف" → Sand cost 50,000 and
   contractor (Khaled) took 5,000 workmanship.
3. **"Purchased by the client" option per material** — a toggle/checkbox for each material:
   "تم الشراء بواسطة العميل" — used when the client bought the material themselves, so it
   is not part of the company's cost.
4. **A real link between material and contractor on the page** — each material can be
   associated with a contractor, and the workmanship value is stored per material.
5. **Supervision percentage at the very bottom** — the company's percentage, labelled
   "نسبة الإشراف" (Supervision Percentage). The owner writes it at the bottom.
6. **Print / Export as PDF** — a button that outputs a print-ready **A4** statement
   (PDF-ready via browser print).

Owner's words (latest edit):
- "لما بفتح الصفحة دي من مشروع معين بيظهر قدامي كل خامة تبع المشروع وتكلفه الخامة"
- "وبكتب جمبها المقاول واخد كام في المشورع دا ... مثلا الرمل ب 50 الف وخالد المقاول اخد مصنعية 5 الاف"
- "وكمان فيه احتمال ان العميل هو ال اشتري الخامة فبختار تم الشراء بواسطه العميل"
- "وهكذا عاوز ربط بين الخامة والمقاول في الصفحة"
- "وتحت خالص بكتب نسبه الاشراف هي دي نسبة ال شركة اسمه نسبه الاشراف"

## Goal
A dedicated statement page that auto-lists the project's materials with their costs, lets
the owner attach a contractor + workmanship value to each material, mark materials as
"purchased by the client", enter the company's supervision percentage at the bottom, and
print the whole statement as an A4-ready PDF.

## Required Implementation Steps
1. `frontend/pages/projects.html`:
   - Add a "Statement" button to each project card → `./statement.html?id=<id>`.
2. Create `frontend/pages/statement.html`:
   - Print header: "كشف حساب شركة سبارك للأعمال الهندسية" / "Spark Engineering Co.
     Statement of Account", project name, area, date.
   - **Materials section**: one row per project material with columns: Material name,
     Quantity + unit, Cost, Contractor (select of contractors), Workmanship (editable
     amount), and a "Purchased by the client" checkbox.
   - **Summary section**: material total, contractors total (workmanship sums), grand
     total, and a **Supervision Percentage** field (company percentage) at the very bottom.
   - Buttons: "Save", "Print / PDF".
   - Loads `store.js` data via a new `statement.js` script (a clean print document, not
     the app layout).
3. Create `frontend/assets/js/pages/statement.js`:
   - Read `id` from URL, load project, render each material row using `calc.js` helpers.
   - Per-material fields, persisted on the project:
     `materials[].workmanship`, `materials[].contractorId`, `materials[].clientBought`
     (boolean). Save via `store.save` when the owner saves.
   - Contractor select per row populated from `peopleWithRole("contractor")`.
   - Supervision percentage persisted as `project.supervisionPercent`.
   - Print button calls `window.print()`.
4. `frontend/assets/js/modules/calc.js`:
   - Add `statementData(project)` returning all precomputed values: material rows (with
     workmanship + clientBought), material total, workmanship total, grand total.
   - Materials flagged `clientBought` are excluded from the material total (or shown but
     marked as client-purchased, not counted in company cost).
5. `frontend/assets/css/pages/statement.css` (new) + register in `main.css`:
   - A4 sizing: `@page { size: A4; margin: 12mm; }`, `.statement-sheet { width: 210mm; }`
   - Print-only rules: hide buttons/actions via `@media print`.
6. i18n keys (en/ar): `statement.title`, `statement.area`, `statement.materials`,
   `statement.contractor`, `statement.workmanship`, `statement.clientBought`,
   `statement.materialTotal`, `statement.workmanshipTotal`, `statement.grandTotal`,
   `statement.supervisionPercent`, `statement.save`, `statement.print`.

## Expected Files to Modify
- `frontend/pages/projects.html`
- `frontend/pages/statement.html` (new)
- `frontend/assets/js/pages/statement.js` (new)
- `frontend/assets/js/modules/calc.js`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`
- `frontend/assets/css/pages/statement.css` (new) + register in `main.css`

## Completion Criteria
- Every project card links to its statement page.
- The statement lists every project material with its cost.
- Next to each material the owner can set a contractor and a workmanship amount; the
  material is linked to that contractor.
- The "Purchased by the client" option works per material and is excluded from company
  cost.
- The Supervision Percentage field is at the very bottom and is persisted.
- Print/PDF produces an A4-ready document (buttons hidden while printing).
- English and Arabic headers work.
