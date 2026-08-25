# Task: 05 - Webhook Logs Admin Portal & Monitoring UI

Status: pending
Priority: high

## 1. Overview & Objectives

Build a high-performance, responsive, and intuitive administrative dashboard at `/admin/webhook-logs` (or within the admin section of the El Kayan frontend). This view allows administrators and support engineers to monitor real-time WhatsApp webhook ingestion, inspect raw JSON payloads and error stack traces via an interactive modal, filter and search through historical events, and trigger instant one-click reprocessing for failed webhook transactions.

---

## 2. Dependencies
- Requires: `01-database.md` (logs schema), `04-backend-api.md` (log retrieval and reprocessing endpoints).
- Blocks: `07-testing-verification.md`.

---

## 3. Subtasks

- [ ] **Subtask 5.1: Webhook API Client & Service Layer (`webhookApi.js`)**
- [ ] **Subtask 5.2: Webhook Logs Data Table View (`/admin/webhook-logs`)**
- [ ] **Subtask 5.3: Advanced Filtering, Search & Pagination Controls**
- [ ] **Subtask 5.4: Interactive JSON Payload & Error Inspection Modal**
- [ ] **Subtask 5.5: One-Click Webhook Reprocessing Action with Toast Notifications**
- [ ] **Subtask 5.6: Mobile Responsiveness, RTL/LTR Localization & Empty States**

---

## 4. Detailed Subtask Specifications

### Subtask 5.1 — Webhook API Client & Service Layer (`webhookApi.js`)

#### Objective
Create a dedicated frontend API service module to handle communication with backend webhook administrative endpoints.

#### Implementation Details
- **File Location**: `frontend/assets/js/services/webhookApi.js` (or `frontend/src/services/webhookApi.ts`).
- Methods to implement:
  - `fetchWebhookLogs({ page, limit, status, action, search, startDate, endDate })`
  - `getWebhookLogById(id)`
  - `reprocessWebhookLog(id)`
- Handle network timeouts, authentication tokens, and standardized error responses.

#### Expected Result
Clean, promise-based API abstraction for interacting with webhook logs backend.

---

### Subtask 5.2 — Webhook Logs Data Table View (`/admin/webhook-logs`)

#### Objective
Render a responsive, modern data table displaying all inbound webhook transactions with status badges, customer links, execution duration, and action types.

#### Implementation Details
- **File Locations**:
  - `frontend/pages/admin/webhook-logs.html` (or React / template equivalent)
  - `frontend/assets/css/pages/webhook-logs.css`
  - `frontend/assets/js/pages/webhook-logs.js`
- Table Columns:
  1. **Timestamp**: Formatted date & time (e.g. `2026-08-25 20:15:00`).
  2. **Status**: Visual badge (`Success` [Green], `Error` [Red]).
  3. **Action**: Badge (`Created` [Emerald], `Updated` [Blue], `No Change` [Slate], `Failed` [Rose]).
  4. **Customer**: Clickable link to customer profile (e.g., `"خالد هشام (+201092919124)"`) or `"N/A"`.
  5. **Latency**: Processing time badge (e.g. `34 ms`).
  6. **Source**: Source tag (`n8n` / `whatsapp_webhook`).
  7. **Actions**: Button to inspect payload and button to reprocess if status is `error`.

#### Expected Result
A clean, informative table providing real-time visibility into all WhatsApp automation activity.

---

### Subtask 5.3 — Advanced Filtering, Search & Pagination Controls

#### Objective
Enable admins to quickly filter down thousands of log records to find specific customer transactions or pinpoint errors.

#### Implementation Details
- **File Location**: `frontend/assets/js/pages/webhook-logs.js`.
- Filter Controls:
  - **Status Dropdown**: `All`, `Success`, `Error`.
  - **Action Dropdown**: `All`, `Created`, `Updated`, `No Change`, `Error`.
  - **Search Input**: Debounced search by phone number, customer name, or error keywords.
  - **Date Range**: Quick filters (`Today`, `Last 7 Days`, `Last 30 Days`, `Custom Range`).
  - **Pagination Bar**: Current page, total records count, items-per-page selector (`20`, `50`, `100`), Next/Prev buttons.

