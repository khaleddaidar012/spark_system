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
- [ ] Suppliers list + add supplier form
- [ ] Show purchases, payments, remaining balance (auto-calculated)

## 9. Contractors Page
- [ ] Contractors list + add contractor form
- [ ] Show paid, remaining, total (auto-calculated)

## 10. Finance Page
- [ ] Accounts summary (incoming / outgoing / balances)
- [ ] Transaction history list

## 11. Reports
- [ ] Reports page (placeholder)

## 12. i18n & Final Polish
- [ ] English translations for all new pages
- [ ] Arabic translations for all new pages
- [ ] Dark mode check on all new pages
- [ ] Mobile / tablet / desktop responsive check
- [ ] Full navigation test
- [ ] Final commit + push to GitHub

---

## Progress Notes
- Phase 1 + Dashboard redesign are complete (see TASKS.md / TASKS2.md).
