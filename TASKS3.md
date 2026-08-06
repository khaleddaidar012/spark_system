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
- [ ] Create projects.html page
- [ ] Create project card component (name, type, area, progress, status, cost summary)
- [ ] Create progress bar component
- [ ] Add hover animation on cards
- [ ] Responsive cards grid
- [ ] Empty state when no projects
- [ ] Page-level i18n keys

## 5. Create Project
- [ ] "Add Project" large button
- [ ] Create reusable modal component
- [ ] Form fields: Project Name, Type, Area, Advance Payment
- [ ] Project types: Apartment / Villa / Clinic / Office / Shop / Other
- [ ] Validation (required fields only)
- [ ] Save to store + refresh list
- [ ] Toast notification on save

## 6. Project Detail Page
- [ ] Create project.html (loads project by id)
- [ ] General Information section (name, type, area, advance, progress)
- [ ] Contractors section (paid / remaining / total cost per contractor)
- [ ] Add contractor form
- [ ] Materials section (supplier, purchase cost, quantity, project, date)
- [ ] Add material form
- [ ] Cost Summary (material cost + contractor cost + other = grand total) — auto-calculated
- [ ] Project Analytics (m², consumed materials, cost per m², labor per m², total per m²)
- [ ] Auto-recalculate all totals on every change

## 7. Quick Actions (Highest Priority)
- [ ] Floating Action Button (always visible, large, one-thumb)
- [ ] Quick Add menu (Quick Money / Quick Materials)
- [ ] Quick Money flow: Incoming / Outgoing -> Choose Person -> Save (2–3 taps)
- [ ] Money belongs to: Supplier / Contractor / Client / Other
- [ ] Every money transaction updates the person's account automatically
- [ ] Quick Materials flow: In/Out -> Project -> Supplier -> Material -> Qty -> Price -> Save
- [ ] Material transaction updates project cost + inventory + supplier account automatically
- [ ] i18n for quick action flows

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
