# Task: 00 - WhatsApp Meta Business to n8n Integration Overview

Status: pending
Priority: high

## 1. Executive Summary & Objective

The primary objective of Task 6 is to build a robust, scalable, and secure asynchronous integration pipeline that captures incoming WhatsApp messages originating from Meta WhatsApp Business API via an **n8n** automation workflow, processes structured messages formatted as `"Name | Phone | Program | Status"`, and automatically provisions new customer records or updates existing customer profiles in the El Kayan system without human intervention.

This system guarantees real-time customer onboarding, automatic lead lifecycle status synchronization, phone prefix country detection, idempotent webhook execution, complete audit logging in a dedicated `webhook_logs` repository, and an intuitive administrative portal for monitoring and reprocessing failed webhook payloads.

---

## 2. High-Level Architecture & Data Flow

```text
[ WhatsApp User ] 
       │ (Sends message in format: "Name | Phone | Program | Status")
       ▼
[ Meta WhatsApp Business Cloud API ]
       │ (Webhook trigger)
       ▼
[ n8n Automation Engine ]
       │ (Payload packaging & Header auth signing)
       ▼
[ El Kayan Webhook Gateway: POST /api/webhook/whatsapp ]
       │
       ├─► 1. Webhook Security: Validate Bearer Secret or HMAC-SHA256 signature
       ├─► 2. Rate Limiting: Prevent DDoS and throttle burst traffic
       ├─► 3. Message Parsing: Tokenize delimiter `|`, normalize strings & handle edge cases
       ├─► 4. Phone Normalization: Sanitize digits, detect country (+20, +966, +968, +218, etc.)
       ├─► 5. Status Mapping: Translate Arabic status strings to system status UUIDs
       ├─► 6. Customer Resolution: Lookup customer by (normalized_phone, country)
       │       ├── If Not Found: Auto-create customer record (source='whatsapp_webhook')
       │       └── If Found: Auto-update metadata (preserve existing name_ar, update status & program)
       ├─► 7. Status History Logging: Record automated status transitions
       ├─► 8. Audit Logging: Insert transaction log into `webhook_logs` (latency, status, payload)
       │
       ▼
[ JSON Response: { success: true, customer_id, action: 'created'|'updated'|'no_change' } ]
       │
       ▼
[ Admin Logs UI: /admin/webhook-logs ] (Inspection, Filtering, JSON Modal & Reprocessing)
```

---

## 3. Master Task List & Decomposition

| Task File | Module / Area | Focus & Responsibility | Dependencies |
|:---|:---|:---|:---|
| **01-database.md** | Database & Migrations | Add `program_name` & `source` to `customers`, create `webhook_logs` table with indexes & foreign keys. | None |
| **02-security-auth.md** | Security & Authentication | Dual auth (Bearer Token & HMAC-SHA256 signature verification), rate limiting middleware, env configurations. | None |
| **03-parser-normalization.md** | Parsing & Normalization Engine | Parse `"Name \| Phone \| Program \| Status"`, phone cleaning, country detection, Arabic status mapper. | Task 1, Task 5 |
| **04-backend-api.md** | Webhook Controller & Business Logic | Main endpoint `POST /api/webhook/whatsapp`, dev testing endpoint, customer resolution, idempotency, audit logging. | 01, 02, 03 |
| **05-admin-frontend.md** | Admin Dashboard & Logs Viewer | `/admin/webhook-logs` page, filtering, responsive table, JSON inspector modal, manual payload reprocessing. | 01, 04 |
| **06-integration-documentation.md** | n8n & API Documentation | Comprehensive n8n workflow setup guide, payload schemas, header specs, error runbook in `docs/n8n-workflow.md`. | 02, 04 |
| **07-testing-verification.md** | Quality Assurance & Test Matrix | Unit tests for parser/auth, integration tests for endpoints, idempotency tests, end-to-end webhook verification. | 01 - 06 |

---

## 4. Implementation Order & Execution Sequence

```text
[01-database.md] ─────► [02-security-auth.md] ─────► [03-parser-normalization.md]
                                                              │
                                                              ▼
                                                     [04-backend-api.md]
                                                              │
                                    ┌─────────────────────────┴─────────────────────────┐
                                    ▼                                                   ▼
                         [05-admin-frontend.md]                             [06-integration-documentation.md]
                                    │                                                   │
                                    └─────────────────────────┬─────────────────────────┘
                                                              ▼
                                                  [07-testing-verification.md]
```

