# Task Overview

## Project Goal
Implement new fast transaction features (financial and material) and money division functionality, ensuring all actions correctly reflect across the relevant projects, general accounts, and specific entity accounts (Suppliers, Contractors, Clients).

## Requirements Coverage

| Requirement | Description | Task |
|---|---|---|
| REQ-001 | Fast Add Outgoing Money (reflects in project and entity accounts) | Task 01 |
| REQ-002 | Fast Add Incoming Money (reflects in project and entity accounts) | Task 01 |
| REQ-003 | Add Materials Outgoing/Incoming (reflects in project, accounts, and entity page) | Task 02 |
| REQ-004 | Money Division (reflects in project, accounts, and entity page) | Task 03 |

## Execution Order

- [ ] Task 01 — Fast Financial Transactions
- [ ] Task 02 — Material Transactions
- [ ] Task 03 — Money Division

## Dependencies

Task 01
↓
Task 02
↓
Task 03

Tasks could theoretically be executed independently, but implementing financial transactions first (Task 01) establishes the pattern for UI additions and repository updates that can be replicated or extended for material transactions (Task 02) and money division (Task 03).

## Recommended Implementation Sequence
1. **Task 01**: Focuses on core financial operations (incoming/outgoing). Establishing the logic to update multiple repositories (Project, Finance, Person) simultaneously is critical.
2. **Task 02**: Applies similar multi-repository update logic to inventory/materials, ensuring stocks and project balances align.
3. **Task 03**: Implements money division, which likely relies on the transaction structures solidified in Task 01.

## Global Acceptance Criteria
- All new financial and material transactions successfully persist in the local database (IndexedDB via repositories).
- A transaction added in a project context accurately updates the project balance/history.
- A transaction added for a specific entity (Supplier, Contractor, Client) accurately reflects in their respective account statement and balances.
- General finance/account pages show the aggregated effects of these transactions.
- Existing features, calculations, and data remain unbroken.

## Final Testing
- [ ] Verify every requirement from `needs.md`.
- [ ] Verify requirement traceability.
- [ ] Verify data integrity across Project, Finance, Person, and Stock repositories.
- [ ] Verify UI/UX for new input forms.
- [ ] Verify responsive behavior on mobile and desktop.
- [ ] Verify existing functionality (regression testing).
