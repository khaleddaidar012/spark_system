# Task 10 — Statement supervision as a value + formatting fixes

## Requirement (all_plan.md lines 99–103)

1. **Supervision is a fixed value, not a percentage** — "نسبة الاشراف مش بنسبة مئوية هي قيمة".
   If the owner types `1000`, then exactly `1000 EGP` is added to the grand total
   (not 1000% of the total).
2. **Fix the statement-of-account page formatting** — the materials table was ~1031px
   wide but the A4 sheet is only ~794px, so it overflowed the sheet horizontally.

## Changes

- `frontend/assets/js/modules/calc.js` — `statementData()`: supervision is now read as an
  absolute value (`supervisionAmount ?? supervisionPercent` for backward compatibility).
  `grandTotal = materialTotal + workmanshipTotal + supervisionAmount`.
- `frontend/assets/js/pages/statement.js` — apply/save/render the supervision value;
  on save the old `supervisionPercent` field is removed and `supervisionAmount` is stored.
- `frontend/pages/statement.html` — summary: single "Supervision Value" input row
  (removed the redundant computed "Supervision Amount" row and the `max="100"` percent
  constraint).
- `frontend/data/i18n/en.json` + `ar.json` — `supervisionValue` (قيمة الإشراف) replaces
  `supervisionPercent`/`supervisionAmount`; shortened `clientBought` header
  ("Client bought" / "اشترى العميل") so the checkbox column fits.
- `frontend/assets/css/pages/statement.css` — table reworked to `table-layout: fixed`
  with explicit column widths and compact inputs so it fits the A4 sheet width.

## Verification (Playwright, EN + AR)

- Entered 1000 as supervision → Grand Total = material total + workmanship + 1000
  (50,500 + 0 + 1,000 = 51,500).
- Supervision 1000 persisted after reload (`supervisionAmount`).
- Old `supervisionPercent: 10` data still renders (backward compatible), then migrated.
- Table now fits the sheet: 700px ≤ 703px content width (was 1031px → overflow).
- Arabic RTL renders correctly; new labels translate.
- No console errors.
