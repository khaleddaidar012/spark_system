Status: COMPLETED

- [x] Task created
- [x] Implementation started
- [x] Implementation completed
- [x] Testing completed
- [x] Acceptance criteria verified
- [x] Task completed

# Task 01 — Fast Financial Transactions

## Overview
Implement "Fast Add" functionality for both Incoming and Outgoing money. This feature allows users to quickly record financial transactions that simultaneously update the selected Project's balance and the associated entity's account (Supplier, Contractor, or Client).

## Requirements
- REQ-001: Add fast outgoing money, ensuring it reflects in the project and the associated supplier/contractor/client account.
- REQ-002: Add fast incoming money, ensuring it reflects in the project and the associated supplier/contractor/client account.

## Current Implementation

### Existing
- IndexedDB repositories exist for handling data (`ProjectRepository.js`, `FinanceRepository.js`, `PersonRepository.js`).
- UI pages exist for Projects (`frontend/pages/project.html`), Finance (`frontend/pages/finance.html`), and Entities (`suppliers.html`, `contractors.html`).

### Reusable
- Existing database transaction wrappers and save methods in repositories.
- Existing UI modal or form patterns for data entry.

### Required Changes
- UI additions for the "Fast Add" forms (Outgoing and Incoming) on relevant pages.
- Business logic to ensure a single submission creates a transaction record and updates the balances in `ProjectRepository`, `FinanceRepository`, and `PersonRepository`.

### Missing
- Specific "Fast Add" UI components.
- Consolidated multi-repository update logic for this specific workflow.

## Files / Modules Affected
- `frontend/pages/project.html`
- `frontend/pages/finance.html`
- `frontend/pages/suppliers.html`
- `frontend/pages/contractors.html`
- `frontend/assets/js/repositories/FinanceRepository.js`
- `frontend/assets/js/repositories/ProjectRepository.js`
- `frontend/assets/js/repositories/PersonRepository.js`
- `frontend/assets/js/pages/project.js` (To Be Determined / Expected)
- `frontend/assets/js/pages/finance.js` (To Be Determined / Expected)

## Data / Architecture Changes
- No fundamental database schema changes required.
- Logic update: Ensure that inserting a new fast transaction wraps updates to `projects`, `finances`, and `persons` stores within a single atomic operation or sequence.

## UI / UX Changes
- Add "Fast Add Outgoing" and "Fast Add Incoming" buttons/forms.
- The forms must include fields to select the target Project and the target Entity (Supplier, Contractor, Client).
- Implement loading states during save and success/error notifications.
- Ensure forms are responsive for mobile and RTL compliant.

## Implementation Plan
1. Add the UI elements (buttons and modals/forms) to the relevant HTML pages.
2. Extend `FinanceRepository.js` (or a service layer if it exists) with a method to handle the fast transaction, orchestrating calls to update the finance ledger, the project balance, and the person's balance.
3. Wire the UI forms to the new logic in the page-specific JS files.
4. Add validation to ensure all required associations (Project + Entity) are provided.

## Small Tasks
- [ ] Inspect `FinanceRepository.js`, `ProjectRepository.js`, and `PersonRepository.js` for existing transaction methods.
- [ ] Create a unified function to handle adding a transaction and updating related balances.
- [ ] Update `frontend/pages/project.html` and `frontend/pages/finance.html` with Fast Add Incoming/Outgoing UI.
- [ ] Implement form validation (amount > 0, project selected, entity selected).
- [ ] Connect the UI form submission to the new unified repository function.
- [ ] Add loading and error states to the UI.
- [ ] Update summary calculations on the dashboard/finance pages to ensure they reflect the new data.
- [ ] Verify existing functionality for regressions.

## Edge Cases
- Submission with missing project or entity.
- Negative or zero amounts entered.
- Concurrent modifications (if multiple tabs are open).
- Inactive or deleted projects/entities selected.

## Testing Checklist
- [ ] Normal flow (Incoming money)
- [ ] Normal flow (Outgoing money)
- [ ] Invalid input (Zero/Negative amount)
- [ ] Missing required fields (No project/entity selected)
- [ ] Verification of balance updates in Project page
- [ ] Verification of balance updates in Supplier/Contractor/Client page
- [ ] Verification of transaction log in Finance page
- [ ] Mobile layout
- [ ] Desktop layout
- [ ] Related feature regression

## Acceptance Criteria
- A user can submit a "Fast Add Incoming/Outgoing" transaction.
- The transaction amount accurately modifies the selected project's balance.
- The transaction amount accurately modifies the selected entity's account balance.
- The operation is prevented if required fields are missing.
- Existing financial records and calculations remain compatible and unbroken.

## Dependencies
Depends on:
- None
