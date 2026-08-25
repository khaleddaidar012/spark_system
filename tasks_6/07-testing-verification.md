# Task: 07 - Quality Assurance, Testing Suite & Verification Matrix

Status: pending
Priority: high

## 1. Overview & Objectives

Establish a comprehensive automated test suite and execution matrix covering unit tests, integration tests, security tests, edge-case simulations, and end-to-end user verification for the WhatsApp webhook integration pipeline. This ensures complete reliability, regression resistance, and zero production regressions.

---

## 2. Dependencies
- Requires: `01-database.md`, `02-security-auth.md`, `03-parser-normalization.md`, `04-backend-api.md`, `05-admin-frontend.md`, `06-integration-documentation.md`.
- Blocks: Final deployment and feature release.

---

## 3. Subtasks

- [ ] **Subtask 7.1: Unit Test Suite for Parser, Phone Sanitizer & Status Mapper**
- [ ] **Subtask 7.2: Security & Authentication Test Suite (Bearer & HMAC Verification)**
- [ ] **Subtask 7.3: Webhook API Integration & Idempotency Test Suite**
- [ ] **Subtask 7.4: Frontend UI & Reprocessing Action Test Suite**
- [ ] **Subtask 7.5: End-to-End Manual Verification Matrix & Runbook**

---

## 4. Detailed Subtask Specifications

### Subtask 7.1 — Unit Test Suite for Parser, Phone Sanitizer & Status Mapper

#### Objective
Ensure all utility functions and parsing algorithms execute with 100% test coverage across boundary conditions and malformed inputs.

#### Implementation Details
- **File Location**: `backend/tests/unit/messageParser.test.js`.
- Test Cases to Implement:
  1. **Standard Message Parsing**: `"خالد هشام | 01092919124 | برنامج المعلين | مشترك"` correctly parses all 4 properties.
  2. **Irregular Spacing**: `"  خالد هشام   |   01092919124   |  برنامج المعلين  |  مشترك  "` trims tokens cleanly.
  3. **Arabic-Indic Numerals**: `"خالد | ٠١٠٩٢٩١٩١٢٤ | برنامج | مشترك"` normalizes phone to `"01092919124"`.
  4. **International Phone Formats**: `"+201092919124"`, `"00201092919124"`, `"+966501234567"` correctly mapped to countries.
  5. **Status Mapping Variants**:
     - `"مشترك"` / `"اشتراك"` / `"Subscribed"` ➔ `Subscribed`
     - `"مهتم"` / `"Interested"` ➔ `Interested`
     - `"غير مهتم"` / `"Not Interested"` ➔ `Not Interested`
     - `"ملغي"` / `"Cancelled"` ➔ `Cancelled`
     - `"غير معروف"` / `""` ➔ `New` (default fallback)
  6. **Malformed Inputs**: `"invalid text"`, `""`, `null`, `"Name only |"`, extra pipes `"A | B | C | D | E"`.

#### Expected Result
All unit test assertions pass with zero uncaught errors.

---

### Subtask 7.2 — Security & Authentication Test Suite (Bearer & HMAC Verification)

#### Objective
Validate that the security layer blocks unauthorized requests and correctly validates authentic tokens and HMAC cryptographic signatures.

#### Implementation Details
- **File Location**: `backend/tests/unit/webhookAuth.test.js`.
- Test Cases to Implement:
  1. Valid `Authorization: Bearer <valid_secret>` ➔ HTTP 200 / Next middleware called.
  2. Invalid `Authorization: Bearer <wrong_secret>` ➔ HTTP 401 Unauthorized.
  3. Valid `X-Hub-Signature-256: sha256=<computed_hmac>` ➔ HTTP 200 / Next middleware called.
  4. Tampered payload with valid signature header ➔ HTTP 401 Signature mismatch.
  5. Missing all auth headers ➔ HTTP 401 Missing authentication.
  6. Exceeding rate limit (> 100 requests in 60s from same IP) ➔ HTTP 429 Too Many Requests.

#### Expected Result
Complete security isolation of the webhook endpoints.

---

### Subtask 7.3 — Webhook API Integration & Idempotency Test Suite

#### Objective
Verify full end-to-end backend request flows including customer insertion, updates, name preservation, status history logging, and database log recording.

