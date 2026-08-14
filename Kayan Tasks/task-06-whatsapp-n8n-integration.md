# Task 6: WhatsApp Meta Business → n8n Integration

## Objective
Build the infrastructure to receive incoming WhatsApp messages via Meta Business webhook → n8n → parse message format → auto-create or update customer in El Kayan system. Message format: "Name | Phone | Program | Status".

## Context
The system integrates with WhatsApp Business API through Meta. Incoming messages are routed to n8n (workflow automation), which calls El Kayan's webhook endpoint. The webhook parses structured messages to automatically manage customers: create new ones or update existing ones based on phone number.

## Requirements
### Functional Requirements
1. **Webhook Endpoint**: Secure endpoint to receive parsed data from n8n
2. **Message Parsing**: Parse format: `"Name | Phone | Program | Status"`
   - Example: `"خالد هشام | 01092919124 | برنامج المعلين | مشترك"`
3. **Auto-Create Customer**: If phone not found → create customer with parsed data
4. **Auto-Update Customer**: If phone exists → update status, name, program info
5. **Country Detection**: Use phone prefix to set country (Task 1 logic)
6. **Status Mapping**: Map "مشترك" → "Subscribed", "مهتم" → "Interested", etc.
7. **Program Tracking**: Store program name on customer (new field)
8. **Webhook Security**: Verify signature/token from n8n
9. **Logging**: Log all webhook calls for debugging

### Technical Requirements
- `webhook_logs` table: `id`, `payload` (json), `status` (success/error), `error_message`, `customer_id` (nullable), `created_at`
- Add `program_name` to `customers` table (string, nullable)
- Webhook endpoint: `POST /api/webhook/whatsapp` (or `/api/webhook/n8n`)
- Authentication: Bearer token or HMAC signature verification
- Idempotency: Handle duplicate webhook calls gracefully
- Response: `{ success: true, customer_id, action: 'created' | 'updated' | 'no_change' }`
- Rate limiting: Allow burst from n8n

## Sub-tasks

### Sub-task 6.1: Database Schema Updates
- Add `program_name` column to `customers` (string, nullable)
- Add `source` column to `customers` (enum: 'manual', 'whatsapp_webhook', default 'manual')
- Create `webhook_logs` table:
  - `id`, `source` ('n8n'), `payload` (jsonb), `status` (enum: 'success', 'error'), `error_message` (text), `customer_id` (FK, nullable), `processing_time_ms`, `created_at`
- Index on `webhook_logs.created_at`, `customer_id`

### Sub-task 6.2: Message Parsing Utility
- Create `parseWhatsAppMessage(text: string): ParsedMessage | null`
- Expected format: `"Name | Phone | Program | Status"`
- Delimiter: `|` (pipe) with optional spaces
- Fields:
  - `name`: Full name (Arabic/English)
  - `phone`: Phone number (clean: digits only, detect country)
  - `program`: Program name
  - `status_text`: Status in Arabic (e.g., "مشترك", "مهتم", "غير مهتم", "ملغي")
- Return null if format invalid (log error)
- Status mapping:
  - "مشترك" → "Subscribed"
  - "مهتم" → "Interested"
  - "غير مهتم" → "Not Interested"
  - "ملغي" → "Cancelled"
  - Default → "New"

### Sub-task 6.3: Webhook Endpoint Implementation
- `POST /api/webhook/whatsapp`
- Headers: `Authorization: Bearer <WEBHOOK_SECRET>` or `X-Signature: <HMAC>`
- Body: `{ "message": "خالد هشام | 01092919124 | برنامج المعلين | مشترك", "meta": { "message_id", "timestamp", "from" } }`
- Processing:
  1. Verify auth
  2. Parse message
  3. Detect country from phone
  4. Find customer by whatsapp_number + country
  5. If not found → create (name_ar=name, program_name=program, status=mapped, source='whatsapp_webhook')
  6. If found → update (name_ar if empty, program_name, status, last_communication_date=now)
  7. Log to `webhook_logs`
  8. Return response
- Error handling: Invalid format → 400, Auth fail → 401, Server error → 500 (n8n will retry)

### Sub-task 6.4: Webhook Security
- Environment variable: `WHATSAPP_WEBHOOK_SECRET`
- Option A: Bearer token check (`Authorization: Bearer <secret>`)
- Option B: HMAC-SHA256 signature (Meta/n8n sends `X-Hub-Signature-256`)
- Implement both, configurable
- Rate limiting: 100 req/min per IP (generous for n8n)

