# Task: 04 - Webhook API Endpoints & Business Logic Pipeline

Status: pending
Priority: high

## 1. Overview & Objectives

Implement the central webhook controller and routing layer that accepts incoming POST requests from n8n (`POST /api/webhook/whatsapp`), executes parsing, resolves customer records, manages atomic database transactions for creating or updating customers, tracks status transitions, records comprehensive execution logs in `webhook_logs`, and exposes a diagnostic dev test endpoint.

---

## 2. Dependencies
- Requires: `01-database.md` (tables & models), `02-security-auth.md` (auth middleware), `03-parser-normalization.md` (message parser).
- Blocks: `05-admin-frontend.md`, `06-integration-documentation.md`, `07-testing-verification.md`.

---

## 3. Subtasks

- [ ] **Subtask 4.1: Webhook Route Definitions & Middleware Chaining**
- [ ] **Subtask 4.2: Customer Ingestion & Update Transaction Pipeline**
- [ ] **Subtask 4.3: Status History Audit Logger Integration**
- [ ] **Subtask 4.4: Execution Latency & Webhook Log Persistence**
- [ ] **Subtask 4.5: Development Testing Endpoint (`POST /api/dev/webhook-test`)**
- [ ] **Subtask 4.6: Admin Log Reprocessing Endpoint (`POST /api/admin/webhook-logs/:id/reprocess`)**

---

## 4. Detailed Subtask Specifications

### Subtask 4.1 — Webhook Route Definitions & Middleware Chaining

#### Objective
Define the API routes for WhatsApp webhook ingestion with appropriate security, parsing, and rate limiting middlewares attached.

#### Implementation Details
- **File Locations**:
  - `backend/routes/webhookRoutes.js`
  - Mount in `backend/server.js` at `/api/webhook`
- Routes:
  - `POST /api/webhook/whatsapp` (primary webhook endpoint)
  - `POST /api/webhook/n8n` (alias endpoint for convenience)
- Middleware chain:
  `[ webhookRateLimiter, webhookAuth, express.json(), webhookController.handleWhatsAppWebhook ]`

#### Expected Result
Incoming HTTP POST requests are intercepted by rate limiting and authentication before reaching the controller.

---

### Subtask 4.2 — Customer Ingestion & Update Transaction Pipeline

#### Objective
Execute the customer resolution logic: find existing customer by `(whatsapp_number, country)`, or insert a new customer record with `source = 'whatsapp_webhook'`, respecting preservation rules for existing customer data.

#### Implementation Details
- **File Location**: `backend/controllers/webhookController.js`.
- Processing Flow:
  1. Record start timestamp `Date.now()`.
  2. Parse incoming `req.body.message` using `parseWhatsAppMessage`. If invalid, throw 400 Bad Request.
  3. Query database for customer matching `whatsapp_number = parsed.phone` AND `country = parsed.country`.
  4. **Branch A (Customer Not Found)**:
     - Insert into `customers`:
       - `name_ar`: `parsed.name`
       - `whatsapp_number`: `parsed.phone`
       - `country`: `parsed.country`
       - `program_name`: `parsed.program`
       - `status_id`: mapped `statusId`
       - `source`: `'whatsapp_webhook'`
     - Result action: `'created'`.
  5. **Branch B (Customer Exists)**:
     - Check fields for modifications:
       - If existing customer has empty/null `name_ar` AND parsed name is non-empty -> update `name_ar = parsed.name`. (DO NOT overwrite if `name_ar` is already present!).
       - If `parsed.program` is provided and different -> update `program_name = parsed.program`.
       - If `statusId` is provided and different from current status -> update `status_id = statusId`.
       - Update `last_communication_date = new Date()`.
     - Result action: `'updated'` if any field changed, else `'no_change'`.

#### Expected Result
Customers are created or updated accurately and idempotently without duplicate record creation or accidental name overwrites.

---

### Subtask 4.3 — Status History Audit Logger Integration

#### Objective
When a customer's status is changed via the webhook, automatically record an entry into the `customer_status_history` table (Task 5).

