# TASKS3 — Phase 2: Projects, Data & Quick Actions

> Main development roadmap for Phase 2.
> Every task is small (10–30 minutes max).
> Mark `- [x]` immediately after finishing a task.
> Commit + update COMMIT_TRACKING.md + push after each completed group.

---

## 1. Organization
- [x] Create TASKS3.md roadmap
- [x] Create COMMIT_TRACKING.md
- [x] Commit + push planning files

## 2. Dashboard
- [x] Add Reports module card (5 cards total)
- [x] Dashboard cards occupy most of the screen
- [x] Responsive + premium polish
- [x] Create placeholder pages for Projects / Suppliers / Finance / Contractors / Reports

## 3. Data Layer (localStorage)
- [x] Create store.js module (load / save / CRUD helpers)
- [x] Create uid generator
- [x] Create default collections: projects, suppliers, contractors, clients, materials, moneyTransactions, materialTransactions
- [x] Create sample seed data for testing

## 4. Projects List
- [x] Create projects.html page
- [x] Create project card component (name, type, area, progress, status, cost summary)
- [x] Create progress bar component
- [x] Add hover animation on cards
- [x] Responsive cards grid
- [x] Empty state when no projects
- [x] Page-level i18n keys

## 5. Create Project
- [x] "Add Project" large button
- [x] Create reusable modal component
- [x] Form fields: Project Name, Type, Area, Advance Payment
- [x] Project types: Apartment / Villa / Clinic / Office / Shop / Other
- [x] Validation (required fields only)
- [x] Save to store + refresh list
- [x] Toast notification on save

## 6. Project Detail Page
- [x] Create project.html (loads project by id)
- [x] General Information section (name, type, area, advance, progress)
- [x] Contractors section (paid / remaining / total cost per contractor)
- [x] Add contractor form
- [x] Materials section (supplier, purchase cost, quantity, project, date)
- [x] Add material form
- [x] Cost Summary (material cost + contractor cost + other = grand total) — auto-calculated
- [x] Project Analytics (m², consumed materials, cost per m², labor per m², total per m²)
- [x] Auto-recalculate all totals on every change
- [x] Business actions module (auto-updates project cost, inventory, supplier account)

## 7. Quick Actions (Highest Priority)
- [x] Floating Action Button (always visible, large, one-thumb)
- [x] Quick Add menu (Quick Money / Quick Materials)
- [x] Quick Money flow: Incoming / Outgoing -> Choose Person -> Save (2–3 taps)
- [x] Money belongs to: Supplier / Contractor / Client / Other
- [x] Every money transaction updates the person's account automatically
- [x] Quick Materials flow: In/Out -> Project -> Supplier -> Material -> Qty -> Price -> Save
- [x] Material transaction updates project cost + inventory + supplier account automatically
- [x] i18n for quick action flows

## 8. Suppliers Page
- [x] Suppliers list + add supplier form
- [x] Show purchases, payments, remaining balance (auto-calculated)

## 9. Contractors Page
- [x] Contractors list + add contractor form
- [x] Show paid, remaining, total (auto-calculated)

## 10. Finance Page
- [x] Accounts summary (incoming / outgoing / balances)
- [x] Transaction history list

## 11. Reports
- [x] Reports page (placeholder)

## 12. i18n & Final Polish
- [x] English translations for all new pages
- [x] Arabic translations for all new pages
- [x] Dark mode check on all new pages
- [x] Mobile / tablet / desktop responsive check
- [x] Full navigation test
- [x] Missing login translations added
- [x] Final commit + push to GitHub

---

## 13. Bug Fixes (High Priority)
### Quick Add Modal Bug
- [x] Fix modal CSS `hidden` override (root cause of auto-open)
- [x] Quick Add modal opens only on + button press
- [x] Clear Close (X) button works
- [x] Click outside modal closes it
- [x] ESC key closes the modal
- [x] Body scroll restored after closing a modal

### Arabic Login Page
- [x] Login page applies i18n translations (Arabic text)
- [x] Fix RTL direction and text alignment
- [x] Fix input / button / checkbox alignment
- [x] Fix Arabic spacing, margins, padding
- [x] Translated input placeholders

### Demo Login Account
- [x] Validate username `admin` / password `Spark@2026#ERP`
- [x] Show error for wrong credentials
- [x] Update README with Development Login section

### Quick Add Default-Open Bug
- [x] Fix Quick Add always-open bug
- [x] Open Quick Add only on button click
- [x] Add toggle behavior
- [x] Add close button
- [x] Add click outside to close
- [x] Add ESC key support
- [x] Test on desktop
- [x] Test on mobile

### Projects Module Improvements (High Priority)
- [x] Fix empty state rendering (CSS `hidden` override — same root cause as Quick Add)
- [x] Show projects when available
- [x] Hide empty state when projects exist
- [x] Add Complete Project button
- [x] Add confirmation dialog
- [x] Set status to "Completed" on confirm
- [x] Set progress to 100% on confirm
- [x] Add completed badge
- [x] Move completed projects to the bottom of the list
- [x] Visually distinguish completed projects (is-done card style)
- [x] Improve project card layout (name, type, area, progress bar, %, status, total cost)
- [x] Add View Details button
- [x] Project details page (General / Contractors / Materials / Cost / Analytics) wired from View Details
- [x] i18n keys (en/ar) for new buttons and confirmation dialog
- [x] Test on desktop
- [x] Test on mobile

### Materials Module — Supplier Quick Add (Reusable)
- [x] Create reusable Quick Add modal component (config-driven, bottom sheet on mobile)
- [x] Add "+" button beside Supplier field (project material form)
- [x] Add "+" button beside Supplier field (Quick Materials flow)
- [x] Build Supplier form (Name required, Phone / Address / Notes optional)
- [x] Validate required fields (stays open when empty)
- [x] Save new supplier immediately
- [x] Auto-close modal after save
- [x] Auto-select new supplier in the dropdown
- [x] Preserve entered material data (no page leave, no form reset)
- [x] Cancel button closes modal without saving
- [x] Mobile bottom sheet UX (full-width, bottom-aligned, large inputs/buttons)
- [x] i18n keys (en/ar) for quick add
- [x] Reusable for future: Add Client / Add Contractor / Add Material / Add Project
- [x] Test on desktop
- [x] Test on mobile

---

## Progress Notes
- Phase 1 + Dashboard redesign are complete (see TASKS.md / TASKS2.md).
