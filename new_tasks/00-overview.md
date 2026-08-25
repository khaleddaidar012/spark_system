# Task: 00 - Spark ERP System Enhancements Overview

Status: pending
Priority: high

## 1. Executive Summary & Objective

This implementation plan decomposes the core architectural and functional enhancements requested in `tasks.md` for the Spark Engineering ERP System. The enhancements focus on four critical financial and operational pillars:

1. **Phase-Linked Financial Ingestion & Cost Accumulation**: Unifying expense creation across the system (Quick Add, Project Page, Finance Page) with project phases/states (`project_phases`), enabling real-time cost accumulation per phase (e.g. tracking that the "Building/Concrete Phase" has accumulated 150,000 EGP).
2. **Contractor & Supplier Statement of Account with Date Filtering, Deductions & PDF Export**: Introducing a full statement of account ("كشف حساب") workflow on Contractor and Supplier management pages, supporting customizable date ranges, deduction recording, and high-fidelity Arabic RTL printable PDF statements.
3. **Total Revenue / Inflow KPI in Finance Module**: Introducing a prominent "Total Inflow" ("إجمالي الواردات") metric card alongside "Total Expenses" ("إجمالي المصروفات") in the financial accounts dashboard.
4. **Comprehensive Top Financial Header in Projects Dashboard**: Implementing a 5-card financial KPI header at the top of the Projects page displaying: Total Inflow, Total Outflow, Net Balance (Difference), User-Defined Expected Profit, and Dynamically Computed Actual Profit (`Expected Profit + (Inflow - Outflow)`).

---

## 2. High-Level System Architecture & Flow

```text
[ Inflow / Revenue ] ────────┐
                             ▼
[ System Expenses ] ──► [ Phase-Expense Linker ] ──► [ Phase Cost Accumulator ] ──► [ Phase History Log UI ]
 (Quick Add / Forms)         │                                                         (Cost per State/Phase)
                             │
                             ▼
                 [ Core Financial Ledger ]
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
[ Finance Dashboard ]  [ Statement Engine ]  [ Projects Page Header ]
 - Total Inflow Card    - Date Range Filter   - 1. Total Inflow
 - Total Outflow Card   - Apply Deductions    - 2. Total Outflow
 - Net Cash Balance     - Printable PDF Export- 3. Net Difference
                                              - 4. Expected Profit (Input)
                                              - 5. Actual Profit (Calculated)
```

---

## 3. Master Task List & Decomposition

| Task File | Module / Area | Focus & Responsibility | Dependencies |
|:---|:---|:---|:---|
| **01-database-store.md** | Data Layer & Storage | Schema & LocalStore extensions for phase-expense relations, deductions ledger, and expected profit storage. | None |
| **02-phase-cost-tracking.md** | Project Phases & Expenses | Expense-phase linking in Quick Add & expense forms, real-time phase cost recalculation, and phase history cost view. | 01 |
| **03-statement-of-account-pdf.md** | Contractors & Suppliers | "كشف حساب" modal/view, date range filtering, deduction application, and high-quality PDF print generation. | 01 |
| **04-finance-inflow-kpi.md** | Financial Accounts | Total Inflow ("إجمالي الواردات") KPI calculation, cashflow balance, and UI integration in `finance.html`. | 01 |
| **05-projects-header-financials.md** | Projects Page Header | 5 KPI summary cards (Inflow, Outflow, Difference, Expected Profit input, Actual Profit formula calculation). | 01, 02, 04 |
| **06-ui-ux-localization.md** | UI/UX & Design Polish | RTL Arabic typography, Lucide icon alignments, mobile responsiveness, empty states, and toast notifications. | 02, 03, 04, 05 |
| **07-testing-verification.md** | QA & Test Matrix | Mathematical precision testing, edge-case simulation, PDF layout verification, and end-to-end user flows. | 01 - 06 |

---

## 4. Implementation Order & Dependency Graph

```text
[01-database-store.md]
         │
         ├───► [02-phase-cost-tracking.md] ────────┐
         │                                         ▼
         ├───► [03-statement-of-account-pdf.md]    [05-projects-header-financials.md]
         │                                         ▲
         └───► [04-finance-inflow-kpi.md] ─────────┘
                           │
                           ▼
               [06-ui-ux-localization.md]
                           │
                           ▼
              [07-testing-verification.md]
```

---

## 5. Key Architectural Decisions & Business Rules

1. **Formula for Actual Profit**:
   $$\text{Actual Profit} = \text{Expected Profit} + (\text{Total Inflow} - \text{Total Outflow})$$
   *Note*: Expected Profit is stored per project or globally as entered by the user, and Actual Profit dynamically recalculates whenever revenues or expenses change.
2. **Phase Cost Immutability & Audit**:
   - An expense linked to a project phase automatically updates `project_phases[i].spent` or `total_cost`.
   - Editing or deleting an expense re-triggers the phase cost accumulator to maintain exact mathematical consistency.
3. **Statement Deductions ("الخصومات")**:
   - Deductions applied to a contractor or supplier reduce their net payable balance and are explicitly listed as itemized deduction entries on the generated PDF statement.
4. **High-Fidelity PDF Printing**:
   - Uses native browser print engine with dedicated `@media print` CSS and custom HTML print container to ensure zero external dependency bloat and instant Arabic font rendering.

---

## 6. Risk Assessment & Mitigation

| Risk | Severity | Mitigation Strategy |
|:---|:---|:---|
| **Orphaned Expenses on Phase Change** | Medium | When a project phase is marked complete or deleted, preserve existing expense linkages and maintain audit logs. |
| **Arabic PDF Layout Distortion** | High | Design dedicated clean print stylesheets (`@media print`) using standard system Arabic fonts (`Cairo`, `Tahoma`, `Inter`) and tabular figures. |
| **Floating Point Inaccuracies in Currency** | High | Implement centralized currency calculation helper with standard rounding (`Math.round((val + Number.EPSILON) * 100) / 100`). |
| **Performance Overhead on Header KPI Aggregation** | Low | Implement efficient memoized aggregations in `calc.js` triggered only on financial state mutations. |

---

## 7. Definition of Done (DoD)

- [ ] All 7 decomposed task files in `new_tasks/` are executed and verified.
- [ ] Expenses added from any entry point correctly link to project phases and update phase history costs.
- [ ] Statement of Account ("كشف حساب") generates accurate date-filtered records with deductions and PDF export.
- [ ] "إجمالي الواردات" is visible, accurate, and styled in `finance.html`.
- [ ] Projects page features the 5 synchronized KPI header cards with dynamic calculations.
- [ ] Arabic RTL layout and mobile responsiveness are fully verified.
