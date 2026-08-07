# Task 7 — Project Statement of Account (كشف حساب) + A4 PDF

## Task Description
Very important. In the Projects page, every project needs a **"Statement of Account"
(كشف حساب)** button. Pressing it opens a dedicated page titled
**"كشف حساب شركة سبارك للأعمال الهندسية"** ("Spark Engineering Co. — Statement of
Account"). The statement shows:

- The project's area (how many meters).
- The cost of each material.
- The contractor cost.
- The company's percentage — in a professional layout.
- Below, the owner can type additional line items (e.g. "محارة جمبها 15 الف بعدها 10
  خامات و 5 مصنعية" = item like "Plastering" beside it 15,000, split into 10 materials +
  5 labor) and his own percentage.
- A **Print / Export as PDF** button that outputs a print-ready **A4** statement.

Owner's words:
- "مهم جدا في صفحة المشاريع في كل مشروع زرار اسمه كشف حساب"
- "المشروع كام متر، اتكلف بكام كل خامة، تكلفه المقاول، النسبة بتاعت الشركة بطريقه احترافيه"
- "هيفتح له صفحة اسمه كشف حساب شركة spark للاعمال الهندسية"
- "تحت هيكتب محارة مثلا جمبها 15 الف بعدها 10 خامات و 5 مصنعية ... وتحت هيكتب نسبتو"
- "يقدر يعمل طبعاه ك pdf من جوا هنا، كشف الحساب بيطلع ك pdf جاهز للطباعه بحجم a4"

## Goal
- New page `statement.html?id=<projectId>` rendering a professional, print-ready A4
  statement for a project.
- Button "كشف حساب" on each project (projects list page) linking to it.
- The statement auto-calculates: area, per-material cost, material total, contractor
  total, grand total, company percentage.
- The owner can add manual note items (name + amount, optional material/labor split) and
  an optional company-percentage entry that are persisted per project.
- Native browser print with A4 styling (no external PDF library needed — `window.print()`
  with `@page` A4 rules).

## Required Implementation Steps
1. `frontend/pages/projects.html`:
   - Add a "Statement" button to each project card → `./statement.html?id=<id>`.
2. Create `frontend/pages/statement.html`:
   - Print header: company name "Spark Engineering Co. — كشف حساب شركة سبارك للأعمال
     الهندسية", project name, area, date.
   - Sections: Project info; Material costs (table per material: name, qty, unit, unit
     price, total); Contractor costs (table per contractor: name, role, total, paid,
     remaining); Summary (material total, contractor total, grand total, company %);
     Owner notes list; percentage line.
   - Buttons: "Add Note" (opens small inline editor) and "Print / PDF".
   - Loads `store.js` data via a new `statement.js` script (like other pages, but NOT using
     the app layout — a clean print document).
3. Create `frontend/assets/js/pages/statement.js`:
   - Read `id` from URL, load project, render all tables using `calc.js` helpers.
   - Owner notes: stored on the project as `statementNotes: [{ id, label, amount, materials, labor }]`
     and `statementCompanyPercent`. Save via `store.save`.
   - Add-note form (label, amount, optional materials/labor split) persisted to the project.
   - Print button calls `window.print()`.
4. `frontend/assets/css/pages/statement.css` (or a `<style>` block):
   - A4 sizing: `@page { size: A4; margin: 12mm; }`, `.statement-sheet { width: 210mm; }`
   - Print-only rules: hide buttons/actions via `@media print`.
5. `frontend/assets/js/modules/calc.js`:
   - Add `statementData(project)` returning all precomputed values used by the statement.
6. i18n: this page is mostly Arabic-first; still add en/ar keys for headers so the print
   header matches the current language (`statement.title`, `statement.area`,
   `statement.materials`, `statement.contractors`, `statement.total`, `statement.companyPercent`,
   `statement.addNote`, `statement.print`).

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
- The statement shows area, every material with its cost, contractor costs, totals and a
  company-percentage line in a professional layout.
- The owner can add note items and a percentage; they persist and appear on the statement.
- Print/PDF produces an A4-ready document (buttons hidden while printing).
- English and Arabic headers work.
