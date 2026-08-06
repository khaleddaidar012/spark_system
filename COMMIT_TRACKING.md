# COMMIT_TRACKING — Spark Engineering ERP

> Version history. Every commit appends a new section below.
> Always include the rollback command.

---

## Commit 010
- Commit: `2bd0aba` Initial project structure
- Description: Created frontend/backend folder structure, README, .gitignore.
- Rollback: `git reset --hard 2bd0aba`

## Commit 009
- Commit: `b1f9a76` Add design system foundation (CSS variables, reset, typography)
- Description: Added base CSS variables, reset styles and typography system.
- Rollback: `git reset --hard b1f9a76`

## Commit 008
- Commit: `06b1e27` Add component styles and login page (UI only, theme + lang toggles)
- Description: Added button/form/card component styles and the login page with theme and language toggles.
- Rollback: `git reset --hard 06b1e27`

## Commit 007
- Commit: `f723596` Add dashboard UI (sidebar, navbar, stats, demo charts, lists)
- Description: Added the first dashboard UI with sidebar, navbar, statistics cards, placeholder charts and lists.
- Rollback: `git reset --hard f723596`

## Commit 006
- Commit: `d864901` Simplify dashboard to essential summary cards with redesigned cards
- Description: Simplified the dashboard to essential summary cards and redesigned the card components.
- Rollback: `git reset --hard d864901`

## Commit 005
- Commit: `b15682c` Improve sidebar (spacing, RTL, collapse, active state) and replace all icons with Lucide
- Description: Improved the sidebar (spacing, RTL, collapse, active state) and replaced all icons with Lucide.
- Rollback: `git reset --hard b15682c`

## Commit 004
- Commit: `f9ad1d9` Add Arabic font + RTL polish, soften shadows, content fade-in
- Description: Added Arabic font and RTL polish, softened shadows and added a content fade-in effect.
- Rollback: `git reset --hard f9ad1d9`

## Commit 003
- Commit: `1913592` Clean up TASKS2.md checklist
- Description: Cleaned up the TASKS2.md checklist.
- Rollback: `git reset --hard 1913592`

## Commit 002
- Commit: `efcf2e3` Redesign app layout: top navbar, right sidebar, module-card dashboard, full i18n
- Description: Redesigned the app layout with a top navbar, right sidebar, module-card dashboard and full i18n.
- Rollback: `git reset --hard efcf2e3`

## Commit 001
- Commit: `50fcd88` UI Improvements: full-width layout, larger responsive cards, refined sidebar/navbar, RTL polish
- Description: Full-width layout, larger responsive cards, refined sidebar/navbar and RTL polish.
- Rollback: `git reset --hard 50fcd88`

## Commit 011
- Commit: `f95a4d5` Add Phase 2 roadmap (TASKS3.md) and commit tracking
- Description: Created TASKS3.md roadmap and COMMIT_TRACKING.md, committed and pushed.
- Rollback: `git reset --hard f95a4d5`

## Commit 016
- Commit: `f8ef77d` Build projects list page with cards, progress bars and create project modal
- Description: Projects list page with project cards (name, type, area, progress, status, cost summary), progress bars, hover animations, empty state, create-project modal and toast notifications.
- Rollback: `git reset --hard f8ef77d`

## Commit 015
- Commit: `938bb07` Add localStorage data store with seed data
- Description: Created store.js (localStorage CRUD + collections) with sample seed data.
- Rollback: `git reset --hard 938bb07`

## Commit 014
- Commit: `4e10052` Clean up gitignore
- Description: Removed invalid Arabic entry from .gitignore.
- Rollback: `git reset --hard 4e10052`

## Commit 013
- Commit: `0197d5e` Remove stray plan file from tracking
- Description: Removed the unreadable old plan file from git tracking.
- Rollback: `git reset --hard 0197d5e`

## Commit 012
- Commit: `1f78242` Add Reports dashboard card and placeholder module pages
- Description: Added the Reports card to the dashboard (5 cards) and created placeholder pages for Projects / Suppliers / Finance / Contractors / Reports.
- Rollback: `git reset --hard 1f78242`

---

## Commit 018
- Commit: `bb7c5e6` Add project details page with contractors, materials, cost summary and analytics
- Description: Project detail page with general info, contractors (paid/remaining/total), materials (supplier/qty/price/date), auto-calculated cost summary and per-m² analytics. Added business actions module that auto-updates project cost, inventory and supplier accounts.
- Rollback: `git reset --hard bb7c5e6`

## Commit 017
- Commit: `42b4978` Update commit tracking
- Description: Updated COMMIT_TRACKING.md with recent commits.
- Rollback: `git reset --hard 42b4978`

---

## Commit 019
- Commit: `d56bddf` Add floating quick add button with Quick Money and Quick Materials flows
- Description: Global floating action button with Quick Add menu, Quick Money (in/out → person → save) and Quick Materials (in/out → project → supplier → material → qty → price → save). All flows auto-update person accounts, project cost and inventory.
- Rollback: `git reset --hard d56bddf`

---

## Commit 020
- Commit: `36d48bb` Add suppliers, contractors and finance pages with auto-calculated balances
- Description: Suppliers page (purchases/paid/remaining), Contractors page (total/paid/remaining) and Finance page (in/out/net summary + transaction history), each with add forms.
- Rollback: `git reset --hard 36d48bb`

---

## Next Commit
- Commit: `PENDING`
- Description: TBA
- Rollback: `git reset --hard <commit_hash>`
