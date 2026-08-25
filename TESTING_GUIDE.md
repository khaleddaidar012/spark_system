# 🧪 Spark ERP — Professional Testing Guide

> **Purpose:** Manual QA checklist to verify every feature in the system works correctly after all implementations.  
> **Audience:** Developer or product owner doing a full end-to-end smoke test.  
> **How to use:** Go through each section top to bottom. Check each ✅ box as you confirm it works. Mark ❌ if something fails and note the issue.

---

## 🚀 Getting Started

1. Start the local dev server (or open the deployed URL)
2. Open browser **DevTools → Console** (F12) — keep it visible throughout
3. Clear any old data if needed: **Settings → Delete All Data**
4. Begin with a clean state

---

## 📋 Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard & Layout](#2-dashboard--layout)
3. [Quick Add FAB](#3-quick-add-fab)
4. [Invoice Attachment](#4-invoice-attachment)
5. [Projects — Create & List](#5-projects--create--list)
6. [Project Card Phase Badge](#6-project-card-phase-badge)
7. [Project Detail Page](#7-project-detail-page)
8. [Project Phases Panel](#8-project-phases-panel)
9. [Phase Finance Tracking](#9-phase-finance-tracking)
10. [Contractors](#10-contractors)
11. [Suppliers](#11-suppliers)
12. [Materials](#12-materials)
13. [Finance Page](#13-finance-page)
14. [Project Statement](#14-project-statement)
15. [Reports Page](#15-reports-page)
16. [Settings & Data Management](#16-settings--data-management)
17. [Backup & Restore](#17-backup--restore)
18. [Responsive & Mobile Layout](#18-responsive--mobile-layout)
19. [Arabic RTL Mode](#19-arabic-rtl-mode)
20. [Dark / Light Theme](#20-dark--light-theme)

---

## 1. Authentication

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 1.1 | Open the app URL without being logged in | Redirected to `login.html` | |
| 1.2 | Enter **wrong password** and submit | Error message shown, no redirect | |
| 1.3 | Enter **correct credentials** and submit | Redirected to `dashboard.html` | |
| 1.4 | Close browser tab, re-open — session remembered | Still logged in, no login prompt | |
| 1.5 | Click logout (or clear session manually) | Returns to login page | |

---

## 2. Dashboard & Layout

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 2.1 | Open `dashboard.html` | Page loads with **zero** console errors | |
| 2.2 | Sidebar navigation links visible | All links clickable and navigate correctly | |
| 2.3 | Dashboard shows project summary stats | Counts and totals display correctly | |
| 2.4 | FAB (floating +) button visible at bottom right | Button present with money/materials sub-icons | |
| 2.5 | Resize browser to mobile width (<480px) | Sidebar collapses/adapts, layout is responsive | |

---

## 3. Quick Add FAB

Test the floating action button on **Dashboard**, **Projects**, **Finance**, and other pages.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 3.1 | Click FAB on **Dashboard** | Sub-menu opens (Money, Materials icons) | |
| 3.2 | Click **Quick Money** icon | Quick Money modal opens with all fields populated | |
| 3.3 | Select person type: **Supplier** | Supplier dropdown populates | |
| 3.4 | Select person type: **Contractor** | Contractor dropdown populates | |
| 3.5 | Select person type: **Other** | Free-text name field appears | |
| 3.6 | Set direction to **In** (وارد) | Segment button highlights correctly | |
| 3.7 | Set direction to **Out** (صادر) | Segment button highlights correctly | |
| 3.8 | Select a project from dropdown | Project field saves with transaction | |
| 3.9 | Fill amount + click Save | Toast "تم الحفظ" shown, modal closes, form resets | |
| 3.10 | Open **Quick Materials** modal | All fields (Name, Supplier, Contractor, Qty, Unit, Price) visible | |
| 3.11 | Fill Quick Materials and save | Material appears in selected project | |
| 3.12 | Open **Quick Money Split** modal | Split rows available with total field | |
| 3.13 | Enter split amount that **doesn't match** total | Error toast blocks save | |
| 3.14 | Enter split amount that **matches** total | Saves successfully | |
| 3.15 | Close modal via **X** button | Modal closes, form resets cleanly | |
| 3.16 | Close modal via **Cancel** button | Modal closes, form resets cleanly | |
| 3.17 | Click **backdrop** (outside modal) | Modal closes | |

---

## 4. Invoice Attachment

Test on **Quick Money** and **Quick Materials** modals.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 4.1 | Open Quick Money — invoice section visible | Gallery 📷, Camera 📸, PDF buttons shown | |
| 4.2 | Attach a `.jpg` image via Gallery | Preview thumbnail appears | |
| 4.3 | Attach a `.png` image via Gallery | Preview thumbnail appears | |
| 4.4 | Attach a `.pdf` file via Gallery | PDF icon + filename shown (not an image preview) | |
| 4.5 | Attach image **> 3 MB** | Warning toast: "الملف كبير — قد يؤثر على سرعة المزامنة" | |
| 4.6 | Attach image **> 10 MB** | Error toast: rejected, preview not shown | |
| 4.7 | Attach invalid type (`.exe`, `.zip`) | Error toast: file type rejected | |
| 4.8 | Click **Remove** on attached invoice | Preview hidden, state cleared | |
| 4.9 | Save money transaction **with** attached image | Transaction saved successfully | |
| 4.10 | View that transaction in the project Money list | Small thumbnail visible in row | |
| 4.11 | Click thumbnail | Invoice lightbox opens full-screen | |
| 4.12 | In lightbox — click **Download** | File downloaded | |
| 4.13 | Close lightbox via **X** | Lightbox closes, no errors | |
| 4.14 | Save money transaction **without** invoice | Saves normally, no invoice UI shown | |
| 4.15 | Attach invoice, then click **Cancel** modal | On next open: no leftover invoice state | |
| 4.16 | Same invoice tests on **Quick Materials** modal | All behaviors identical | |

---

## 5. Projects — Create & List

Navigate to `projects.html`.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 5.1 | Page loads | Grid of project cards or empty state shown | |
| 5.2 | Click **Add Project** | New project modal opens | |
| 5.3 | Submit form **without** filling required fields | Validation — focus jumps to empty field | |
| 5.4 | Fill Name, Type, Area → Save | Project card appears in grid | |
| 5.5 | Card shows: Name, Type badge, Area, Status badge | All visible and correct | |
| 5.6 | New project with **no phases active** | No phase badge on card | |
| 5.7 | Click **View Details** | Navigates to `project.html?id=...` | |
| 5.8 | Click **Statement** | Navigates to `statement.html?id=...` | |
| 5.9 | Click **Complete Project** | Confirmation modal opens | |
| 5.10 | Confirm completion | Card moves to "done" style, Complete button removed | |
| 5.11 | Completed project card visually distinct | Greyed/muted styling applied | |

---

## 6. Project Card Phase Badge

> ⚠️ First complete **Section 8B** (activate at least one phase), then return here.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 6.1 | Project with **1 active phase** | Phase badge with colored dot on card | |
| 6.2 | Badge shows correct Arabic phase name | e.g. "الخرسانة المسلحة" | |
| 6.3 | Active sub-phase shown after "/" | e.g. "الخرسانة المسلحة / حداده" | |
| 6.4 | Phase dot has **pulsing animation** | Subtle scale-pulse on the dot | |
| 6.5 | Project with **2+ active phases** | Primary badge + "+N" counter chip | |
| 6.6 | Hover "+N" (desktop) | Tooltip lists other phase names | |
| 6.7 | **Completed** project | No active phase badge at all | |

---

## 7. Project Detail Page

Navigate to a project via View Details.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 7.1 | Page loads | Zero console errors | |
| 7.2 | Back link at top | Navigates to projects list | |
| 7.3 | Header shows: Name, Type, Status, Area | All correct | |
| 7.4 | **Project Summary** shows: Total Cost, Net | Calculated correctly | |
| 7.5 | **Contractors** section: "Add Contractor" button | Opens contractor modal | |
| 7.6 | Add contractor from dropdown → Save | Contractor row appears | |
| 7.7 | **Materials** section: "Add Material" button | Opens material modal with all fields | |
| 7.8 | Add a material → Save | Material row with qty, price, total appears | |
| 7.9 | **Money** section: money in/out totals | Displays correctly | |
| 7.10 | "Add Client Payment" button | Opens payment modal | |
| 7.11 | Add client payment | Money row shows +amount in green | |
| 7.12 | Any data-changed event via FAB | Page updates without full reload | |

---

## 8. Project Phases Panel

In project detail, scroll to **"مراحل المشروع / Project Phases"** section.

### 8A. Default Phases List

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 8.1 | New project has **11 default phases** | All listed in panel | |
| 8.2 | All phases start as **قيد الانتظار** | Dashed border, muted styling | |
| 8.3 | Sorted: active → pending → done | Order correct after changes | |
| 8.4 | Each row shows: Name, order #, status badge | All visible | |

### 8B. Activating a Phase

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 8.5 | Click **تفعيل** on "شراء الارض" | Phase → Active, colored left border appears | |
| 8.6 | Toast confirmation | "تم تفعيل المرحلة" shown | |
| 8.7 | **تم** (Done) button replaces Activate | Correct button swap | |
| 8.8 | Active phase dot pulses | Animation visible | |
| 8.9 | Activate a **second phase** at same time | Both show as active simultaneously | |
| 8.10 | Phase log shows status change | "قيد الانتظار → جاري" entry in log | |

### 8C. Completing a Phase

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 8.11 | Click **تم** on active phase | Confirmation modal opens | |
| 8.12 | Modal shows phase name | "هل أنت متأكد من إتمام مرحلة..." | |
| 8.13 | Other active phases shown in modal | Chips listing other active phases | |
| 8.14 | Next phase dropdown | Shows pending phases to optionally activate | |
| 8.15 | Click **إلغاء** | Modal closes, nothing changes | |
| 8.16 | Click **تأكيد الإتمام** | Phase → Done, greyed out | |
| 8.17 | Done phase shows ✓ checkmark + "مكتمل" | Correct visual styling | |
| 8.18 | Phase log updated | "جاري → مكتمل" entry appears | |
| 8.19 | Done phase has **no action buttons** | No Activate or Done button shown | |

### 8D. Sub-phases

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 8.20 | Activate "الخرسانة المسلحة" | Sub-phases (حداده, نجارة, صيانة) shown indented | |
| 8.21 | Sub-phase has its own colored dot | Visible sub-phase dot | |
| 8.22 | Click **تفعيل** on sub-phase "حداده" | Sub-phase → Active | |
| 8.23 | Click **تم** on sub-phase "حداده" | Sub-phase → Done | |
| 8.24 | Complete **all** sub-phases | Toast: "اكتملت جميع المراحل الفرعية" | |
| 8.25 | Sub-phase activation blocked when parent is Pending | تفعيل button not shown/disabled | |

### 8E. Add Custom Phase

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 8.26 | Click **إضافة مرحلة** button | Custom phase modal opens | |
| 8.27 | Submit without Arabic name | Validation: focus on name field | |
| 8.28 | Fill name: "أعمال الديكور" | Accepted | |
| 8.29 | Click a color swatch | Swatch scales up with ring | |
| 8.30 | Click **إضافة مرحلة فرعية** | Empty sub-phase row added | |
| 8.31 | Fill sub-phase name → Save | Custom phase in list with "مخصصة" label | |
| 8.32 | Delete pending custom phase | Phase removed | |
| 8.33 | Delete **active** custom phase | Error: cannot delete active phase | |

### 8F. Phase History Log

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 8.34 | Log section at page bottom | Timeline entries visible | |
| 8.35 | Status change entry | "من: قيد الانتظار → إلى: جاري" with timestamp | |
| 8.36 | Finance entry in log | Amount shown in color (green/red) | |
| 8.37 | Each log entry has timestamp | Date + time readable | |
| 8.38 | No history → empty state | "لا توجد سجلات للمراحل بعد" shown | |

---

## 9. Phase Finance Tracking

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 9.1 | Activate a phase on a project | Phase is active | |
| 9.2 | **Quick Money (FAB)** → select that project → Save | Finance log entry added to active phase | |
| 9.3 | **Quick Materials (FAB)** → select project → Save | Material cost entry in active phase log | |
| 9.4 | **Add Client Payment** (inside project) | Finance entry in phase log | |
| 9.5 | **Add Material** (inside project) | Material entry in phase log | |
| 9.6 | Log entry direction: in/out is correct | Green for incoming, red for outgoing | |
| 9.7 | Log entry amount matches input | Exactly what was entered | |
| 9.8 | Phase row shows accumulated cost | Total cost shown next to phase label | |
| 9.9 | Project with **no active phases** → add money | Saves normally, no phase log error | |
| 9.10 | Project with **2 active phases** → add money | Both phases receive log entries | |

---

## 10. Contractors

Navigate to `contractors.html`.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 10.1 | Page loads | No errors | |
| 10.2 | Add a contractor | Appears in list | |
| 10.3 | Click contractor card | Detail/account view opens | |
| 10.4 | Account shows balance and history | Correct amounts | |
| 10.5 | Contractor appears in Quick Add dropdowns | Selectable in FAB | |

---

## 11. Suppliers

Navigate to `suppliers.html`.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 11.1 | Page loads | No errors | |
| 11.2 | Add a supplier | Appears in list | |
| 11.3 | Edit supplier | Changes saved | |
| 11.4 | Supplier account shows transaction history | Correct | |
| 11.5 | Supplier appears in Quick Materials dropdown | Selectable | |
| 11.6 | Supplier "supplies" field auto-fills material name | Correct auto-suggest | |

---

## 12. Materials

Via project detail → Materials section.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 12.1 | Add material | Row appears | |
| 12.2 | Row shows: Name, Supplier, Contractor, Qty, Unit, Price, Total | All columns correct | |
| 12.3 | Cost included in project cost summary | Totals correct | |
| 12.4 | Material cost per m² in analytics | Correct calculation | |
| 12.5 | Material with invoice thumbnail | Lightbox opens on click | |

---

## 13. Finance Page

Navigate to `finance.html`.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 13.1 | Page loads | No errors | |
| 13.2 | Total incoming (وارد) correct | Matches all in transactions | |
| 13.3 | Total outgoing (صادر) correct | Matches all out transactions | |
| 13.4 | FAB works on finance page | Quick Money/Materials modals open | |

---

## 14. Project Statement

Click **Statement** on a project or go to `statement.html?id=...`.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 14.1 | Page loads | No errors | |
| 14.2 | Contractors shown with role format | "مقابل سباكة (محمد علي)" | |
| 14.3 | Materials section listed | Items with costs | |
| 14.4 | Client payments shown | Incoming amounts listed | |
| 14.5 | Supervision calculation correct | Value shown | |
| 14.6 | Net balance calculated | In / Out / Net displayed | |
| 14.7 | **Print/PDF** button works | PDF opens in new tab | |
| 14.8 | PDF has no text cut at edges | All inside white border margins | |

---

## 15. Reports Page

Navigate to `reports.html`.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 15.1 | Page loads | No errors | |
| 15.2 | Total project count correct | Right number | |
| 15.3 | Completed projects count correct | Right number | |
| 15.4 | Per-supplier totals shown | Breakdown correct | |
| 15.5 | Per-project profit shown | Income minus expenses | |

---

## 16. Settings & Data Management

Navigate to `settings.html`.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 16.1 | Page loads | No errors | |
| 16.2 | **Language toggle** (AR/EN) | All text switches | |
| 16.3 | **Theme toggle** (Dark/Light) | Theme switches instantly, persists on reload | |
| 16.4 | **Delete All Data** button present | Visible in settings | |
| 16.5 | Click Delete All Data | Asks for password confirmation | |
| 16.6 | Enter **wrong** password | Error, data not deleted | |
| 16.7 | Enter **correct** password twice | All data cleared, redirected | |

---

## 17. Backup & Restore

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 17.1 | **Export Backup** button | Downloads JSON backup file | |
| 17.2 | Backup file contains all data | Projects, people, transactions inside | |
| 17.3 | **Import Backup** button | File picker opens | |
| 17.4 | Upload valid backup | Data restored, confirmation shown | |
| 17.5 | Upload invalid file | Error shown, data unchanged | |

---

## 18. Responsive & Mobile Layout

Resize browser ≤480px or open on a phone.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 18.1 | Dashboard on mobile | Sidebar collapses, content fits | |
| 18.2 | Projects grid on mobile | Single column, full-width cards | |
| 18.3 | Quick Money modal on mobile | All fields visible, no overflow | |
| 18.4 | Phase badges on narrow cards | Badge wraps correctly | |
| 18.5 | Phase panel on mobile | Rows readable, buttons tappable | |
| 18.6 | Phase completion modal on mobile | All elements visible | |
| 18.7 | Invoice lightbox on mobile | Full-screen, scrollable | |
| 18.8 | All buttons ≥44px touch target | Easy to tap accurately | |

---

## 19. Arabic RTL Mode

Switch language to **Arabic** in Settings.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 19.1 | All UI text in Arabic | Full Arabic shown | |
| 19.2 | Layout direction is **RTL** | Content flows right-to-left | |
| 19.3 | Phase badges align in RTL | Dot on correct side | |
| 19.4 | Phase sub-list indentation RTL | Indented from the right | |
| 19.5 | Phase history timeline in RTL | Border on correct side | |
| 19.6 | Modal buttons aligned RTL | Cancel on right, Confirm on left | |
| 19.7 | Arabic phase names render cleanly | No garbled text | |

---

## 20. Dark / Light Theme

Toggle via Settings or header button.

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 20.1 | Switch to **Dark Mode** | Background dark, text light | |
| 20.2 | Phase badges in dark mode | Readable, good contrast | |
| 20.3 | Phase rows in dark mode | Active/pending/done visually distinct | |
| 20.4 | Invoice thumbnails in dark mode | Visible, no broken images | |
| 20.5 | Phase log timeline in dark mode | Dots and content readable | |
| 20.6 | Modals in dark mode | Dark background, inputs visible | |
| 20.7 | Switch to **Light Mode** | Background light, text dark | |
| 20.8 | All content readable in light mode | Nothing washed out | |

---

## 🐛 Issues Found

| # | Section | Test # | Description | Status |
|---|---------|--------|-------------|--------|
| — | — | — | (none yet) | — |

---

## ✅ Final Sign-Off

| Area | Result |
|------|--------|
| Authentication | |
| Dashboard & FAB | |
| Invoice Attachment | |
| Projects CRUD | |
| Project Card Phase Badges | |
| Project Detail Page | |
| Project Phases Panel | |
| Phase Finance Tracking | |
| Contractors | |
| Suppliers | |
| Materials | |
| Finance Page | |
| Statement & PDF | |
| Reports | |
| Settings & Data | |
| Backup & Restore | |
| Mobile Responsive | |
| Arabic RTL | |
| Dark/Light Theme | |

---

> 📌 **Total Tests:** ~140  
> 🎯 **Goal:** Zero console errors, all interactions work, data persists correctly across page reloads.
