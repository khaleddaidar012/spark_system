# Task Overview — Spark ERP Bug Fix Sprint

## Project Goal

Fix three critical reported bugs in the Spark ERP system (Cloudflare Pages + D1 + IndexedDB offline-first PWA):

1. The full application does **not render online** on the laptop — only dashboard cards and basic initial info show, not the complete system.
2. The full application does **not work on mobile** (phone) at all.
3. The **sync gets permanently stuck** when coming back online after working offline on the phone — shows "syncing" indefinitely and never completes.
4. **Error diagnosis** — run a comprehensive diagnostic for any errors on both laptop and phone.

---

## AI Map

Project knowledge map: This project has no AI_MAP/ directory. Architecture is documented in:

- README.md — Tech stack, API endpoints, deployment
- TESTING_GUIDE.md — Full QA checklist (467 lines)
- TEST_RESULTS.md — Previous bug history
- COMMIT_TRACKING.md — Changelog
- rontend/sw.js — Service Worker / offline caching
- rontend/assets/js/sync/SyncEngine.js — Sync coordinator
- rontend/assets/js/sync/ConnectivityMonitor.js — Online/offline detection
- rontend/assets/js/sync/sync-queue.js — Persistent FIFO queue
- rontend/assets/js/modules/store.js — In-memory + IndexedDB data layer
- rontend/assets/js/db/db.js — Dexie.js schema
- rontend/assets/js/modules/api.js — Fetch wrapper / API client
- unctions/api/[[path]].js — Cloudflare Pages Function (full API)

---

## Requirements from needs.md

| ID | Original (Arabic) | Translation |
|---|---|---|
| REQ-001 | المشروع معتش شغال اونلاين علي اللاب بيظهر بس الكروت ومعلومات اوليه كدا مش النظام كله | The project is not working online on the laptop — only cards and basic info show, not the full system |
| REQ-002 | النظام معتش شغال كذلك علي التلفون | The system is also not working on the phone |
| REQ-003 | لما بعمل حاجة اوفلاين علي التلفون واوصل الانترنت بيقعد معلق ويقولي بعمل مزامنة ومش بيتحرك من مكانة | When I do something offline on the phone and connect to the internet, it gets stuck saying "syncing" and never moves |
| REQ-004 | اعمل اختبار لاي ايرور في اللابتو او الفون | Run a diagnostic test for any errors on the laptop or phone |

---

## Requirements Coverage

| Requirement | Task |
|---|---|
| REQ-001 | Task 01 — Online Rendering Fix (Laptop) |
| REQ-002 | Task 02 — Mobile Compatibility Fix |
| REQ-003 | Task 03 — Sync Stuck Fix |
| REQ-004 | Task 04 — Error Diagnostic and Testing |

---

## Execution Order

- [x] Task 01 — Online Rendering Fix (Laptop)
- [x] Task 02 — Mobile Compatibility Fix
- [x] Task 03 — Sync Stuck Fix
- [x] Task 04 — Error Diagnostic and Testing

---

## Dependencies

`
Task 01 (Online Rendering Fix)
  |
  +--- Task 02 (Mobile Compatibility Fix)
  |
  +--- Task 03 (Sync Stuck Fix)
        |
        v
      Task 04 (Error Diagnostic and Testing)
`

- Task 01 and Task 02 may be started in parallel if root causes are clearly different.
- Task 03 depends on Tasks 01+02 being resolved first (online state detection must work).
- Task 04 must be last — it validates all three previous fixes.

---

## Recommended Implementation Sequence

1. **Task 01 first** — Diagnose why full system does not render online on laptop.  
   This is the most fundamental issue. Investigation will reveal root cause (API failures, auth token issues, store init not awaited, snapshot fetch failing, or console errors blocking rendering).

2. **Task 02 second** — Fix mobile after laptop is resolved.  
   Mobile shares the same data pipeline. Once the online rendering root cause is understood, mobile-specific issues (PWA registration, Service Worker scope, viewport/layout) can be addressed on top.

3. **Task 03 third** — Fix the sync-stuck bug.  
   This is independent of rendering but requires online detection to work. Likely involves SyncEngine.triggerSync() deadlock, pi.pushSync() / pi.pullSync() returning an error silently swallowed, or the isSyncing lock never being released on error.

4. **Task 04 last** — Run comprehensive diagnostic and regression tests.  
   Confirms all three bugs are fixed and no new regressions exist.

---

## Global Acceptance Criteria

After ALL tasks are completed, ALL of the following must be true:

- [ ] Full Spark ERP renders correctly when online on a laptop (all pages, all data, full navigation)
- [ ] Full Spark ERP works on a mobile phone (all pages functional, responsive layout correct)
- [ ] Sync does NOT get permanently stuck after returning online from offline operation on a phone
- [ ] After offline + reconnect: pending changes are pushed to the server and the sync badge shows 100% / "synced"
- [ ] No JavaScript errors in the browser console on laptop or mobile
- [ ] All existing features (dashboard, projects, finance, suppliers, contractors, reports, settings) continue working
- [ ] Service Worker caching functions correctly on both laptop and phone
- [ ] Arabic RTL layout is correct on mobile and desktop

---

## Final Testing

- [ ] Verify all requirements from needs.md (REQ-001 through REQ-004)
- [ ] Verify requirement traceability (each REQ maps to a completed task)
- [ ] Verify data integrity (no data lost after sync)
- [ ] Verify API behavior (/api/health, /api/data, /api/sync/push, /api/sync/pull)
- [ ] Verify UI/UX on both desktop and mobile
- [ ] Verify responsive behavior across screen sizes
- [ ] Verify authentication/permissions are not broken
- [ ] Verify existing functionality regression (run TESTING_GUIDE.md checklist)
- [ ] Run full regression testing: node scripts/test-api.mjs
- [ ] Run: node scripts/test-full-system.js
