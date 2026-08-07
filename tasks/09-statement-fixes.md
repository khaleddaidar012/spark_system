# Task 09 — Statement of Account fixes

## Requirement (from all_plan.md lines 88–95)

The owner reported bugs in the Statement of Account page (statement.html):

1. **Supervision % not added to the grand total correctly** — the supervision amount was
   computed but never shown as its own line, so the owner could not verify the sum.
   Fix: display the computed supervision amount as an explicit summary row
   (materialTotal + workmanshipTotal + supervisionAmount = grandTotal).
2. **"خامات المشروع" meta row showed the project type (شقة)** — wrong; the header already
   says "خامات المشروع". Fix: remove the project-type meta item.
3. **Client-purchased materials** — clicking "تم الشراء بواسطة العميل" should hide or shade
   the row. Fix: shade the row (gray background + reduced opacity) and strike the cost.
4. **Add/remove materials directly in the statement page** — Fix: "Add Material" button that
   appends an editable row, and a Remove (trash) button per row. Name/qty/unit/unit-price
   are now editable inline; new rows are persisted with a real id on Save.
5. **Client-bought material: price disappears but workmanship still count** — Fix: for
   client-bought rows the material cost is excluded from totals, but the workmanship
   input stays editable and its value still counts in workmanshipTotal and grand total.

## Files changed

- `frontend/assets/js/modules/calc.js` — `statementData()`: workmanshipTotal now includes
  workmanship from client-bought materials (only material cost is excluded).
- `frontend/assets/js/pages/statement.js` — editable row template (name/qty/unit/unitPrice),
  add/remove handlers, client-bought shading class, supervision amount display, buildMaterials
  reconciliation (edit existing + create new + drop removed), meta without project type.
- `frontend/pages/statement.html` — "Add Material" button, Remove column, supervision amount
  summary row.
- `frontend/assets/css/pages/statement.css` — section-head layout, editable cell widths,
  client-bought shading + strikethrough (cost only), print rules for inputs/selects.
- `frontend/data/i18n/en.json`, `frontend/data/i18n/ar.json` — new keys:
  `supervisionAmount`, `addMaterial`, `remove`.

## Verification (Playwright, EN + AR)

- Supervision 10% → Supervision Amount 6,150, Grand Total 67,650 (visible line item).
- Meta shows only Project / Area / Date — no project-type row.
- Client-bought cement row: `is-client-bought` class, opacity 0.5 + gray bg, cost struck
  through; totals exclude its 11,000 cost.
- Workmanship 3,000 on the client-bought row still counted → workmanshipTotal 3,000,
  supervision recomputed on the inclusive base.
- Add Material appended a new editable row (بويات) and it persisted with a real id on Save;
  reload kept name/qty/unit/unitPrice/workmanship and shading.
- Remove button deleted the row and totals recomputed; persisted after Save.
- No console errors/warnings.
