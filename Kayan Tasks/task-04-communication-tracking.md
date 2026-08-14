# Task 4: Communication Tracking

## Objective
Implement comprehensive communication tracking for each customer including: editable communication counter (increments on WhatsApp click, manually adjustable), communication history with dates and types, and a message slider showing last customer/employee messages with unlimited history scrollable in customer card.

## Context
Sales/communication team needs to track all interactions with customers. Each communication increments a counter (manually adjustable), has a date, a type (call, WhatsApp, meeting, etc.), and the last messages are displayed in a slider on the customer card for quick context.

## Requirements
### Functional Requirements
1. **Communication Counter**: Editable number per customer, auto-increments when WhatsApp button clicked, manually adjustable
2. **Communication History**: Log each communication with date, type, notes
3. **Communication Types**: Predefined types (WhatsApp, Phone Call, Meeting, Email, Other) + custom types in settings
4. **Message Slider**: In customer card, show last 2 messages (customer + employee) in slider; unlimited history scrollable in detail view
5. **WhatsApp Button Integration**: Clicking WhatsApp icon increments counter and opens WhatsApp

### Technical Requirements
- `communications` table: `id`, `customer_id`, `type_id`, `date`, `notes`, `created_by`, `created_at`
- `communication_types` table: `id`, `name`, `icon`, `is_system`, `sort_order` (system types non-deletable)
- `customers` table: add `communication_count` (integer, default 0), `last_communication_date` (nullable)
- `customer_messages` table: `id`, `customer_id`, `sender_type` (enum: 'customer', 'employee'), `content`, `created_by`, `created_at`
- Counter increment: API endpoint `POST /api/customers/:id/increment-communication` or via WhatsApp click handler
- Message slider: Last 2 messages (1 customer, 1 employee) in card; full list in detail with pagination

## Sub-tasks

### Sub-task 4.1: Database Schema for Communications
- `communication_types` table:
  - `id`, `name` (WhatsApp, Phone Call, Meeting, Email, Other), `icon` (emoji or icon name), `is_system` (boolean), `sort_order`
  - Seed 5 system types (is_system=true)
- `communications` table:
  - `id`, `customer_id` (FK), `type_id` (FK), `communication_date` (date), `notes` (text), `created_by` (FK), `created_at`
- `customer_messages` table:
  - `id`, `customer_id` (FK), `sender_type` (enum: 'customer', 'employee'), `content` (text), `created_by` (FK), `created_at`
- Add to `customers` table:
  - `communication_count` (integer, default 0)
  - `last_communication_date` (date, nullable)

### Sub-task 4.2: Communication Types Management API
- `GET /api/communication-types` - List all active types
- `POST /api/admin/communication-types` - Create custom type (admin)
- `PUT /api/admin/communication-types/:id` - Update custom type (admin, not system)
- `DELETE /api/admin/communication-types/:id` - Delete custom type (admin, not system)

### Sub-task 4.3: Communication Logging API
- `POST /api/customers/:customerId/communications` - Log communication
  - Body: `type_id`, `communication_date` (default now), `notes`
  - Auto-increments `customer.communication_count`
  - Updates `customer.last_communication_date`
- `GET /api/customers/:customerId/communications` - List communications (paginated, filter by type/date)
- `GET /api/customers/:customerId/communications/stats` - Get count, last date, breakdown by type

### Sub-task 4.4: Message Management API
- `POST /api/customers/:customerId/messages` - Add message
  - Body: `sender_type` ('customer' | 'employee'), `content`
- `GET /api/customers/:customerId/messages` - List messages (paginated, newest first)
- `GET /api/customers/:customerId/messages/latest` - Get latest 1 customer + 1 employee message (for slider)

### Sub-task 4.5: Counter Increment & WhatsApp Integration (Frontend)
- WhatsApp button in Customer Card and Detail:
  - Click → increment counter via API → open `https://wa.me/<number>`
  - Visual feedback: counter animates +1
- Manual counter edit: Inline editable number in Customer Detail (click to edit, Enter to save)
- Counter sync: Real-time or refetch after increment

### Sub-task 4.6: Communication History UI (Frontend)
- In Customer Detail: Communication log section
- List: Date, Type (icon + name), Notes, Created by
- Add Communication button → modal: Type (dropdown), Date (default today), Notes
- Filter by type, date range
- Empty state: "No communications yet"