#### Implementation Details
- **File Location**: `backend/controllers/webhookController.js`.
- Logic:
  - If customer status changes from `oldStatusId` to `newStatusId`:
    - Insert into `customer_status_history`:
      - `customer_id`: customer.id
      - `from_status_id`: oldStatusId
      - `to_status_id`: newStatusId
      - `changed_by`: `'SYSTEM_WHATSAPP_WEBHOOK'` (or designated system bot UUID)
      - `changed_at`: current timestamp
      - `notes`: `'Updated automatically via WhatsApp webhook (n8n)'`

#### Expected Result
Complete audit trail for customer lifecycle stage transitions initiated by WhatsApp messages.

---

### Subtask 4.4 — Execution Latency & Webhook Log Persistence

#### Objective
Record complete diagnostics of the webhook transaction in `webhook_logs` before returning the HTTP response.

#### Implementation Details
- **File Location**: `backend/controllers/webhookController.js`.
- Capture:
  - `processing_time_ms = Date.now() - startTime`
  - `status`: `'success'` (HTTP 200) or `'error'` (HTTP 400, 401, 500)
  - `action`: `'created'` | `'updated'` | `'no_change'` | `'error'`
  - `customer_id`: customerId (if resolved, otherwise null)
  - `payload`: full JSON string of `req.body` and meta info
  - `error_message`: null or error description
- Send Response:
  ```json
  {
    "success": true,
    "customer_id": "cust-uuid-12345",
    "action": "created",
    "processing_time_ms": 42
  }
  ```

#### Expected Result
Every request lifecycle is measured, recorded in the database, and returned with clear status metadata.

---

### Subtask 4.5 — Development Testing Endpoint (`POST /api/dev/webhook-test`)

#### Objective
Provide a sandbox endpoint for developers to simulate WhatsApp messages without requiring live n8n workflows or authentication headers.

#### Implementation Details
- **File Location**: `backend/routes/devRoutes.js` and `backend/controllers/devController.js`.
- Endpoint: `POST /api/dev/webhook-test`.
- Protection: Only active when `NODE_ENV !== 'production'`.
- Request Body: `{ "message": "...", "meta": { ... } }`.
- Response: Returns detailed step-by-step diagnostic trace (raw input -> tokens -> detected country -> mapped status -> DB action -> execution time).

#### Expected Result
Developers can rapidly test message variations directly via curl, Postman, or local scripts.

---

### Subtask 4.6 — Admin Log Reprocessing Endpoint (`POST /api/admin/webhook-logs/:id/reprocess`)

#### Objective
Allow administrative users to re-run a previously failed webhook log entry directly from the admin dashboard after fixing configuration or data issues.

#### Implementation Details
- **File Location**: `backend/controllers/webhookLogController.js`.
- Endpoint: `POST /api/admin/webhook-logs/:id/reprocess`.
- Logic:
  1. Retrieve log entry by ID from `webhook_logs`.
  2. Parse the stored `payload.message`.
  3. Re-execute the ingestion pipeline.
  4. Update the existing log or append a new linked log entry with the new result.
  5. Return updated execution status.

#### Expected Result
Failed webhooks caused by transient downtime or misconfigurations can be remediated with a single click.

---

## 5. Edge Cases & Handling
- **Duplicate Simultaneous Webhooks**: Wrap customer insert/update in a database transaction or upsert query with conflict resolution on `(whatsapp_number, country)` to prevent race conditions.
- **Null / Missing Message Field**: If `req.body.message` is absent, return HTTP 400 with `{ "success": false, "error": "Missing 'message' field in payload" }` and log error.
- **Uncaught Database Failures**: Catch all internal database errors in try-catch, log error details in `webhook_logs`, and return HTTP 500 so n8n can schedule an automatic retry.

---

## 6. Regression Requirements
- Manual customer updates via the frontend or existing customer APIs must continue to function normally.
- Customer statistics, dashboard counts, and status filters must immediately reflect customers created or updated via webhooks.

---

## 7. Acceptance Criteria

- [ ] `POST /api/webhook/whatsapp` receives valid payload and creates new customer if phone not found.
- [ ] `POST /api/webhook/whatsapp` updates existing customer if phone matches.
- [ ] Existing `name_ar` is NOT overwritten if already set.
- [ ] Status transition is logged in `customer_status_history`.
- [ ] Execution details and execution duration (`processing_time_ms`) are saved to `webhook_logs`.
- [ ] HTTP responses return within `< 1000ms`.
- [ ] Development test endpoint works in non-production environments.
- [ ] Reprocessing endpoint successfully re-executes stored payloads.
