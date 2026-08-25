# Task: 01 - Database & Store Layer Extensions

Status: pending
Priority: high

## 1. Overview & Objectives

Extend the database schema and frontend client storage (`store.js`, `calc.js`, and backend data models) to accommodate phase-linked financial transactions, supplier/contractor deduction tracking, and project-level expected/actual profit attributes. Ensure full backward compatibility with existing project records and transactions.

---

## 2. Dependencies
- Requires: Existing `frontend/assets/js/modules/store.js` and `backend/models/`.
- Blocks: `02-phase-cost-tracking.md`, `03-statement-of-account-pdf.md`, `04-finance-inflow-kpi.md`, `05-projects-header-financials.md`.

---

## 3. Subtasks

- [ ] **Subtask 1.1: Extend Expense Schema with `phase_id` and `subphase_id` Attributes**
- [ ] **Subtask 1.2: Extend Project Schema with `expected_profit` and Dynamic Financial Metrics**
- [ ] **Subtask 1.3: Create Deductions Ledger Model (`deductions` Store)**
- [ ] **Subtask 1.4: Update Phase Schema to Support Accumulated Cost & History Snapshots**
- [ ] **Subtask 1.5: Implement Data Migration & Backward-Compatibility Normalizer**

---

## 4. Detailed Subtask Specifications

### Subtask 1.1 — Extend Expense Schema with `phase_id` and `subphase_id` Attributes

#### Objective
Ensure all expense entities recorded in the system can be explicitly tagged with a project phase and subphase ID.

#### Implementation Details
- **File Location**: `frontend/assets/js/modules/store.js` and `backend/models/Expense.js`.
- Add fields to `expense` object definition:
  - `phase_id`: `string` (UUID or catalog key, nullable).
  - `subphase_id`: `string` (nullable).
  - `phase_name`: `string` (human-readable snapshot in Arabic, e.g. `"شراء الأرض"` or `"الخرسانة المسلحة - حدادة"`).
- Update store insertion and update methods (`addExpense`, `updateExpense`) to validate and persist these fields.

#### Expected Result
Expenses created via Quick Add or project pages preserve their phase association.

---

### Subtask 1.2 — Extend Project Schema with `expected_profit` and Dynamic Financial Metrics

#### Objective
Store user-defined expected profit targets on project entities and support global profit aggregation.

#### Implementation Details
- **File Location**: `frontend/assets/js/modules/store.js` and `backend/models/Project.js`.
- Add fields to `project` schema:
  - `expected_profit`: `number` (default `0`).
  - `actual_profit`: `number` (calculated / cached).
  - `total_inflow`: `number` (sum of customer/project revenues).
  - `total_outflow`: `number` (sum of project expenses).
- Provide getters/setters in `store.js` to update `expected_profit` individually or globally.

#### Expected Result
Projects persist `expected_profit` and allow updating it without resetting other project properties.

---

### Subtask 1.3 — Create Deductions Ledger Model (`deductions` Store)

#### Objective
Create a structured data store to track deductions applied to contractors and suppliers during account settlement.

#### Implementation Details
- **File Location**: `frontend/assets/js/modules/store.js`.
- Define `deduction` schema:
  - `id`: `string` (unique ID).
  - `person_id`: `string` (contractor ID or supplier ID).
  - `person_type`: `'contractor'` | `'supplier'`.
  - `project_id`: `string` (nullable, if linked to specific project).
  - `amount`: `number` (positive float value).
  - `reason`: `string` (e.g., `"خصم تأخير توريد"` or `"خصم تلفيات حديد"`).
  - `date`: `string` (ISO date `YYYY-MM-DD`).
  - `created_at`: `string` (ISO timestamp).
- Add store methods: `addDeduction`, `getDeductionsByPerson(personId, personType, fromDate, toDate)`, `deleteDeduction`.

#### Expected Result
Deductions can be recorded, queried with date range filters, and factored into net balance calculations.

---

### Subtask 1.4 — Update Phase Schema to Support Accumulated Cost & History Snapshots

#### Objective
Ensure `project_phases` records store dynamic accumulated cost and support logging phase status history with associated costs.

#### Implementation Details
- **File Location**: `frontend/assets/js/modules/project-phases.js` and `frontend/assets/js/modules/store.js`.
- Phase entity structure:
  - `id`: `string`.
  - `name`: `string`.
  - `status`: `'pending'` | `'active'` | `'completed'`.
  - `spent_cost`: `number` (sum of all expenses currently tagged with this `phase_id`).
  - `history`: `Array<{ timestamp, status, total_spent, notes }>`.
- Add recalculation hook whenever an expense is added, edited, or removed.

#### Expected Result
Every phase object maintains an up-to-date `spent_cost` property reflecting all linked expenses.

---

### Subtask 1.5 — Implement Data Migration & Backward-Compatibility Normalizer

#### Objective
Prevent data loss or null-pointer crashes for existing projects and expenses stored in `localStorage` or SQLite database.

#### Implementation Details
- **File Location**: `frontend/assets/js/modules/store.js` (`migrateStore` or `initStore`).
- Migration logic:
  - Ensure all existing expenses without `phase_id` default to `phase_id: null`.
  - Ensure all existing projects without `expected_profit` default to `expected_profit: 0`.
  - Ensure `deductions` array exists in initial store state if missing.

#### Expected Result
Existing application data loads seamlessly without schema errors or initialization exceptions.

---

## 5. Edge Cases & Handling
- **Missing or Corrupted LocalStorage**: Initialize with default valid schema structures and log a non-fatal warning.
- **Negative Deduction Values**: Validate in store layer that deduction `amount` is strictly greater than 0.
- **Floating Point Currency Rounding**: Enforce 2 decimal places rounding on all store financial aggregations.

---

## 6. Regression Requirements
- Existing project listing, contractor creation, supplier invoicing, and expense reporting must continue to function without data loss.

---

## 7. Acceptance Criteria

- [ ] `expenses` schema contains `phase_id`, `subphase_id`, and `phase_name`.
- [ ] `projects` schema contains `expected_profit`.
- [ ] `deductions` store is created with full CRUD methods and person/date filters.
- [ ] Phase objects accurately store and recalculate `spent_cost`.
- [ ] Data migration handles legacy records without errors.