#### Expected Result
Instant server-side filtered results with responsive URL query parameter synchronization.

---

### Subtask 5.4 — Interactive JSON Payload & Error Inspection Modal

#### Objective
Provide a detailed modal window to view the raw incoming payload, headers, extracted tokens, and full stack trace when clicking on any table row.

#### Implementation Details
- **File Location**: `frontend/components/WebhookLogDetailModal.js` (or inline modal component).
- Modal Content:
  - **Header**: Log ID, Timestamp, Status Badge.
  - **Section 1 - Customer Summary**: Linked Customer Name, Phone, Detected Country, Assigned Status.
  - **Section 2 - Raw Message**: Highlighted quote block of the raw WhatsApp message string.
  - **Section 3 - Full JSON Payload**: Formatted, syntax-highlighted code block with a one-click "Copy JSON" button.
  - **Section 4 - Error Details (if error)**: Detailed error message and stack trace.

#### Expected Result
Admins can diagnose parsing errors or payload discrepancies without accessing server logs or database shells.

---

### Subtask 5.5 — One-Click Webhook Reprocessing Action with Toast Notifications

#### Objective
Allow administrators to reprocess failed webhook records with immediate visual feedback.

#### Implementation Details
- **File Location**: `frontend/assets/js/pages/webhook-logs.js`.
- Workflow:
  1. User clicks "Reprocess" (إعادة المعالجة) on a failed log row or in the modal.
  2. Button enters loading state (spinner).
  3. API call sent to `POST /api/admin/webhook-logs/:id/reprocess`.
  4. On success: Display green toast notification (`"تمت إعادة معالجة الرسالة بنجاح"`), update row status badge to Success, and refresh table.
  5. On failure: Display red toast with the new failure explanation.

#### Expected Result
Seamless remediation workflow for transient network issues or corrected data errors.

---

### Subtask 5.6 — Mobile Responsiveness, RTL/LTR Localization & Empty States

#### Objective
Ensure the webhook logs interface renders flawlessly across Arabic (RTL) and English (LTR) interfaces, and gracefully scales to mobile viewports.

#### Implementation Details
- Provide responsive card-based layout or horizontal overflow scroll for small viewports.
- Include localized Arabic string dictionary for all UI text (e.g. `"سجلات رسائل الواتساب"`, `"ناجح"`, `"فشل"`, `"تم الإنشاء"`, `"تم التحديث"`).
- Implement empty state graphic and message when no logs match current filters.
- Display shimmer/skeleton loaders while data is fetching.

#### Expected Result
Polished, enterprise-grade user interface compliant with El Kayan design system.

---

## 5. Edge Cases & Handling
- **Extremely Large JSON Payloads**: Truncate or lazy-load heavy JSON payloads in modal to prevent DOM freezing.
- **Deleted Customer References**: If `customer_id` is null (or customer was deleted), show `"عميل غير متوفر"` gracefully without throwing null pointer errors.
- **Multiple Simultaneous Reprocess Clicks**: Disable reprocess button while active to prevent duplicate re-execution requests.

---

## 6. Regression Requirements
- The admin navigation menu and existing customer views must remain intact and accessible.
- Global styles, header bars, and authentication tokens must continue functioning properly.

---

## 7. Acceptance Criteria

- [ ] Webhook logs page renders at `/admin/webhook-logs`.
- [ ] Table lists all webhook entries with timestamp, status badge, action, customer link, and latency.
- [ ] Filters for status, action, date range, and search input work accurately.
- [ ] Clicking a log row opens the detail modal displaying formatted JSON payload and error trace.
- [ ] Clicking "Reprocess" on a failed log re-runs the webhook and updates the UI with toast feedback.
- [ ] Page supports Arabic RTL and English LTR layouts seamlessly.
- [ ] Responsive design functions on mobile, tablet, and desktop screens.
