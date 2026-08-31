# Task 04 — Error Diagnostic and Testing

## Status

Status: COMPLETED

- [x] Task created
- [x] Implementation started
- [x] Implementation completed
- [x] Testing completed
- [x] Acceptance criteria verified
- [x] AI_MAP updated
- [x] Task completed

---

## Overview

**What:** Run a comprehensive diagnostic test suite covering all known and potential errors on both the laptop and the phone. This is the final validation task after Tasks 01, 02, and 03 have been implemented.

**Why:** The user explicitly requested testing for any errors. Additionally, after implementing three bug fixes (Tasks 01-03), a full regression test is required to ensure no existing functionality was broken.

**How it fits:** The project already has:
- `scripts/test-api.mjs` — Offline API test harness (Node.js, no wrangler needed)
- `scripts/test-full-system.js` — Full system test script
- `TESTING_GUIDE.md` — 467-line manual QA checklist with 20 test sections
- `scripts/test-offline.js` — Offline-specific tests

This task involves executing all existing tests AND adding new diagnostic tests for the three bugs that were fixed.

---

## Requirements

- **REQ-004:** Run a diagnostic test for any errors on the laptop or phone.

---

## Current Implementation

### Existing test infrastructure:

**`scripts/test-api.mjs`:**
- Runs the full Cloudflare Pages Function against an in-memory SQLite database.
- Tests: auth, seed, upsert/delete round-trips, restore, reset.
- Run with: `node scripts/test-api.mjs`
- No wrangler or Cloudflare account needed.

**`scripts/test-full-system.js`:**
- Full system test (5861 bytes).
- Run with: `node scripts/test-full-system.js`

**`scripts/test-offline.js`:**
- Offline-specific test (1662 bytes).
- Run with: `node scripts/test-offline.js`

**`TESTING_GUIDE.md` (20 sections):**
1. Authentication
2. Dashboard & Layout
3. Quick Add FAB
4. Invoice Attachment
5. Projects — Create & List
6. Project Card Phase Badge
7. Project Detail Page
8. Project Phases Panel
9. Phase Finance Tracking
10. Contractors
11. Suppliers
12. Materials
13. Finance Page
14. Project Statement
15. Reports Page
16. Settings & Data Management
17. Backup & Restore
18. Responsive & Mobile Layout
19. Arabic RTL Mode
20. Dark / Light Theme

**`TEST_RESULTS.md`:**
- Documents a previous bug fix (money entry issues) with detailed test cases TC-01 through TC-09.
- All previous tests were marked as resolved.

---

## Files / Modules Affected

| File | Change Type |
|---|---|
| `scripts/test-api.mjs` | Run (existing) + possibly extend with new sync endpoint tests |
| `scripts/test-full-system.js` | Run (existing) |
| `scripts/test-offline.js` | Run (existing) |
| `TESTING_GUIDE.md` | Add new test sections for fixed bugs |
| `TEST_RESULTS.md` | Document all test results for this sprint |
| All frontend pages | Manual QA following TESTING_GUIDE.md |

---

## Data / Architecture Changes

No code changes in this task — this is purely a testing and documentation task.

Exception: if a new error is discovered that was NOT covered by Tasks 01-03, document it and either:
1. Fix it if it is minor (1-line fix).
2. Create a new task file (`task_05_*.md`) for it.

---

## UI / UX Changes

No UI changes in this task.
Exception: if testing reveals a UI bug not covered by Tasks 01-03, document it in `TEST_RESULTS.md` and create a new task.

---

## Implementation Plan

### Phase 1 — Automated Tests (Laptop)

1. **Run `node scripts/test-api.mjs`** — verify all backend API tests pass.
   - Expected: auth, seed, upsert, delete, restore, reset all pass.
   - Record any failures.

2. **Run `node scripts/test-full-system.js`** — verify full system integration.
   - Record any failures.

3. **Run `node scripts/test-offline.js`** — verify offline behavior.
   - Record any failures.

### Phase 2 — Manual QA (Laptop — Browser)

4. Open the deployed app on the laptop (Chrome, latest version).
5. Follow `TESTING_GUIDE.md` — execute every test case in all 20 sections.
6. Record each test: PASS / FAIL / SKIP.
7. For every FAIL, note the error message and the exact steps to reproduce.

### Phase 3 — Manual QA (Mobile — Phone Browser)

8. Open the deployed app on the phone.
9. Follow `TESTING_GUIDE.md` — execute every test case that applies to mobile.
10. Pay special attention to:
    - Section 3: Quick Add FAB (touch interaction)
    - Section 5: Projects (create/list on mobile)
    - Section 10: Contractors (mobile layout)
    - Section 11: Suppliers (mobile layout)
    - Section 13: Finance Page
    - Section 18: Responsive & Mobile Layout (FULL section)
    - Section 19: Arabic RTL Mode
11. Record results.

### Phase 4 — Sync Testing (Phone → Laptop)

12. On the phone: go offline (airplane mode or WiFi off).
13. Add a test transaction (Quick Money — outgoing, any contractor).
14. Reconnect to internet.
15. Observe sync: must complete within 30 seconds (Task 03 fix).
16. On the laptop: verify the transaction appears.
17. Repeat in the other direction: add on laptop, verify on phone.

