# Task 8 — Reports Page

## Task Description
The owner wants a functional Reports page showing:
1. **Number of projects** (total).
2. **Completed projects** (count of projects with status `done`).
3. **How much we took from each supplier** (sum of purchases per supplier).
4. **Our profit from each project** (income − project cost).
5. **Contractors and the number of projects each one worked on with us.**

Owner's words:
- "عدد المشاريع"
- "المشاريع الكاملة"
- "كل مورد اخدنا منه قد ايه"
- "ارباحنا من كل مشروع"
- "المقاوليين وعدد المشاريع ال اشتغل معايا فيها كل مقاول"

## Goal
Replace the placeholder Reports page with a real statistics page that computes and shows
these five groups from the stored data, fully responsive and i18n-ready.

## Required Implementation Steps
1. `frontend/assets/js/modules/calc.js`:
   - `projectProfit(project)`: total incoming money tied to the project (`moneyTransactions`
     with `direction === "in"` and `projectId` matching) minus `projectCost(project)`.
   - `supplierPurchases()`: for each supplier, total purchases (from supplier record +
     material transactions, or reuse existing `supplierBalance`).
   - `contractorProjectCounts()`: count distinct projects per contractor (contractor id in
     `project.contractors` OR material entries `contractorId`).
2. `frontend/pages/reports.html`:
   - Replace the placeholder with sections:
     - Stat cards: Total Projects, Completed Projects.
     - "Amount taken from each supplier" table/list.
     - "Profit per project" table/list.
     - "Contractors & project count" table/list.
3. `frontend/assets/js/pages/reports.js`:
   - Render all five groups; reuse `formatMoney`; empty states when no data.
4. Create `frontend/assets/css/pages/reports.css` for the report tables/cards and register
   it in `main.css`.
5. Add i18n keys (en/ar):
   - `reports.totalProjects` / "Total Projects" / "عدد المشاريع"
   - `reports.completedProjects` / "Completed Projects" / "المشاريع الكاملة"
   - `reports.supplierTotals` / "Amount Taken from Each Supplier" / "كل مورد اخدنا منه قد إيه"
   - `reports.profitPerProject` / "Profit per Project" / "الأرباح من كل مشروع"
   - `reports.contractorProjects` / "Contractors & Project Count" / "المقاولون وعدد المشاريع"
   - `reports.projectCount` / "Projects" / "عدد المشاريع"
   - `reports.profit` / "Profit" / "الربح"
   - `reports.total` / "Total" / "الإجمالي"

## Expected Files to Modify
- `frontend/assets/js/modules/calc.js`
- `frontend/pages/reports.html`
- `frontend/assets/js/pages/reports.js`
- `frontend/assets/css/pages/reports.css` (new) + register in `main.css`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`

## Completion Criteria
- Reports page shows all five requested groups computed live from the store.
- Totals update automatically when data changes (rendered on load).
- Empty states handled cleanly.
- English and Arabic labels work; page is responsive on mobile.
