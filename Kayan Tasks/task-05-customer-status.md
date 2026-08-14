# Task 5: Customer Status Management

## Objective
Implement a flexible customer status system with predefined statuses (e.g., "Contacted", "Transferred to Phone") displayed on customer cards, plus the ability for admins to create custom statuses that are available system-wide.

## Context
Sales team needs to track customer lifecycle stages. Each customer has a current status visible on their card and in detail view. The system provides default statuses and allows admins to add organization-specific statuses. Status changes are logged for audit trail.

## Requirements
### Functional Requirements
1. **Predefined Statuses**: System statuses: "New", "Contacted", "Transferred to Phone", "Interested", "Not Interested", "Subscribed", "Cancelled"
2. **Custom Statuses**: Admins can add/edit/delete custom statuses (available to all users)
3. **Status Display**: Badge on customer card (list view) and prominent in customer detail
4. **Status Change**: Inline dropdown on card/detail to change status
5. **Status History**: Log of status changes with date, old status, new status, changed by
6. **Color Coding**: Each status has a color (hex) for badge display

### Technical Requirements
- `customer_statuses` table: `id`, `name`, `color` (hex), `is_system`, `sort_order`, `description`
- `customer_status_history` table: `id`, `customer_id`, `from_status_id` (nullable), `to_status_id`, `changed_by`, `changed_at`, `notes`
- Add `status_id` to `customers` table (FK, nullable, default "New")
- Seed 7 system statuses with colors
- API for status CRUD (admin) and customer status update
- Frontend: Status badge component, inline status selector, history timeline

## Sub-tasks