### Phase 5 — Regression Testing

18. Verify all features from the previous `TEST_RESULTS.md` (TC-01 through TC-09) still pass:
    - Supplier money movements (both directions)
    - Contractor money movements
    - Quick Money modal reset on reopen
    - Project page contractor summaries

### Phase 6 — Document Results

19. Update `TEST_RESULTS.md` with this sprint's results.
20. Update `TESTING_GUIDE.md` with new test cases for:
    - Online rendering regression test
    - Mobile system test
    - Sync stuck detection and recovery

---

## Small Tasks

- [ ] Run `node scripts/test-api.mjs` and record output (PASS/FAIL per test case).
- [ ] Run `node scripts/test-full-system.js` and record output.
- [ ] Run `node scripts/test-offline.js` and record output.
- [ ] Open DevTools on laptop (Console + Network) — verify zero console errors on dashboard.
- [ ] Navigate all 10 pages on the laptop — verify no console errors on any page.
- [ ] Execute Section 1 (Authentication) from TESTING_GUIDE.md — record results.
- [ ] Execute Section 2 (Dashboard & Layout) — record results.
- [ ] Execute Section 3 (Quick Add FAB) — record results.
- [ ] Execute Sections 5-9 (Projects and Phase features) — record results.
- [ ] Execute Sections 10-12 (Contractors, Suppliers, Materials) — record results.
- [ ] Execute Sections 13-15 (Finance, Statement, Reports) — record results.
- [ ] Execute Sections 16-17 (Settings, Backup) — record results.
- [ ] Execute Section 18 (Responsive & Mobile Layout) on the phone — record results.
- [ ] Execute Section 19 (Arabic RTL Mode) on phone — record results.
- [ ] Execute Section 20 (Dark/Light Theme) — record results.
- [ ] Execute sync test: offline phone → reconnect → verify sync completes — record result.
- [ ] Execute sync test: add on laptop → verify on phone — record result.
- [ ] Verify all previous TC-01 through TC-09 tests still pass.
- [ ] Check browser console on mobile — verify zero JavaScript errors.
- [ ] Check `/api/sync/push` endpoint manually — verify it responds correctly.
- [ ] Check `/api/sync/pull` endpoint manually — verify it returns full data snapshot.
- [ ] Write and save test results to `TEST_RESULTS.md`.
- [ ] Update `TESTING_GUIDE.md` with new test cases.
- [ ] Update `COMMIT_TRACKING.md` with fix summary.

---

## Edge Cases

- **A previously-passing test now fails** after the bug fixes — this is a regression. Document it immediately and assess whether it was caused by Tasks 01-03 fixes.
- **New error discovered not in Tasks 01-03** — create `task_05_*.md` and do NOT fix it during this task.
- **Test script dependency error** — if `node scripts/test-api.mjs` fails due to a missing module or Node.js version issue, document the error and note that it must be resolved (check `package.json` and Node.js version).
- **Flaky tests** — if a test sometimes passes and sometimes fails, note this carefully. Flaky behavior on mobile (especially with IndexedDB) is a known issue.
- **Data left from testing** — the test data added during this task should be cleaned up via Settings → Delete All Data, or by running `POST /api/data/reset`.

---

## Testing Checklist

(This task IS the testing checklist — all subtasks above are tests.)

Additional validation:

- [ ] All 20 TESTING_GUIDE.md sections executed
- [ ] Zero JavaScript console errors on laptop
- [ ] Zero JavaScript console errors on mobile
- [ ] All automated test scripts pass (test-api.mjs, test-full-system.js, test-offline.js)
- [ ] Sync test passes (offline phone → reconnect → data on server)
- [ ] Previous TC-01 through TC-09 regressions: all still pass
- [ ] TEST_RESULTS.md is updated with this sprint's results
- [ ] TESTING_GUIDE.md is updated with new test cases

---

## Acceptance Criteria

- All automated test scripts (`test-api.mjs`, `test-full-system.js`, `test-offline.js`) pass with no failures.
- All 20 sections of `TESTING_GUIDE.md` are executed on the laptop.
- Sections 18 and 19 are executed on the mobile phone.
- Zero JavaScript console errors on both laptop and mobile.
- The sync test (offline phone → reconnect → verify on laptop) passes.
- All previous regression tests (TC-01 through TC-09) still pass.
- `TEST_RESULTS.md` is updated with a complete record of this sprint's test results.
- `TESTING_GUIDE.md` is updated with new test cases for the three fixed bugs.
- `COMMIT_TRACKING.md` is updated.
- Any new bugs discovered are documented in new task files (NOT silently ignored).

---

## Dependencies

Depends on:
- Task 01 (Online Rendering Fix) — must be completed
- Task 02 (Mobile Compatibility Fix) — must be completed
- Task 03 (Sync Stuck Fix) — must be completed

---

## AI_MAP Impact

After implementation, update:
- `TESTING_GUIDE.md` — add new test cases
- `TEST_RESULTS.md` — add sprint test results
- `COMMIT_TRACKING.md` — add sprint summary
- `README.md` — update if any API or architecture changed during Tasks 01-03
