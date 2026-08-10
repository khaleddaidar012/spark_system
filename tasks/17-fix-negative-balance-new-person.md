# Task 17 — Fix negative balances when adding money to a new contractor/supplier

## Task Description (all_plan.md "السيناريو دا فيه بج")
When the owner adds a **new contractor** in the Contractors page and does **not**
give him any money initially, then records a **quick money** payment, the payment
is stored as a negative number in the **Paid** field and the **Remaining** shows
the same (wrong) number.

Expected behavior (owner's example): if he adds **10,000** it must show
**Paid = 10,000** and **Remaining = 0** until materials are ordered for this
contractor. The same must apply to adding a supplier on the Suppliers page.

Any balance shown to the user must never be negative (the owner is bothered by
the minus numbers). A company/contractor should never display "negative paid" or
"negative remaining" — if money paid exceeds the total, remaining is 0.

## Root cause
`frontend/assets/js/modules/actions.js` `recordMoney()` blindly does
`person.paid = num(person.paid) ± value`, so a person with `total = 0` ends up
with a negative/contradictory figure, and
`frontend/assets/js/modules/calc.js` `contractorBalance()` / `supplierBalance()`
return `remaining = total - paid` which can be negative.

## Required Implementation Steps
1. `frontend/assets/js/modules/calc.js`
   - `contractorBalance()` — clamp `remaining` to `Math.max(0, total - paid)` so
     it never displays a negative number.
   - `supplierBalance()` — clamp `remaining` to `Math.max(0, purchases - paid)`.
   - Keep `paid` as the raw stored value (always `>= 0` after fix #2).
2. `frontend/assets/js/modules/actions.js`
   - `recordMoney()` — never let `paid` go below 0:
     - supplier/contractor (out adds, in deducts) → `paid = Math.max(0, ...)`;
     - client (in adds, out deducts) → `paid = Math.max(0, ...)`.
   - This guarantees a new contractor/supplier with no total and a fresh payment
     shows correctly.

## Expected Files to Modify
- `frontend/assets/js/modules/calc.js`
- `frontend/assets/js/modules/actions.js`

## Completion Criteria
- Adding a new contractor with no money, then quick-add 10,000 → Paid = 10,000,
  Remaining = 0 (no minus sign anywhere).
- Same flow on the Suppliers page → Paid = 10,000, Remaining = 0.
- No negative numbers appear in any balance shown to the user.
- Verified in browser in English and Arabic.