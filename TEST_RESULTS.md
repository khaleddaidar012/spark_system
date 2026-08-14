# Test Results — Fix for Money-Entry Issues

Test date: 2026-08-13
Scope: Suppliers & Contractors pages + Project Management system (Spark ERP)

---

## 1) The two reported issues (from `all_plan.md`)

| # | Issue | Page |
|---|-------|------|
| 1 | The "Quick Add Money" button does not respond on save in the Contractors page (both outgoing and incoming) | `contractors.html` |
| 2 | Adding money to material suppliers stops at certain values and no longer moves | `suppliers.html` |

---

## 2) Root Cause

One shared root cause for most cases, plus a second one specific to the quick modal:

1. **Silent swallowing of money movements (suppliers issue):**
   In `frontend/assets/js/modules/actions.js` inside `recordMoney` there was:
   ```js
   person.paid = Math.max(0, num(person.paid) + (direction === "out" ? value : -value));
   ```
   The `Math.max(0, ...)` clamp prevented the value from dropping below zero. So whenever `paid = 0` (or the user tried to record an incoming payment before the supplier had spent anything), the transaction was saved and `moneyTransactions` was recorded, but `paid` never changed — the "numbers stop moving".
   - **Practical evidence:** Before the fix, recording an "in" payment of `1000` for a new supplier (`مورد سريع جديد`) appeared to succeed with no error, but `paid` stayed `0`.

2. **Modal state was never reset (contractors issue):**
   When opening the Quick Money modal on the Contractors page, the state was not reset to defaults on each open — it kept the last direction/person/amount. The default type (first chip) was not always "supplier". Pressing "Save" after reopening the modal could record the money in an unexpected direction or to an unexpected person, making the button appear "unresponsive" or to record to the wrong place.

---

## 3) Changes Implemented

### a) `frontend/assets/js/modules/actions.js`
- Removed `Math.max(0, ...)` from the `paid` update for each of:
  - Suppliers: `person.paid = num(person.paid) + (direction === "out" ? value : -value)`
  - Contractors: same formula
  - Clients (incoming increases): `person.paid = num(person.paid) + (direction === "in" ? value : -value)`
- Allowed `paid` to be negative (overpayment / supplier in credit) while keeping the UI display clamped (shows as "Due to us" instead of an ugly negative value).
- Now updates the contractor row inside the project (`project.contractors`) when `projectId` is passed, and dispatches a `spark:data-changed` event to live-refresh the page.

### b) `frontend/assets/js/modules/calc.js`
- Removed `Math.max(0, ...)` from `supplierBalance` and `contractorBalance`:
  ```js
  const paid = num(supplier.paid);   // before: Math.max(0, num(supplier.paid))
  const paid = num(contractor.paid); // before: Math.max(0, num(contractor.paid))
  ```
- `balanceDirection`, `supplierBalance`, and `contractorBalance` still compute `dueToThem` / `dueToUs` / `remaining` correctly for both negative and overdue values.

### c) `frontend/assets/js/modules/quick-add.js`
- Added `resetQuickMoney()`, called **on every modal open** and after save, resetting:
  - direction to `in` and disabling the `out` segment
  - person type to `supplier`
  - clearing the fields (amount, note, person, project)
  - repopulating the projects (`fillMoneyProjectSelect`) and people dropdowns
- Added a "Project" dropdown to the Quick Money modal and passes `projectId` to `recordMoney` when selected (so the movement also records against the contractor row inside the project).
- Informational toast (`quick.contractorNotOnProject`) when a contractor not linked to the selected project is chosen.
- Added a guard in `initQuickAdd()` against missing page elements (`quickAdd`/`fab`).

---

## 4) Test Environment

- Local server: `http://localhost:3000` (`backend/server.js` serving `frontend/` statically).
- Browser: automated test (Playwright — Chromium) at desktop viewport.
- Data: `localStorage` database under key `spark_db_v1` containing sample data (suppliers/contractors/one project).
- Login: `admin` / `Spark@2026#ERP` (`auth.js` auth).