### Sub-task 6.5: Webhook Logs Admin Page (Frontend)
- Page: `/admin/webhook-logs`
- Table: Date, Status (badge), Customer (link), Action (Created/Updated/Error), Processing Time
- Filter by: Status, Date range, Customer
- Click row → Modal with full payload (JSON formatted) + error details
- "Reprocess" button for failed logs (re-send to handler)

### Sub-task 6.6: n8n Workflow Documentation
- Create `docs/n8n-workflow.md` with:
  - Webhook URL configuration
  - Required headers
  - Expected JSON payload structure
  - Message parsing logic (for reference)
  - Testing instructions
  - Troubleshooting common issues

### Sub-task 6.7: Testing Endpoint (Development)
- `POST /api/dev/webhook-test` (dev only, no auth)
- Accepts same payload for manual testing
- Returns detailed processing steps

## Files / Areas to Modify
### Backend
- `backend/src/controllers/webhookController.ts`
- `backend/src/routes/webhookRoutes.ts`
- `backend/src/utils/messageParser.ts`
- `backend/src/utils/webhookAuth.ts`
- `backend/src/models/WebhookLog.ts`
- Database migrations for `customers` columns + `webhook_logs`

### Frontend
- `frontend/src/pages/admin/WebhookLogs.tsx`
- `frontend/src/services/webhookApi.ts`
- Update `Customer` type to include `program_name`, `source`

### Documentation
- `docs/n8n-workflow.md`

## Dependencies
- **Task 1 (Customer Core)**: Requires customer CRUD, country detection
- **Task 2 (Pricing)**: Country detection for pricing
- **Task 5 (Customer Status)**: Status mapping uses status system
- Independent of Tasks 3, 4

## Edge Cases
- Message format variations: extra spaces, missing fields, extra fields
- Phone number formats: +20, 0020, 010... → normalize
- Customer exists with different name → update name_ar if was empty, else keep existing
- Status text not in mapping → default to "New", log warning
- Duplicate webhook calls (n8n retry) → idempotent (same customer, same data = no_change)
- Webhook called before customer created manually → merge on phone match
- Program name changes → update customer.program_name
- Arabic/English name in message → store in name_ar (or detect script)

## Rules / Constraints
- **Do NOT** expose webhook endpoint without authentication
- **Do NOT** create duplicate customers for same phone+country (unique constraint)
- **Do NOT** overwrite existing customer name_ar if already set (unless admin override)
- Webhook must respond < 5 seconds (n8n timeout)
- All webhook calls logged (success + error)
- Failed webhooks visible in admin for reprocessing
- Phone number is the primary key for matching (not name)

## Acceptance Criteria
1. ✅ Webhook endpoint accepts POST with valid auth
2. ✅ Parses "Name | Phone | Program | Status" correctly
3. ✅ Creates new customer if phone not found
4. ✅ Updates existing customer if phone found
5. ✅ Maps Arabic statuses to system statuses correctly
6. ✅ Detects country from phone prefix
7. ✅ Stores program_name on customer
7. ✅ Logs all webhook calls with payload and result
8. ✅ Admin page shows webhook logs with reprocess option
9. ✅ Returns `{ success: true, customer_id, action }`
10. ✅ Handles invalid format gracefully (400 + log)

## Testing
### Unit Tests
- `parseWhatsAppMessage`: valid format, extra spaces, missing fields, invalid format
- Status mapping: all Arabic variants → correct system status
- Phone normalization: +20, 0020, 010 → 2010...
- Country detection integration

### Integration Tests
- Webhook endpoint: valid auth → success
- Webhook endpoint: invalid auth → 401
- Create customer via webhook
- Update customer via webhook
- Duplicate webhook → no_change
- Failed webhook logged + reprocess works

### Frontend Tests
- Webhook logs page: list, filter, detail modal, reprocess button

## Final Verification
1. Run all tests
2. Manual verification:
   - Configure n8n (or curl) to call webhook
   - Send: `"أحمد علي | 01012345678 | برنامج المعلين | مشترك"`
   - Verify customer created with: name_ar="أحمد علي", phone=01012345678, country=Egypt, program_name="برنامج المعلين", status="Subscribed"
   - Send again with: `"أحمد علي | 01012345678 | برنامج المعلين | مهتم"`
   - Verify customer updated: status="Interested", program_name updated
   - Check webhook_logs: 2 entries, both success
   - Test invalid format: `"invalid message"` → 400, logged error
   - Test reprocess failed log in admin
   - Verify docs/n8n-workflow.md exists and is accurate