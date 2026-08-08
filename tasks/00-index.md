# Spark ERP — all_plan.md → Task Breakdown

Every need in `all_plan.md` is split into a small task file in `tasks/`.
Each task was implemented, tested (EN + AR), and committed separately.

## Requirement → Task → Commit

| # | all_plan.md | Need | Task file | Commit |
|---|-------------|------|-----------|--------|
| 1 | lines 1–29 | Material cost per m² in project analytics | `01-per-material-analytics.md` | `3e0180e`, `31db25f` |
| 2 | lines 32–36 | Choose existing contractor or add new person | `02-contractor-select-or-add.md` | `6a9b4b1` |
| 3 | lines 39–41 | Supplier records what he supplies + auto-select material | `03-supplier-supplies-auto-material.md` | `8aad658` |
| 4 | lines 42–44 | Edit supplier + account & transactions (with project names) | `04-supplier-account-transactions.md` | `0bb9023` |
| 5 | lines 45–47 | Assign material to a contractor | `05-material-contractor-assignment.md` | `b68bf57` |
| 6 | lines 48–51 | Settle contractor account + view projects/materials per project | `06-contractor-account-settle-projects.md` | `e81192d` |
| 7 | lines 53–73 | Statement of account page + A4 PDF, material↔contractor link, client-bought, supervision % | `07-project-statement-of-account-pdf.md` | `c043047` |
| 8 | lines 78–85 | Reports page: project count, completed, per-supplier, per-project profit, contractor project count | `08-reports-page.md` | `5cb36a2` |
| 9 | lines 88–96 | Statement fixes: supervision sum, remove type from meta, shade client-bought, add/remove materials, workmanship on client-bought | `09-statement-fixes.md` | `9448d38` |
| 10 | lines 99–103 | Supervision is a value (not %) + statement formatting | `10-statement-supervision-value.md` | `2795361` |
| 11 | lines 108–111 | PDF text outside page → white border so all text stays inside | `11-pdf-white-border-fix.md` | `52e1a3f` |

## Status

All requirements from `all_plan.md` are implemented, verified in the browser
(English + Arabic), and committed. No open items.
