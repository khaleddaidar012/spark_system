# Task 14 — Statement: Workmanship per Contractor labeled "مقابل <role> (<name>)"

## Task Description
In the project statement of account, each contractor's workmanship must be itemized
and written as **"مقابل <role> (<contractor name>)"** — e.g. *"مقابل سباكة (خالد
هشام)"* (Against plumbing — Khaled Hesham) — next to the amount.

Currently the statement only shows a single "Workmanship Total". The owner wants each
contractor's workmanship shown as its own line in the statement (and therefore in the
printed A4 PDF), with the role and the contractor's name.

## Required Implementation Steps
1. In `frontend/pages/statement.html`, add a "Workmanship by Contractor" section
   between the materials table and the summary, with a container that the script
   fills (`#statementContractorLines`).
2. In `frontend/assets/js/pages/statement.js`:
   - add a `roleLabel(role)` helper that resolves the role to the current language
     using the existing `project.role*` i18n keys (`rolePlumbing` … `roleOther`);
   - aggregate workmanship per contractor from the current rows (skip contractors
     with zero workmanship);
   - render one line per contractor:
     `{against} {roleLabel} ({contractorName}) — {amount}`
     where `{against}` is the "مقابل"/"Against" label;
   - call the renderer from `applyStatementData()` so totals and lines stay in sync.
3. Add i18n keys (en/ar):
   - `statement.workmanshipByContractor` — "Workmanship by Contractor" / "المصنعية حسب المقاول"
   - `statement.against` — "Against" / "مقابل"
4. Add CSS in `frontend/assets/css/pages/statement.css` for the breakdown list,
   matching the summary row style and print-safe.

## Expected Files to Modify
- `frontend/pages/statement.html`
- `frontend/assets/js/pages/statement.js`
- `frontend/assets/css/pages/statement.css`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`

## Completion Criteria
- Each contractor with workmanship shows a line "مقابل <role> (<name>)" with the
  amount in both languages, on screen and in print.
- Zero-workmanship contractors produce no line.
- Totals still match (workmanship lines sum to the Workmanship Total).
