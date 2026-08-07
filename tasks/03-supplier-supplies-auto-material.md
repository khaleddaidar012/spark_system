# Task 3 — Supplier Supplies & Auto-Select Material

## Task Description
The owner wants, when adding a supplier, to also record **what the supplier supplies**
(material names). Then, whenever the user records money or a material transaction and
picks that supplier's name, the **material field is auto-selected** automatically.

Owner's words:
- "لما بضيف مورد بضيف هو بيورد ايه"
- "عشان وان بضيضف فلوس او مرواد ولما اختار اسمة اوتوماتيك يتم اختيار الخامة علطول"

## Goal
- Add a `supplies` array (list of material names) to every supplier record.
- Let the user fill `supplies` when adding a supplier (main form + quick add).
- When a supplier is chosen in a material form (project detail form **and** Quick
  Materials flow), auto-fill the Material name field with the first/only supplied item.

## Required Implementation Steps
1. `frontend/assets/js/modules/store.js`:
   - Add `supplies: ["رمل", "زلط", ...]` to the seed supplier records so the field exists
     in the data model.
2. `frontend/pages/suppliers.html`:
   - Add a "Supplies" field to the add-supplier modal — a text input for comma-separated
     material names (or a repeatable chip input if simple enough).
3. `frontend/assets/js/pages/suppliers.js`:
   - Read the supplies input on submit and store it as an array of trimmed names.
4. `frontend/assets/js/modules/quick-add-person.js`:
   - For `currentType === "supplier"`, add a "Supplies" text field to the extra fields;
     store as `supplies` array.
5. Auto-select material in the two material flows:
   - `frontend/assets/js/pages/project.js` (`fillMaterialSuppliers` + a change listener on
     `#matSupplier`): when a supplier with `supplies` is chosen, set `#matName.value` to the
     first supplied material name.
   - `frontend/assets/js/modules/quick-add.js` (`fillSupplierSelect` + change listener on
     `#qmSupplier`): same auto-fill for `#qmName`.
   - Also auto-fill in `addMaterialToProject` (in `actions.js`) when `supplierId` points to
     a supplier whose `supplies` contains exactly one material and no name was typed —
     optional, but keep the UI-level auto-fill as the primary behavior.
6. Add i18n keys (en/ar):
   - `suppliers.formSupplies` / "Supplies" / "بيورد إيه"
   - `suppliers.formSuppliesPh` / "e.g. Sand, Cement" / "مثال: رمل، أسمنت"
   - `quickAdd.supplies` / "Supplies" / "الخامات الموردة"
7. Add small CSS for the supplies input in `frontend/assets/css/pages/project.css`
   (field-with-action reuse) or the suppliers page styles.

## Expected Files to Modify
- `frontend/assets/js/modules/store.js`
- `frontend/pages/suppliers.html`
- `frontend/assets/js/pages/suppliers.js`
- `frontend/assets/js/modules/quick-add-person.js`
- `frontend/assets/js/pages/project.js`
- `frontend/assets/js/modules/quick-add.js`
- `frontend/assets/js/modules/actions.js`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`

## Completion Criteria
- Adding/editing a supplier captures the list of materials they supply.
- Choosing a supplier in the project material form or Quick Materials flow auto-fills the
  Material name field.
- Existing suppliers without `supplies` do not crash (auto-fill simply does nothing).
- English and Arabic labels work.