#### Implementation Details
- **File Location**: `backend/tests/integration/webhookApi.test.js`.
- Scenarios:
  1. **New Customer Ingestion**:
     - Send POST with new phone number.
     - Assert response: `{ success: true, action: 'created', customer_id: '...' }`.
     - Query DB: Customer row exists with `source = 'whatsapp_webhook'`, `name_ar`, `program_name`, `country`.
     - Query `webhook_logs`: 1 success row linked to customer.
  2. **Existing Customer Update**:
     - Send POST with existing customer phone number and new status `"مهتم"`.
     - Assert response: `{ success: true, action: 'updated', customer_id: '...' }`.
     - Query DB: Customer status updated, `last_communication_date` updated.
     - Query `customer_status_history`: New history record exists for status transition.
  3. **Name Preservation Rule**:
     - Existing customer has `name_ar = "محمد أحمد"`.
     - Webhook sends message `"علي إبراهيم | 01011111111 | برنامج | مشترك"`.
     - Assert: Customer's `name_ar` remains `"محمد أحمد"` (not overwritten).
  4. **Idempotency Execution**:
     - Send identical payload twice in a row.
     - Second request returns `{ success: true, action: 'no_change' }` without creating duplicate customers or duplicate status history records.
  5. **Invalid Payload Logging**:
     - Send `{ "message": "invalid" }`.
     - Assert: HTTP 400 returned, `webhook_logs` contains row with `status = 'error'`.

#### Expected Result
All API integration scenarios execute predictably and maintain database consistency.

---

### Subtask 7.4 — Frontend UI & Reprocessing Action Test Suite

#### Objective
Verify that the Webhook Logs view in the admin portal functions as expected.

#### Implementation Details
- **File Location**: `frontend/tests/e2e/webhookLogsPage.test.js` (or manual test script).
- Test Cases:
  1. Page `/admin/webhook-logs` renders table with rows populated from API.
  2. Status and action badges render with correct color codes.
  3. Clicking filter dropdowns (e.g. Status = Error) filters table records.
  4. Searching for customer phone dynamically filters table.
  5. Clicking a row opens the JSON payload modal with formatted code and copy button.
  6. Clicking "Reprocess" on a failed log item triggers API call, shows toast notification, and updates row status.

#### Expected Result
Flawless user experience for administrative operators.

---

### Subtask 7.5 — End-to-End Manual Verification Matrix & Runbook

#### Objective
Provide a clear manual verification checklist for pre-release validation.

#### Implementation Details
Execute the following verification matrix in order:

| Step | Action | Payload / Command | Expected Verification |
|:---|:---|:---|:---|
| **1** | Create new customer via webhook | `"أحمد علي \| 01012345678 \| برنامج المعلين \| مشترك"` | Customer created in DB, Country=Egypt, Status=Subscribed, `webhook_logs` has 1 success entry. |
| **2** | Update customer status | `"أحمد علي \| 01012345678 \| برنامج المعلين \| مهتم"` | Customer status updated to Interested, `customer_status_history` logged, `webhook_logs` has 2nd entry. |
| **3** | Idempotent repeat call | `"أحمد علي \| 01012345678 \| برنامج المعلين \| مهتم"` | Action returns `no_change`, no duplicate records. |
| **4** | Send malformed text | `"invalid text message"` | Response is HTTP 400, `webhook_logs` records error entry. |
| **5** | Inspect admin logs UI | Navigate to `/admin/webhook-logs` | All 4 transactions appear with correct badges and details. |
| **6** | Test reprocessing | Click "Reprocess" on the step 4 error log after correcting payload | Reprocess completes with notification. |
| **7** | Test docs accuracy | View `docs/n8n-workflow.md` | Verification instructions match actual behavior. |

#### Expected Result
100% pass across all verification steps.

---

## 5. Regression Requirements
- Existing test suites for Customer Core (Task 1), Pricing (Task 2), Payments (Task 3), Communication (Task 4), and Statuses (Task 5) must continue to pass with 0 failures.

---

## 6. Acceptance Criteria

- [ ] Unit tests for message parser and phone normalization achieve 100% coverage on defined cases.
- [ ] Security test suite verifies Bearer, HMAC, and rate limiting protections.
- [ ] Integration tests verify new customer creation, updates, name preservation, and idempotency.
- [ ] Webhook log entries are verified in database for all request outcomes.
- [ ] Frontend UI tests verify table rendering, filtering, JSON inspection modal, and reprocessing.
- [ ] All 7 steps in the manual verification matrix pass successfully.