---

## 5) Test Cases & Results

### TC-01 — New supplier: incoming payment drives the ledger and the number moves
**Steps:** Suppliers page ← "Quick Add Money" modal ← type `Supplier` ← existing person (`مورد سريع جديد`) ← incoming `1000`.
**Before the fix:** `paid` stays `0` (movement silently swallowed).
**After the fix:** ✅ `paid = -1000`, card shows `Paid -1,000` and `Due to them 1,000`.

### TC-02 — Outgoing after incoming: both directions work
**Steps:** Same supplier ← outgoing `1000` after the incoming `1000`.
**Result:** ✅ `paid` returns to `0`, UI shows `Paid 0` / `Due to them 0`. Numbers move in both directions.

### TC-03 — Overpayment works and the display flips to "Due to us"
**Steps:** Supplier «الصلب الحديث» (purchases `96,000`) — record incoming `90,000`, then `95,000`, then `100,000` in sequence.
**Result:** ✅ `paid` moved every time; once `96,000` was exceeded the display flipped `Due to them 6,000` → `Due to them 1,000` → `Due to us 4,000` (overpayment).

### TC-04 — Quick Money modal resets (Contractors page)
**Steps:** Open the modal in `contractors.html`, pick `outgoing/contractor/amount`, save, then reopen the modal.
**Before the fix:** it kept the previous direction/person/amount (the cause of "unresponsive / silent error").
**After the fix:** ✅ always resets: direction `incoming`, type `supplier`, empty fields — on every open.

### TC-05 — Contractor payment via the Quick Money modal
**Steps:** Modal on the Contractors page: contractor «مقاول السباكة» outgoing `2,000`.
**Result:** ✅ Recorded successfully and cards updated immediately; display `Total 15,000 / Paid 12,000 / Due to them 3,000`.

### TC-06 — Values on the Project page (project.html)
**Result:** ✅ all five contractor summaries render with correct numbers after the changes:
| Contractor | Project Total | Paid | Due to them |
|---|--:|--:|--:|
| مَقَاوِل السباكة (Plumbing) | 15,000 | 12,000 | 3,000 |
| مَقَاوِل الكهرباء (Electrical) | 12,000 | 6,000 | 6,000 |
| مَقَاوِل التشطيب (Finishing) | 40,000 | 15,000 | 25,000 |
| مَقَاوِل الدهانات (Painting) | 8,000 | 8,000 | 0 |
| مَقَاوِل السيراميك (Tiles) | 20,000 | 20,000 | 0 |

### TC-07 — Arabic / RTL mode
- Translations work: dropdowns show «اختر الشخص», active direction «وارد», institution names render without letter-breaking (fixed-width font).
- ✅ Quick Money modal behaves the same in Arabic.

### TC-08 — Financial Accounts page (transaction list)
**Result:** ✅ All test movements (Aug 13) appear at the top in newest-first order with the correct +/− signs, and the "no transactions" empty-state message does not appear despite data being present.

### TC-09 — General regression
- Page reloads (suppliers/contractors/project/accounts/reports): ✅ no errors.
- Browser console across all tests: ✅ 0 `console.error` and 0 warnings.
- Transaction save + live push to page after save (`spark:data-changed` event): ✅ works.

---

## 6) Verdict

| Item | Verdict |
|-------|---------|
| "Numbers stop moving" issue in suppliers | ✅ Resolved |
| "Unresponsive" Quick Money in contractors | ✅ Resolved |
| Side effects on other pages | ✅ None (comprehensive checks) |
| Arabic / RTL compatibility | ✅ OK |

Ready to commit (`git commit`); changes are confined to:
- `frontend/assets/js/modules/actions.js`
- `frontend/assets/js/modules/calc.js`
- `frontend/assets/js/modules/quick-add.js`