### Sub-task 4.7: Message Slider Component (Frontend)
- **Customer Card (List View)**: Compact slider showing last 2 messages max
  - Format: `Customer: "Last msg..."` / `Employee: "Last msg..."`
  - Truncate long messages (50 chars + "...")
  - Arrow navigation if more messages exist
- **Customer Detail View**: Full message history
  - Chat-like layout: Customer messages right (green), Employee left (gray)
  - Infinite scroll / pagination
  - Add Message button → modal: Sender type (radio), Content (textarea)
  - Auto-scroll to bottom on new message

### Sub-task 4.8: Communication Types Admin Page (Frontend)
- Page: `/admin/communication-types`
- Table: Name, Icon, System (badge), Sort Order, Actions
- Add/Edit modal for custom types
- System types: read-only (icon, name editable? no - fixed)
- Drag to reorder

## Files / Areas to Modify
### Backend
- `backend/src/models/Communication.ts`, `CommunicationType.ts`, `CustomerMessage.ts`
- `backend/src/controllers/communicationController.ts`, `messageController.ts`, `communicationTypeController.ts`
- `backend/src/routes/communicationRoutes.ts`, `messageRoutes.ts`, `communicationTypeRoutes.ts`
- Database migrations for new tables + `customers` columns

### Frontend
- `frontend/src/components/CommunicationCounter.tsx`
- `frontend/src/components/CommunicationLog.tsx`
- `frontend/src/components/MessageSlider.tsx` (card version)
- `frontend/src/components/MessageHistory.tsx` (detail version)
- `frontend/src/components/AddCommunicationModal.tsx`
- `frontend/src/components/AddMessageModal.tsx`
- `frontend/src/pages/admin/CommunicationTypesSettings.tsx`
- `frontend/src/services/communicationApi.ts`, `messageApi.ts`
- Update `CustomerCard.tsx`, `CustomerDetail.tsx`

## Dependencies
- **Task 1 (Customer Core)**: Requires `customers` table, WhatsApp number for wa.me link
- Should be completed before Task 5 (Customer Status) and Task 6 (WhatsApp Integration)

## Edge Cases
- Counter manually set to negative → prevent (min 0)
- WhatsApp click without API success → don't open wa.me? Or open anyway? → Open anyway, queue increment
- Very long messages → truncate in slider, full in detail
- No messages yet → slider shows "No messages"
- Communication type deleted → keep in history, show "Deleted Type" or preserve name
- Concurrent counter increments → use atomic DB increment
- Message sender_type validation (only 'customer' or 'employee')

## Rules / Constraints
- **Do NOT** allow deletion of system communication types
- **Do NOT** allow counter to go negative
- WhatsApp button must open `wa.me` link in new tab
- Counter increment must be atomic (DB level)
- Message slider in card: max 2 messages (1 per sender type ideally)
- All dates stored in UTC, displayed in user timezone
- Communication date defaults to today, but editable for backdating

## Acceptance Criteria
1. ✅ Customer card shows communication counter (editable inline)
2. ✅ Clicking WhatsApp button increments counter + opens wa.me
3. ✅ Communication log: add/view/filter communications with date, type, notes
4. ✅ Communication types: 5 system types + custom types manageable in admin
5. ✅ Message slider in customer card shows last 2 messages (truncated)
6. ✅ Message history in detail shows full chat-style list with pagination
7. ✅ Can add messages as Customer or Employee
8. ✅ Customer Detail shows `last_communication_date` and total count
9. ✅ Stats API returns count, last date, breakdown by type

## Testing
### Unit Tests
- Counter atomic increment
- Message slider logic (last 1 customer + 1 employee)
- Communication type validation (system vs custom)
- Date handling (timezone)

### Integration Tests
- Communication CRUD + counter update
- Message CRUD + latest query
- WhatsApp click → counter increment + redirect

### Frontend Tests
- Counter inline edit
- WhatsApp button click handler
- Message slider truncation/navigation
- Chat layout in detail (customer right, employee left)
- Communication log filters

## Final Verification
1. Run all tests
2. Manual verification:
   - Create customer, verify counter = 0
   - Click WhatsApp button 3 times → counter = 3
   - Manually edit counter to 10 → save → verify
   - Add 3 communications of different types
   - Add 5 messages (3 customer, 2 employee)
   - Verify card slider shows last 1 of each
   - Verify detail shows all 5 in chat layout
   - Add custom communication type in admin
   - Use custom type in communication log