### Sub-task 5.1: Database Schema for Statuses
- `customer_statuses` table:
  - `id`, `name`, `color` (hex, e.g., '#3B82F6'), `is_system` (boolean), `sort_order`, `description` (nullable)
  - Seed data:
    1. New (#6B7280 - gray)
    2. Contacted (#3B82F6 - blue)
    3. Transferred to Phone (#8B5CF6 - purple)
    4. Interested (#F59E0B - amber)
    5. Not Interested (#EF4444 - red)
    6. Subscribed (#10B981 - green)
    7. Cancelled (#6B7280 - gray)
- `customer_status_history` table:
  - `id`, `customer_id` (FK), `from_status_id` (FK, nullable), `to_status_id` (FK), `changed_by` (FK), `changed_at`, `notes` (nullable)
- Add `status_id` to `customers` (FK, nullable, default: ID of "New")
- Indexes on `customer_id`, `changed_at` in history table

### Sub-task 5.2: Status Management API (Admin)
- `GET /api/customer-statuses` - List all active statuses (sorted)
- `POST /api/admin/customer-statuses` - Create custom status (admin)
  - Body: `name`, `color`, `description`
- `PUT /api/admin/customer-statuses/:id` - Update custom status (admin, not system)
- `DELETE /api/admin/customer-statuses/:id` - Delete custom status (admin, not system, check no customers use it)
- `PUT /api/admin/customer-statuses/reorder` - Bulk update sort_order

### Sub-task 5.3: Customer Status Update API
- `PUT /api/customers/:customerId/status` - Update customer status
  - Body: `status_id`, `notes` (optional)
  - Creates history entry: `from_status_id` (current), `to_status_id` (new), `changed_by` (current user)
  - Updates `customers.status_id`
- `GET /api/customers/:customerId/status-history` - Paginated status history
  - Response: list with from_status, to_status, changed_by_name, changed_at, notes

### Sub-task 5.4: Status Badge Component (Frontend)
- Reusable `<StatusBadge status={status} size="sm|md|lg" />`
- Displays: colored dot + name
- Sizes: sm (card), md (detail header), lg (prominent)
- Tooltip on hover: status description
- RTL support for Arabic status names

### Sub-task 5.5: Inline Status Selector (Frontend)
- In Customer Card: Click badge → dropdown with all statuses → select → API call → update badge
- In Customer Detail: Prominent selector in header
- Loading state during API call
- Optimistic update with rollback on error
- Keyboard accessible (Tab, Enter, Escape)

### Sub-task 5.6: Status History Timeline (Frontend)
- In Customer Detail: "Status History" section
- Vertical timeline: Date → "Status changed from X to Y by User"
- Color-coded dots matching status colors
- Expandable notes
- Pagination for long histories

### Sub-task 5.7: Status Admin Page (Frontend)
- Page: `/admin/customer-statuses`
- Table: Name, Color (swatch), System (badge), Sort Order, Used By Count, Actions
- Add/Edit modal: Name, Color (picker), Description
- System statuses: read-only (name, color, description editable? No - fixed)
- Drag to reorder sort_order
- Delete confirmation with usage count warning

## Files / Areas to Modify
### Backend
- `backend/src/models/CustomerStatus.ts`, `CustomerStatusHistory.ts`
- `backend/src/controllers/customerStatusController.ts`
- `backend/src/routes/customerStatusRoutes.ts`
- Database migrations for new tables + `customers.status_id`

### Frontend
- `frontend/src/components/StatusBadge.tsx`
- `frontend/src/components/StatusSelector.tsx`
- `frontend/src/components/StatusHistoryTimeline.tsx`
- `frontend/src/pages/admin/CustomerStatusesSettings.tsx`
- `frontend/src/services/customerStatusApi.ts`
- Update `CustomerCard.tsx`, `CustomerDetail.tsx`

## Dependencies
- **Task 1 (Customer Core)**: Requires `customers` table
- **Task 4 (Communication Tracking)**: Status "Contacted" relates to communications
- Independent of Tasks 2, 3, 6

## Edge Cases
- Deleting custom status used by customers → prevent or reassign to "New"
- Customer has no status (null) → default to "New" on first load
- Status color contrast (ensure text readable on badge) → auto light/dark text
- Concurrent status changes → last write wins, both logged in history
- Bulk status update (future) → batch history entries
- Arabic status names RTL in dropdown/badge

## Rules / Constraints
- **Do NOT** allow deletion of system statuses (is_system=true)
- **Do NOT** allow status update without creating history entry
- Default status for new customers: "New" (system status)
- Status colors must be valid hex (#RRGGBB)
- History `from_status_id` nullable for first status assignment
- Sort order determines dropdown display order

## Acceptance Criteria
1. ✅ 7 system statuses seeded with correct colors
2. ✅ Admin can create custom statuses with color picker
3. ✅ Customer card shows status badge (clickable → dropdown)
4. ✅ Customer detail shows prominent status selector + history timeline
5. ✅ Status change creates history entry with from/to/by/date/notes
6. ✅ Custom statuses appear in all dropdowns system-wide
7. ✅ System statuses cannot be deleted (UI disabled + API 403)
8. ✅ Status badge colors match defined colors
9. ✅ Arabic status names render RTL in badge and dropdown

## Testing
### Unit Tests
- Status seeding (7 system statuses)
- History entry creation on status change
- Custom status validation (color hex, name unique)
- Prevent system status deletion

### Integration Tests
- Customer status update API + history
- Status list API (sorted by sort_order)
- Custom status CRUD

### Frontend Tests
- StatusBadge renders correct color/name
- StatusSelector dropdown updates customer via API
- StatusHistoryTimeline displays correctly
- Admin page: add/edit/reorder custom statuses

## Final Verification
1. Run all tests
2. Manual verification:
   - Check 7 system statuses exist with colors
   - Create custom status "Follow up Next Week" with orange color
   - Create customer → verify default status "New"
   - Change status to "Contacted" via card badge
   - Change to "Transferred to Phone" via detail selector
   - Verify history shows: New → Contacted → Transferred to Phone
   - Add notes to status change
   - Verify custom status appears in dropdown
   - Try delete system status → blocked
   - Delete custom status (unused) → success
   - Test RTL rendering for Arabic status names