1. **Step 1 — Foundation (Database)**: Implement schema migrations, add `program_name` and `source` to `customers`, create `webhook_logs` table with all indexes.
2. **Step 2 — Security Layer**: Implement `webhookAuth` middleware supporting Bearer tokens and HMAC-SHA256 signature verification with rate-limiting.
3. **Step 3 — Core Logic & Parser**: Implement `parseWhatsAppMessage` utility with phone normalization, country detection integration, and status mapping.
4. **Step 4 — API & Orchestration**: Implement `webhookController` and routes (`POST /api/webhook/whatsapp`, `POST /api/dev/webhook-test`), wiring parser, customer resolution, and logging.
5. **Step 5 — Frontend Administration**: Build the Webhook Logs view (`/admin/webhook-logs`) with log viewer modal and reprocessing capabilities.
6. **Step 6 — Integration Docs**: Document the n8n webhook workflow, schema contracts, and configuration instructions in `docs/n8n-workflow.md`.
7. **Step 7 — Comprehensive Verification**: Execute unit, integration, and manual end-to-end test scenarios across all edge cases.

---

## 5. Architectural Principles & Constraints

1. **Strict Response Timing**: The webhook must respond with HTTP 200/400/401/500 in `< 3000ms` (well below n8n's 5000ms timeout threshold).
2. **Idempotency Guarantee**: Submitting identical payload multiple times (e.g. n8n automatic retries) must produce an action of `'no_change'` without creating duplicate customers or duplicate redundant status history records.
3. **Immutability of Customer Identity**:
   - The primary identifier for matching is `(whatsapp_number, country)`.
   - Never overwrite an existing customer's `name_ar` if it is already populated (unless explicitly blank).
   - Never create duplicate customers with identical phone numbers under the same country code.
4. **Resilience & Auditability**: Every incoming request (successful, bad payload, unauthorized, or internal error) must be logged into `webhook_logs` with processing duration, IP/source, and payload snapshot.
5. **Security by Default**: Webhook endpoints must reject unauthorized requests with HTTP 401 before running heavy parsing operations. Dev endpoints must be strictly disabled or locked in production environments.

---

## 6. Risk Assessment & Mitigation Matrix

| Potential Risk | Severity | Impact | Mitigation Strategy |
|:---|:---|:---|:---|
| **Malformed Message Format** | High | Customer creation failure / unhandled crash | Robust delimiter tokenization with trim, graceful degradation, default fallback status ("New"), structured 400 response with detailed error message. |
| **n8n Retry Floods / Duplication** | High | Duplicate records, race conditions, DB lock contention | DB unique constraints on `(whatsapp_number, country)`, atomic transactions, idempotency check comparing existing state before writing updates. |
| **Unauthenticated Spoofing** | Critical | Fake customer injection, database pollution | Constant-time HMAC-SHA256 verification or secret Bearer token validation; IP rate limiting to prevent brute force attacks. |
| **Slow Database Writes under Burst** | Medium | Webhook timeout on n8n side (> 5s) | Optimize query with composite indexes on `customers(whatsapp_number, country)` and `webhook_logs(created_at, customer_id)`. Non-blocking logging if required. |
| **Arabic Text Encoding / Diacritics** | Medium | Mismatched status mapping or corrupted names | UTF-8 normalization (`String.prototype.normalize('NFC')`), stripping zero-width spaces, flexible regex for Arabic status variants. |

---

## 7. Regression Prevention Checklist

The implementation must ensure zero disruption to existing platform operations:
- [ ] Existing manual customer creation via `/api/customers` continues to set `source = 'manual'`.
- [ ] Existing customer editing, listing, and filtering in the UI remain unaffected.
- [ ] Existing status management (Task 5) system statuses and custom statuses continue to function.
- [ ] Existing pricing calculation (Task 2) and communication logging (Task 4) remain fully operational.
- [ ] Existing database schema foreign keys and integrity rules remain intact.

---

## 8. Definition of Done (DoD)

- [ ] All 7 decomposed task files in `tasks_6/` are executed and verified.
- [ ] Database migration applies cleanly with backward compatibility.
- [ ] Webhook endpoint `POST /api/webhook/whatsapp` handles all defined payloads correctly.
- [ ] Parser handles valid, malformed, extra-whitespace, and missing-field strings reliably.
- [ ] Security authentication (Bearer & HMAC) prevents unauthorized access.
- [ ] Admin Webhook Logs UI displays historical logs with JSON inspection and reprocessing.
- [ ] Comprehensive documentation exists in `docs/n8n-workflow.md`.
- [ ] Unit and integration test suites pass with 100% of defined edge cases covered.
