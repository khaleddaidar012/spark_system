# Task: 02 - Phase-Linked Financial Ingestion & Cost Accumulation

Status: pending
Priority: high

## 1. Overview & Objectives

Implement comprehensive linking between all financial expense inputs and project phases. Whenever an expense is recorded (via the Quick Add modal, Project details expense form, or Finance page), it must be associated with the project's active or selected phase. The system will dynamically calculate the exact financial cost accumulated per phase and display live cost metrics inside the project's phase timeline and status history log (سجل حالات المشروع).

---

## 2. Dependencies
- Requires: `01-database-store.md`.
- Blocks: `05-projects-header-financials.md`, `07-testing-verification.md`.

---

## 3. Subtasks

- [ ] **Subtask 2.1: Integrate Phase & Subphase Selector into Quick Add Modal**
- [ ] **Subtask 2.2: Integrate Phase Selector into Project Details Expense Forms**
- [ ] **Subtask 2.3: Implement Dynamic Phase Cost Accumulation Engine (`calc.js`)**
- [ ] **Subtask 2.4: Render Live Phase Cost in Project Phase Timeline & History Log UI**
- [ ] **Subtask 2.5: Handle Expense Modifications, Deletions & Phase Reassignment**

---

## 4. Detailed Subtask Specifications

### Subtask 2.1 — Integrate Phase & Subphase Selector into Quick Add Modal

#### Objective
Enable users to tag expenses with a specific project phase and subphase directly from the global Quick Add modal.

#### Implementation Details
- **File Location**: `frontend/assets/js/modules/quick-add.js`.
- Logic:
  1. In the "Add Expense" tab of Quick Add modal, when a `project_id` is selected:
  2. Dynamically fetch and populate a `<select id="quickAddPhaseSelect">` with the project's defined phases (e.g. "شراء الأرض", "الرخصة", "الخرسانة المسلحة", etc.).
  3. If the selected phase has child subphases (e.g. "حدادة", "نجارة", "صيانة"), populate a secondary `<select id="quickAddSubphaseSelect">`.
  4. Auto-select the project's currently active phase as the default option.
  5. Include `phase_id` and `subphase_id` in the payload passed to `store.addExpense()`.

#### Expected Result
Expenses added via Quick Add are immediately attributed to the selected phase.

---

### Subtask 2.2 — Integrate Phase Selector into Project Details Expense Forms

#### Objective
Ensure internal expense and contractor/supplier payment forms inside `project.html` automatically default to and save the active phase.

#### Implementation Details
- **File Location**: `frontend/assets/js/pages/project.js`.
- Logic:
  1. Update project-level expense creation modal/form to include the Phase dropdown.
  2. Highlight the active phase badge adjacent to the expense entry field.
  3. Ensure batch additions or inline expense entries capture the phase ID.

#### Expected Result
All in-page project transactions maintain strict phase linkage.

---

### Subtask 2.3 — Implement Dynamic Phase Cost Accumulation Engine (`calc.js`)

#### Objective
Provide high-performance mathematical functions to calculate total and itemized costs per project phase and subphase.

#### Implementation Details
- **File Location**: `frontend/assets/js/modules/calc.js`.
- Methods to implement:
  - `calculatePhaseCost(projectId, phaseId)`: Sums all expenses where `project_id === projectId && phase_id === phaseId`.
  - `calculateSubphaseCost(projectId, phaseId, subphaseId)`: Sums subphase-specific expenses.
  - `getProjectPhaseCostsSummary(projectId)`: Returns a map of all phases with `{ phaseId, phaseName, totalCost, expenseCount, lastUpdated }`.

#### Expected Result
Instant, mathematically exact phase cost calculation across all projects.

---

### Subtask 2.4 — Render Live Phase Cost in Project Phase Timeline & History Log UI

#### Objective
Display the accumulated financial cost on each phase card in the project timeline and in the phase status history log.

#### Implementation Details
- **File Locations**:
  - `frontend/assets/js/modules/project-phases.js`
  - `frontend/assets/js/pages/project.js`
  - `frontend/assets/css/pages/project.css`
- UI Enhancements:
  1. On each phase step/card in the phases catalog, display a cost badge:
     `<span class="phase-cost-badge">تكلفة المرحلة: <strong>150,000 ج.م</strong></span>`.
  2. In the "سجل حالات المشروع" (Phase History Log table/timeline), add a column:
     `التكلفة الإجمالية للحالة` showing the exact financial sum at the time the phase completed or as currently accumulated.
  3. Format numbers with Arabic currency styling (`ج.م` / thousand separators).

#### Expected Result
Project managers can instantly see how much each phase has cost (e.g., "حالة البنا اتكلفت 150 الف").

---

### Subtask 2.5 — Handle Expense Modifications, Deletions & Phase Reassignment

#### Objective
Ensure that editing an existing expense amount, deleting an expense, or changing its assigned phase immediately updates the phase cost totals.

#### Implementation Details
- **File Location**: `frontend/assets/js/modules/store.js` and `frontend/assets/js/pages/project.js`.
- Logic:
  - When an expense is updated: Re-run `getProjectPhaseCostsSummary` and dispatch a `phase:cost-updated` custom event to refresh UI cards and history logs.
  - When an expense is deleted: Deduct amount from phase cost and refresh displays.

#### Expected Result
Zero discrepancies between recorded expenses and displayed phase totals after edits or deletions.

---

## 5. Edge Cases & Handling
- **Expense Added Without Selected Phase**: Fallback to project's active phase or display `"مصاريف عامة للمشروع"` (General Unallocated Project Expense).
- **Phases with Zero Expenses**: Display `"0 ج.م"` gracefully with muted badge styling.
- **Multiple Subphases**: Group subphase costs into the parent phase total seamlessly.

---

## 6. Regression Requirements
- Existing expense lists, categories (materials, labor, equipment), and project budget meters must continue to operate accurately.

---

## 7. Acceptance Criteria

- [ ] Quick Add modal includes project phase and subphase selector.
- [ ] Adding an expense under a phase immediately updates that phase's cost.
- [ ] Phase status history log (سجل حالات المشروع) displays total cost for each phase.
- [ ] Editing or deleting an expense recalculates phase costs in real time.
- [ ] Currency values are formatted clearly with Egyptian Pound (`ج.م`) symbols and thousand separators.
