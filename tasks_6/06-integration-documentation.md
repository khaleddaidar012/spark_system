# Task: 06 - n8n Workflow Specification & Integration Documentation

Status: pending
Priority: high

## 1. Overview & Objectives

Author comprehensive, production-ready integration documentation in `docs/n8n-workflow.md` detailing the entire integration lifecycle between Meta WhatsApp Cloud API, n8n automation workflows, and the El Kayan backend. This guide serves as the official specification for DevOps engineers and automation specialists to configure, deploy, test, and troubleshoot the webhook pipeline.

---

## 2. Dependencies
- Requires: `02-security-auth.md` (auth headers), `04-backend-api.md` (endpoint contracts).
- Blocks: `07-testing-verification.md`.

---

## 3. Subtasks

- [ ] **Subtask 6.1: n8n Workflow Architecture & Step-by-Step Configuration Guide**
- [ ] **Subtask 6.2: Complete JSON Payload & Header Specification**
- [ ] **Subtask 6.3: Status Mapping & Country Code Reference Tables**
- [ ] **Subtask 6.4: n8n Retry Policy & Error Handling Runbook**
- [ ] **Subtask 6.5: Troubleshooting & Verification Guide with Sample cURL Commands**

---

## 4. Detailed Subtask Specifications

### Subtask 6.1 — n8n Workflow Architecture & Step-by-Step Configuration Guide

#### Objective
Document the complete n8n node sequence from receiving Meta WhatsApp webhooks to dispatching structured HTTP requests to the El Kayan endpoint.

#### Implementation Details
- **File Location**: `docs/n8n-workflow.md`.
- Workflow Nodes Breakdown:
  1. **Node 1: Webhook Trigger**: Captures incoming POST requests from Meta WhatsApp Cloud API.
  2. **Node 2: Message Validator / Filter**: Filters for text messages and extracts the body text and sender phone.
  3. **Node 3: Code / Function Node**: Formats the JSON payload into `{ message, meta: { message_id, timestamp, from } }`.
  4. **Node 4: HMAC Generator (Optional)**: Calculates SHA256 HMAC of body if using signature auth.
  5. **Node 5: HTTP Request Node**:
     - Method: `POST`
     - URL: `https://app.elkayan.com/api/webhook/whatsapp`
     - Authentication: Header Auth (`Authorization: Bearer {{ $env.WHATSAPP_WEBHOOK_SECRET }}`)
     - Timeout: `5000ms`
  6. **Node 6: Response Evaluation & Conditional Branch**: Inspects `{ success: true, action }` or routes to failure alert channel (e.g. Telegram / Slack / Email).

#### Expected Result
Clear, replicable guide for setting up n8n workflows across environments.

---

### Subtask 6.2 — Complete JSON Payload & Header Specification

#### Objective
Provide an unambiguous API schema contract for all requests sent by n8n.

#### Implementation Details
- Document exact HTTP headers:
  ```http
  POST /api/webhook/whatsapp HTTP/1.1
  Host: app.elkayan.com
  Content-Type: application/json
  Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>
  X-Hub-Signature-256: sha256=<hex_hmac>
  ```
- Document Request Body Schema:
  ```json
  {
    "message": "خالد هشام | 01092919124 | برنامج المعلين | مشترك",
    "meta": {
      "message_id": "wamid.HBgLMjAxMDkyOTE5MTI0FQIAEhggM0E5OTAyQjEyMzQ1Njc4OQA=",
      "timestamp": 1724606400,
      "from": "201092919124"
    }
  }
  ```
- Document Response Schema:
  ```json
  {
    "success": true,
    "customer_id": "e4b5f902-8c11-4f9e-9d22-123456789abc",
    "action": "created",
    "processing_time_ms": 38
  }
  ```

#### Expected Result
Deterministic API contract eliminating miscommunication between integration layers.

---

### Subtask 6.3 — Status Mapping & Country Code Reference Tables

#### Objective
Provide comprehensive reference tables mapping WhatsApp user input variations to system enum values and database records.

#### Implementation Details
- **Country Detection Table**:
  | Prefix | Country Name | Database Value |
  |:---|:---|:---|
  | `+20` / `0020` / `01...` | Egypt | `egypt` |
  | `+966` / `00966` / `05...` | Saudi Arabia | `saudi_arabia` |
  | `+968` / `00968` | Oman | `oman` |
  | `+218` / `00218` | Libya | `libya` |
  | Other | International | `other` |

- **Status Mapping Table**:
  | Raw WhatsApp Term | System Status Name | Description |
  |:---|:---|:---|
  | `مشترك` / `اشتراك` / `Subscribed` | Subscribed | Customer successfully enrolled |
  | `مهتم` / `Interested` | Interested | Prospect expressed interest |
  | `غير مهتم` / `Not Interested` | Not Interested | Prospect declined offer |
  | `ملغي` / `Cancelled` | Cancelled | Customer cancelled subscription |
  | *Any other / Blank* | New | Default entry stage |

#### Expected Result
Unambiguous lookup tables aiding both engineers and business stakeholders.

---

### Subtask 6.4 — n8n Retry Policy & Error Handling Runbook

#### Objective
Define recommended retry strategies, exponential backoff rules, and alert escalations for n8n execution failures.

#### Implementation Details
- **Retry Rules**:
  - On HTTP `500` or Network Timeout: Retry up to 3 times with exponential backoff (1s, 5s, 30s).
  - On HTTP `400` (Bad Request / Invalid Message Format): DO NOT retry; log to failure channel for manual human correction.
  - On HTTP `401` (Unauthorized): DO NOT retry; alert sysadmin immediately.
  - On HTTP `429` (Rate Limited): Wait for duration specified in `Retry-After` header before retrying.

#### Expected Result
Resilient automated execution that minimizes duplicate load while recovering from transient outages.

---

### Subtask 6.5 — Troubleshooting & Verification Guide with Sample cURL Commands

#### Objective
Provide actionable cURL commands and diagnostic steps for rapid end-to-end testing and production troubleshooting.

#### Implementation Details
- Include cURL templates for:
  1. Successful new customer creation test.
  2. Customer update test.
  3. Invalid format test (400 check).
  4. Unauthorized request test (401 check).
  5. Local dev sandbox testing (`/api/dev/webhook-test`).
- Common errors, root causes, and solutions list.

#### Expected Result
Instant onboarding and diagnostic runbook for any developer or support engineer.

---

## 5. Edge Cases & Handling
- **International Character Sets**: Ensure documentation specifies UTF-8 encoding in HTTP request nodes to prevent Arabic character corruption.
- **n8n Cloud vs Self-Hosted**: Note differences in environment variable configuration between cloud-hosted and self-hosted instances.

---

## 6. Regression Requirements
- Existing documentation files in `docs/` or project guides must not be deleted or overwritten.

---

## 7. Acceptance Criteria

- [ ] `docs/n8n-workflow.md` is authored with complete technical accuracy.
- [ ] Workflow nodes, parameters, and headers are fully documented.
- [ ] Request and response JSON schemas are clearly specified.
- [ ] Status mapping and country detection tables are included.
- [ ] Retry policies and troubleshooting cURL examples are provided.
