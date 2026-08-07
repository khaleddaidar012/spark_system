# Task 6 — Contractors: Settle Account + View Projects & Materials

## Task Description
The owner wants two buttons on the Contractors page:
1. A button to **settle the contractor's account** ("اع دل حساب المقاول") — record a
   payment against the contractor's total.
2. A button to **see the projects the contractor works on and the materials they
   consumed for each project with the cost**.

Owner's words:
- "زرار اقدر اع دل حساب المقاول"
- "زرار اشوف المشاريع ال شغال عليها والخامات ال استهلكتها لكل مشروع بالتكلفه"

## Goal
- Add a "Settle / Record payment" action per contractor that records an outgoing money
  transaction and increases the contractor's paid amount.
- Add a per-contractor detail view showing:
  - The projects they work on (from project.contractors rows and material entries).
  - For each project, the contractor's total/paid/remaining and the materials consumed
    with quantity and cost.

## Required Implementation Steps
1. `frontend/assets/js/modules/calc.js`:
   - Add `contractorProjects(contractorId)` returning projects where the contractor appears
     in `project.contractors` OR where a material entry has `contractorId` === id.
   - Add `contractorMaterials(project, contractorId)` returning that project's materials
     assigned to the contractor.
2. `frontend/pages/contractors.html`:
   - Add a "Settle" button and a "Projects" button per contractor row (rendered in JS).
   - Add a "Settle payment" modal (amount + note) and a "Contractor projects" modal/section.
3. `frontend/assets/js/pages/contractors.js`:
   - Settle flow: call `recordMoney({ direction: "out", personType: "contractor", ... })`
     and refresh the list.
   - Projects flow: render each project with area, contractor cost (total/paid/remaining),
     and the assigned materials (name, quantity, unit, total cost) for that contractor.
4. `frontend/assets/js/modules/actions.js`:
   - Ensure `recordMoney` already updates the contractor's `paid` (it does) — verify no
     change needed, otherwise fix.
5. Add i18n keys (en/ar):
   - `contractors.settleAccount` / "Settle Account" / "اعمال حساب المقاول"
   - `contractors.settleModalTitle` / "Settle Account" / "تسوية حساب"
   - `contractors.viewProjects` / "Projects" / "المشاريع"
   - `contractors.projectsTitle` / "Contractor Projects" / "مشاريع المقاول"
   - `contractors.materialsConsumed` / "Consumed Materials" / "الخامات المستهلكة"
   - `contractors.noProjects` / "No projects yet." / "لا توجد مشاريع بعد."
   - `contractors.settleAmount` / "Amount" / "المبلغ"
6. CSS: styles for the settle/projects modals in `frontend/assets/css/pages/project.css`.

## Expected Files to Modify
- `frontend/assets/js/modules/calc.js`
- `frontend/pages/contractors.html`
- `frontend/assets/js/pages/contractors.js`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`
- `frontend/assets/css/pages/project.css`

## Completion Criteria
- Each contractor row has "Settle Account" and "Projects" buttons.
- Settling records a money transaction and updates the contractor's paid amount + the
  finance page.
- The Projects view lists every project the contractor is involved in, with per-project
  contractor cost and consumed materials (name, qty, unit, total).
- English and Arabic labels work.
