# Task 19 — Suppliers & Contractors: "باقي علينا / باقي لينا" instead of "المتبقي"

Requirement from `all_plan.md` ("التاسك التاني"):

> لما بضيف فلوس رايحة للناس اكتر من الإجمالي بيحصل مشكلة السالب دي …
> في صفحات الموردين والمقاولين حط خانة "باقي علينا" و "باقي لينا" بدل
> "المتبقي" وهندلها عشان تكون احترافية

## Problem

When money paid to a supplier / contractor exceeds purchases / total, the naive
balance goes negative. The previous task clamped it, but the UI still shows a single
"المتبقي / Remaining" label regardless of direction. This reads poorly and hides
which side owes the money.

## Fix

Show a **directional balance** on the suppliers and contractors pages:

- `باقي علينا` (Due to them, warning color) whenever we still owe them
  (`purchases - paid > 0` for a supplier, `total - paid > 0` for a contractor).
- `باقي لينا` (Due to us, success/paid color) whenever they owe us
  (`paid > purchases` / `paid > total`), i.e. overpayment.

Internally keep the old clamped `remaining` field for any other consumers, but add
`dueToThem` and `dueToUs` values to the balance objects plus a small `balanceDirection`
helper so each page renders one professional label instead of a sign-less number.

## Files touched

- `frontend/assets/js/modules/calc.js` — `supplierBalance`, `contractorBalance` gain
  `dueToThem` / `dueToUs`; add `balanceDirection(b)`.
- `frontend/assets/js/pages/suppliers.js` — supplier row + account summary.
- `frontend/assets/js/pages/contractors.js` — contractor row + projects modal summary.
- `frontend/data/i18n/ar.json` + `frontend/data/i18n/en.json` — `balance.owedByUs`
  ("باقي علينا" / "Due to them") and `balance.owedToUs` ("باقي لينا" / "Due to us").

## Acceptance criteria

- Suppliers page: supplier still unpaid → shows بقى علينا (total - paid); overpaid →
  shows باقي لينا (paid - total).
- Contractors page behaves the same with total vs paid.
- Works in AR and EN, values never show a minus sign.