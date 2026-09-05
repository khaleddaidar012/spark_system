Status: COMPLETED

- [x] Task created
- [x] Implementation started
- [x] Implementation completed
- [x] Testing completed
- [x] Acceptance criteria verified
- [x] Task completed

# Task 02 — Material Transactions

## Overview
Implement the ability to record Incoming and Outgoing materials (خامات). These material transactions must accurately reflect on the associated Project, the general Accounts, and the specific Supplier or Contractor page.

## Requirements
- REQ-003: Add materials (outgoing and incoming) and ensure its financial/inventory impact reflects in the project, general accounts, and the supplier/contractor page (if assigned).

## Current Implementation

### Existing
- `StockRepository.js` likely handles inventory/materials.
- `ProjectRepository.js` and `PersonRepository.js` exist for entity balances.
- HTML pages for suppliers, contractors, and projects.

### Reusable
- Existing inventory update mechanisms in `StockRepository.js`.
- Entity association logic established in Task 01.

### Required Changes
- UI forms for material logging (incoming/outgoing) with fields for item, quantity, cost, Project, and associated Supplier/Contractor.
- Logic to deduct/add stock and concurrently update financial balances for the project and supplier/contractor.

### Missing
- Consolidated logic linking material movement directly to financial debits/credits across projects and entity accounts.

## Files / Modules Affected
- `frontend/pages/project.html`
- `frontend/pages/suppliers.html`
- `frontend/pages/contractors.html`
- `frontend/assets/js/repositories/StockRepository.js`
- `frontend/assets/js/repositories/FinanceRepository.js`
- `frontend/assets/js/repositories/ProjectRepository.js`
- `frontend/assets/js/repositories/PersonRepository.js`

## Data / Architecture Changes
- Ensure that recording a material transaction updates both the stock ledger (quantity) and the financial ledger (cost value affecting project and person balances).

## UI / UX Changes
- Add "Add Material (Incoming/Outgoing)" UI forms.
- Required inputs: Material type/name, Quantity, Unit Price, Total Cost, Project, Supplier/Contractor.
- Reflect material transactions in the history tables of the project and supplier/contractor pages.

## Implementation Plan
1. Add Material Transaction forms to the UI.
2. Extend `StockRepository.js` to handle the inventory logic.
3. Coordinate the `StockRepository` update with `FinanceRepository`, `ProjectRepository`, and `PersonRepository` updates to ensure financial balances reflect the material cost.
4. Connect UI events to this coordinated logic.

## Small Tasks
- [ ] Inspect `StockRepository.js` for existing material handling methods.
- [ ] Create a unified function to log material movement and trigger financial balance updates.
- [ ] Update `frontend/pages/project.html`, `suppliers.html`, and `contractors.html` with material entry UI.
- [ ] Add validation (quantity > 0, required entity associations).
- [ ] Wire the form submission to the unified logic.
- [ ] Update summary calculations on the respective pages to include material costs.
- [ ] Add loading and error states to the UI.
- [ ] Verify existing stock functionality for regressions.

## Edge Cases
- Outgoing materials exceeding available stock.
- Missing cost/price for materials.
- No supplier or contractor assigned (handle as general project cost if permitted, else reject).
- Zero quantity entered.

## Testing Checklist
- [ ] Normal flow (Incoming materials)
- [ ] Normal flow (Outgoing materials)
- [ ] Invalid input (Negative quantity/cost)
- [ ] Missing required fields
- [ ] Edge case: Outgoing exceeds stock
- [ ] Verification of inventory count updates
- [ ] Verification of financial balance updates on Project and Entity pages
- [ ] Mobile layout
- [ ] Desktop layout
- [ ] Related feature regression

## Acceptance Criteria
- Material transactions successfully update inventory counts.
- The financial value of the material transaction correctly impacts the associated project's balance.
- The financial value correctly impacts the associated supplier's or contractor's balance.
- Invalid data submissions are rejected with appropriate error messages.

## Dependencies
Depends on:
- Task 01 (Establishes the pattern for multi-repository updates)
