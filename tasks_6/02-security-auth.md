# Task: 02 - Webhook Security & Authentication Layer

Status: pending
Priority: high

## 1. Overview & Objectives

Implement an enterprise-grade security and authentication layer for the inbound WhatsApp webhook endpoint. The endpoint must support dual authentication mechanisms (Bearer Token authentication and HMAC-SHA256 signature verification), provide constant-time comparison to prevent timing attacks, enforce rate-limiting tailored for n8n automation bursts, and log unauthorized attempts for security auditing.

---

## 2. Dependencies
- Requires: `01-database.md` (for logging security rejections).
- Blocks: `04-backend-api.md`, `07-testing-verification.md`.

---

## 3. Subtasks

- [ ] **Subtask 2.1: Environment Configuration & Secret Management**
- [ ] **Subtask 2.2: Dual Authentication Middleware (`Bearer Token` & `HMAC-SHA256`)**
- [ ] **Subtask 2.3: Constant-Time Signature Validation Engine**
- [ ] **Subtask 2.4: Adaptive Rate Limiting Middleware for n8n Traffic**
- [ ] **Subtask 2.5: Security Audit Failure Logger & Error Handler**

---

## 4. Detailed Subtask Specifications

### Subtask 2.1 — Environment Configuration & Secret Management

#### Objective
Define and validate all environment variables required for securing WhatsApp webhooks across development, staging, and production environments.

#### Implementation Details
- **File Location**: `backend/config/webhook.js` (and update `.dev.vars.example` / `.env.example`).
- Environment variables:
  - `WHATSAPP_WEBHOOK_SECRET`: Secret key used for Bearer token validation and HMAC signature generation.
  - `WEBHOOK_AUTH_MODE`: `'both'` | `'bearer'` | `'hmac'` (default: `'both'`).
  - `WEBHOOK_RATE_LIMIT_WINDOW_MS`: Time window in ms (default: `60000` / 1 minute).
  - `WEBHOOK_RATE_LIMIT_MAX_REQUESTS`: Max requests per window per IP (default: `100`).
- Startup assertion: Warn or fail fast if `WHATSAPP_WEBHOOK_SECRET` is missing in non-test environments.

#### Expected Result
Secure access to validated webhook configuration constants throughout the backend application.

---

### Subtask 2.2 — Dual Authentication Middleware (`Bearer Token` & `HMAC-SHA256`)

#### Objective
Provide a unified Express/API middleware `validateWebhookAuth` that inspects incoming HTTP headers and authenticates requests using either Bearer token or HMAC signature.

#### Implementation Details
- **File Location**: `backend/middlewares/webhookAuth.js` (or `backend/utils/webhookAuth.js`).
- Logic:
  1. Extract `Authorization` header (`Bearer <token>`).
  2. Extract signature headers: `X-Hub-Signature-256` or `X-Signature` (`sha256=<hash>` or raw hex).
  3. If Bearer header is present and matches `WHATSAPP_WEBHOOK_SECRET`, allow request.
  4. Else if HMAC header is present, compute HMAC-SHA256 of raw request body using `WHATSAPP_WEBHOOK_SECRET` and compare against provided signature.
  5. If neither matches or headers are missing, abort request with HTTP 401.

#### Expected Result
Authorized requests from n8n succeed seamlessly whether configured with Bearer headers or HMAC cryptographic signatures.

---

### Subtask 2.3 — Constant-Time Signature Validation Engine

#### Objective
Prevent side-channel timing attacks by performing cryptographic comparisons using constant-time algorithms.

#### Implementation Details
- **File Location**: `backend/utils/cryptoUtils.js`.
- Use Node.js `crypto.timingSafeEqual(bufferA, bufferB)` for string/hash comparisons.
- Ensure length-matching buffers before executing `timingSafeEqual` to avoid length leakage errors.
- Support both raw body buffer and serialized JSON body verification.

#### Expected Result
Zero timing vulnerability when validating signatures against attackers attempting character-by-character brute force.

---

### Subtask 2.4 — Adaptive Rate Limiting Middleware for n8n Traffic

#### Objective
Prevent denial-of-service (DDoS) and payload flooding while accommodating high-burst traffic from n8n batch execution.

#### Implementation Details
- **File Location**: `backend/middlewares/webhookRateLimiter.js`.
- Configure an in-memory / KV rate limiter:
  - Max 100 requests per minute per remote IP address.
  - Return HTTP 429 (`Too Many Requests`) with headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.
  - Provide a whitelist option for trusted n8n server IP addresses or localhost during development.

#### Expected Result
Burst traffic up to 100 req/min processes without throttling; abusive or looping scripts are stopped with HTTP 429.

---

### Subtask 2.5 — Security Audit Failure Logger & Error Handler

#### Objective
Ensure all authentication failures, signature mismatches, and rate limit rejections are recorded in `webhook_logs` for forensic review.

#### Implementation Details
- **File Location**: `backend/middlewares/webhookAuth.js`.
- When an unauthorized or rate-limited request is rejected:
  - Generate a log entry in `webhook_logs` with `status: 'error'`, `error_message: 'Authentication failed: Invalid secret or signature'`, `processing_time_ms`, and sanitized headers.
  - Return clean JSON response: `{ "success": false, "error": "Unauthorized access" }` (HTTP 401) or `{ "success": false, "error": "Rate limit exceeded" }` (HTTP 429).

#### Expected Result
Admin and security teams have complete visibility into unauthorized access attempts without exposing internal server errors to clients.

---

## 5. Edge Cases & Handling
- **Missing or Empty Authorization Header**: Return 401 with standard JSON error response, do not crash on undefined string operations.
- **Malformed Signature Prefix**: Handle signatures with or without `sha256=` prefix gracefully.
- **Raw Body vs Parsed JSON in HMAC**: Ensure the HMAC calculation uses the raw received buffer so that whitespace or key ordering differences in JSON parsing do not invalidate genuine signatures.
- **Proxied IP Addresses**: Read client IP from `x-forwarded-for` / `cf-connecting-ip` headers when running behind Cloudflare or reverse proxies.

---

## 6. Regression Requirements
- Existing admin API authentication (JWT / Session) on `/api/*` routes must remain completely untouched.
- The webhook security middleware must strictly apply only to `/api/webhook/*` routes.

---

## 7. Acceptance Criteria

- [ ] Valid Bearer token in `Authorization` header is accepted (HTTP 200).
- [ ] Valid HMAC-SHA256 in `X-Hub-Signature-256` or `X-Signature` is accepted (HTTP 200).
- [ ] Invalid token or signature returns HTTP 401 with structured JSON error.
- [ ] Constant-time comparison is utilized for all token/signature checks.
- [ ] Exceeding 100 requests/minute triggers HTTP 429 rate limit.
- [ ] Failed auth attempts are recorded in `webhook_logs`.
