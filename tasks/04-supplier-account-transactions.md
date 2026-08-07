# Task 4 — Suppliers: Edit Data + Account & Transaction Log

## Task Description
The owner wants the Suppliers page to allow:
1. Pressing an **"Edit supplier data"** button to edit a supplier's info.
2. Clicking on any supplier to view their **account** (purchases / paid / remaining) and
   their **transaction log**, where **every transaction shows which project it went to**
   — this is required.

Owner's words:
- "صفحة المورديين بقدر اضغط علي زرار اعدل بيانات المورد"
- "بضغط علي كل مورد بشوف الحساب و سجل المعاملات وكل معاامله مكتوبة راحة في مشروع ايه ضروري دي"

## Goal
- Add an edit action for each supplier (name, phone, notes, supplies).
- Add a supplier detail view (page or large modal) that shows the supplier's balance and
  the full history of their transactions, each transaction labelled with the project it
  belongs to.

## Required Implementation Steps
1. `frontend/assets/js/modules/calc.js`:
   - Add `supplierTransactions(supplierId)` that returns all `moneyTransactions` and
     `materialTransactions` involving that supplier.
   - Add `supplierProjectName(txn)` helper that resolves a transaction's `projectId` to the
     project name (projects collection) — returns "—" when none.
2. `frontend/pages/suppliers.html`:
   - Add an "Edit" button and a "View account" button per supplier row (rendered in JS).
   - Reuse the existing `supplierModal` for editing (add an edit mode) — rename to
     "Edit Supplier" when editing.
   - Add a new supplier-detail modal/section that renders account summary + transactions.
3. `frontend/assets/js/pages/suppliers.js`:
   - Edit flow: fill the form with the selected supplier, save back to the same `id`.
   - Detail flow: render account (purchases / paid / remaining) plus a list of
     transactions; each row shows date, direction, amount, and the project name it was for.
   - Material transactions: show material name, quantity, unit, total.
4. Add i18n keys (en/ar):
   - `suppliers.editSupplier` / "Edit Supplier" / "تعديل بيانات المورد"
   - `suppliers.viewAccount` / "Account" / "الحساب"
   - `suppliers.modalEditTitle` / "Edit Supplier" / "تعديل مورد"
   - `suppliers.accountTitle` / "Account & Transactions" / "الحساب وسجل المعاملات"
   - `suppliers.transactions` / "Transactions" / "المعاملات"
   - `suppliers.project` / "Project" / "المشروع"
   - `suppliers.material` / "Material" / "الخامة"
   - `suppliers.noTransactions` / "No transactions yet." / "لا توجد معاملات بعد."
5. Add CSS for the supplier detail modal in `frontend/assets/css/pages/project.css`
   (reuse `.rows-list`, `.row-item`, `.row-stat`) or a small suppliers page stylesheet.

## Expected Files to Modify
- `frontend/assets/js/modules/calc.js`
- `frontend/pages/suppliers.html`
- `frontend/assets/js/pages/suppliers.js`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`
- `frontend/assets/css/pages/project.css` (or new suppliers stylesheet)

## Completion Criteria
- Each supplier row has Edit and Account buttons.
- Editing a supplier updates the record in place (no duplicate supplier created).
- The account view shows purchases / paid / remaining and every transaction with the
  project it belongs to (project name visible).
- No-transaction suppliers show a clean empty message.
- English and Arabic labels work.
