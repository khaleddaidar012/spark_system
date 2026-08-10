# Task 18 — Quick-add supplier must appear in the suppliers page

Requirement from `all_plan.md` ("تاسك 3"):

> لما بعمل اضافه سريعه للمورد مش بتظهر في صفحة الموردين خالص
> ("when I do a quick add for a supplier it doesn't appear in the suppliers page at all")

## Problem

The **Quick Money** modal (`components/quick-add.html` → `#quickMoneyModal`) only lets the
user pick an existing supplier from a dropdown. There is no way to create a brand-new
supplier right there. The only person-type that accepts a free-typed name is "أخرى /
Other", and `recordMoney` never creates a person record for it — it only stores the name
on the money transaction. As a result a supplier added "quickly" never lands in the
`suppliers` collection and never shows in the suppliers page.

The other quick-add entry points (Quick Materials `qmAddSupplierBtn` and the project
page's `matAddSupplierBtn`) already create a real person via `openQuickAddPerson` and DO
show in the suppliers page.

## Fix

Give the Quick Money modal the same "quick add person" affordance the materials modal has:

1. In `frontend/components/quick-add.html`, wrap the person select in a
   `field-with-action` row and add a plus button (`#moneyAddPersonBtn`) next to
   `#moneyPersonSelect`. Hide both the select and the button when the active person
   type is "other" (which already uses the free-text name input).
2. In `frontend/assets/js/modules/quick-add.js`:
   - import `openQuickAddPerson` (and reuse `personTypeLabel` already imported);
   - in `fillPersonSelect`, toggle the button visibility alongside the select;
   - in `initQuickMoney`, wire `#moneyAddPersonBtn` → `openQuickAddPerson` seeded with
     the currently selected person type (supplier/contractor/client); on created,
     refill the select and auto-select the new person.
   - if the created person does not actually carry the expected role, show an info toast
     (same pattern as the materials modal's `notSupplierMessage`).
3. The new supplier is saved to the `suppliers` collection by `quick-add-person.js`
   (`COLLECTION_BY_TYPE`), so it will appear on `suppliers.html`.

## Acceptance criteria

- Open Quick Money → person type "مورد/Supplier" → click the + button → add a new
  supplier → the supplier appears both in the money person dropdown and on the
  suppliers page.
- The + button is hidden when "أخرى/Other" is selected (free-name path unchanged).
- Works in both AR and EN.

## Files touched

- `frontend/components/quick-add.html`
- `frontend/assets/js/modules/quick-add.js`