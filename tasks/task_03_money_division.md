Status: COMPLETED

- [x] Task created
- [x] Implementation started
- [x] Implementation completed
- [x] Testing completed
- [x] Acceptance criteria verified
- [x] Task completed

# Task 03 — Money Division

## Overview
Implement "Money Division" (تقسيم المال) logic. This functionality allows a financial amount to be split or distributed, ensuring the division accurately reflects on the Project, the general Accounts page, and the specific entity pages (Contractor, Supplier, or Client).

## Requirements
- REQ-004: Money division must reflect in the project, the accounts page, and the page of the specific contractor, supplier, or client.

## Current Implementation

### Existing
- Financial tracking mechanisms in `FinanceRepository.js`.
- Entity ledgers in `ProjectRepository.js` and `PersonRepository.js`.

### Reusable
- Multi-repository transaction update logic created in Task 01 and Task 02.
- UI display tables for transactions and balances.

### Required Changes
- UI for dividing/allocating a specific monetary amount across multiple entities or categories within a project.
- Business logic to validate the division (ensuring the sum of divisions equals the total amount if required) and to apply the partial amounts to the respective accounts.

### Missing
- Money Division UI component.
- Logic to process a single transaction as multiple split records against different accounts.

## Files / Modules Affected
- `frontend/pages/finance.html`
- `frontend/pages/project.html`
- `frontend/pages/suppliers.html`
- `frontend/pages/contractors.html`
- `frontend/assets/js/repositories/FinanceRepository.js`
- `frontend/assets/js/repositories/ProjectRepository.js`
- `frontend/assets/js/repositories/PersonRepository.js`

## Data / Architecture Changes
- The database logic must support saving a parent transaction and multiple child/split transactions, or issuing multiple independent transactions that map to the division criteria, updating balances atomically.

## UI / UX Changes
- Create a "Divide Money" form.
- The form should allow adding multiple rows/entries (Entity, Amount, Project) to represent the split.
- Display a running total to ensure the divided amounts align with expected totals (if applicable).

## Implementation Plan
1. Design and add the Money Division UI.
2. Write a business logic function in the repository/service layer to accept an array of split transactions.
3. Iterate through the splits, updating `FinanceRepository`, `ProjectRepository`, and `PersonRepository` for each portion.
4. Ensure atomicity (all splits succeed, or none do, relying on existing DB transaction capabilities if IndexedDB permits, or robust error handling).
5. Wire the UI to this logic.

## Small Tasks
- [ ] Inspect existing capabilities for bulk or sequential updates in repositories.
- [ ] Build the "Divide Money" UI form with dynamic rows for splits.
- [ ] Implement client-side validation to ensure valid amounts and required entity/project selections per row.
- [ ] Create the logic to process the array of divisions and update corresponding balances.
- [ ] Connect the UI to the division processing logic.
- [ ] Add loading, success, and error states to the UI.
- [ ] Update display tables/summaries on Project, Accounts, and Entity pages.
- [ ] Verify existing functionality for regressions.

## Edge Cases
- Division rows with zero or negative amounts.
- Incomplete rows (missing project or entity).
- Asynchronous save failures halfway through the division list.

## Testing Checklist
- [ ] Normal flow (Dividing money among 2+ entities)
- [ ] Invalid input (Negative amounts)
- [ ] Missing required fields on a split row
- [ ] Verification of balance updates on Project page
- [ ] Verification of balance updates on Accounts page
- [ ] Verification of balance updates on Supplier/Contractor/Client pages
- [ ] Mobile layout
- [ ] Desktop layout
- [ ] Related feature regression

## Acceptance Criteria
- A user can input multiple division records in a single operation.
- Each divided amount correctly updates the assigned project and entity balances.
- The Accounts page accurately reflects the total impact of the divided money.
- The system handles invalid or incomplete division data gracefully.

## Dependencies
Depends on:
- Task 01 (Leverages the standard financial update logic)
