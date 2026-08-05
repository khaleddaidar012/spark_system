# TASKS2 — Dashboard Redesign & UI Improvements

> Working list of small tasks.
> One task at a time. Mark `- [x]` as soon as a task is done.
> Commit + push after each completed logical group.

---

## UI Improvements

### 1. Main Content Width
- [x] Content expands to fill the remaining width beside the sidebar
- [x] Removed fixed widths — responsive CSS Grid / Flex layout
- [x] No unused empty area in the middle of the page

### 2. Dashboard Cards
- [x] Increased card size (min-height 220px, larger padding)
- [x] Cards occupy the available content area
- [x] Desktop: 2 cards per row (3 on very wide screens)
- [x] Tablet: 2 cards per row
- [x] Mobile: 1 card per row
- [x] Cards resize automatically and always look balanced

### 3. Layout Alignment
- [x] Navbar spans the full width on top (fixed broken flex row)
- [x] Balanced spacing between navbar / sidebar / content / cards

### 4. Sidebar
- [x] Reduced width (250px → 220px)
- [x] Improved spacing between menu items
- [x] Improved active item style (soft bg + glowing indicator bar)
- [x] Smooth hover animation + icon color accent
- [x] Premium feel

### 5. Navbar
- [x] Full width across the app
- [x] Consistent spacing for logo, language, theme and profile

### 6. Arabic RTL
- [x] Correct text alignment
- [x] Correct card alignment
- [x] Correct margins / padding
- [x] RTL arrow slide direction
- [x] Native-feeling Arabic spacing

### 7. Responsive Design
- [x] Mobile
- [x] Tablet
- [x] Laptop
- [x] Desktop
- [x] No large unused white spaces at any size

### 8. Visual Hierarchy
- [x] Increased spacing between sections
- [x] Increased padding inside cards
- [x] Consistent font sizes and typography
- [x] Larger, clearer icons
- [x] Premium, easy-to-scan cards

### 9. Overall Goal
- [x] Modern ERP look (Odoo / ERPNext / Notion style)
- [x] Simple, professional, minimal
- [x] Comfortable for daily use
- [x] No wasted space

---

## Layout
- [x] Redesign main layout (top navbar + right sidebar + content)
- [x] Right sidebar placement (RTL friendly)
- [x] Remove unnecessary sections

## Sidebar
- [x] Only main modules (Dashboard, Projects, Suppliers, Financial Accounts, Contractors, Reports)
- [x] Lucide icons
- [x] Active page highlighting
- [x] Hover effects
- [x] Smooth collapse animation
- [x] Mobile slide drawer
- [x] Tablet + desktop support

## Dashboard
- [x] Large module cards only (no charts / activities / stats)
- [x] Modern icon + title + description per card
- [x] Hover + click animation
- [x] Equal card sizes, auto responsive grid
- [x] Clean and spacious

## Navbar
- [x] Company logo + name
- [x] Language switcher
- [x] Theme switcher
- [x] User avatar
- [x] No unnecessary buttons

## Theme
- [x] Dark mode
- [x] Light mode
- [x] CSS variables
- [x] Save theme in Local Storage
- [x] Smooth transitions

## Languages (i18n)
- [x] English (LTR) translation file
- [x] Arabic (RTL) translation file
- [x] No hardcoded text (data-i18n driven)
- [x] Correct Arabic RTL layout, spacing, fonts
- [x] Language switcher works

## Responsive
- [x] Mobile
- [x] Tablet
- [x] Laptop
- [x] Desktop
- [x] Cards rearrange on screen size
- [x] Sidebar becomes drawer on mobile
- [x] Large touch targets

## UI Style
- [x] Minimal & premium
- [x] Soft shadows
- [x] Rounded corners
- [x] Smooth transitions
- [x] Balanced spacing
- [x] Modern typography

## Final
- [x] No backend / CRUD / API / MongoDB (frontend only)
- [x] Code verification passed
- [ ] Commit changes
- [ ] Push to GitHub
