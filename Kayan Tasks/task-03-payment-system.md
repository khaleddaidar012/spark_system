# Task 3: Payment System

## Objective
Implement comprehensive payment management including: recording payments from program account to customer (no-scroll UI), multiple payment methods with custom method support, payment receipt upload (image/PDF), and filtering customers with outstanding debt.

## Context
The system tracks financial transactions between the program and customers. Payments can be made from the program account to customers (e.g., commissions, refunds). Customers can pay via various methods (Vodafone Cash, etc.) with receipts uploaded as proof. Admins need to filter customers who still owe money.

## Requirements
### Functional Requirements
1. **Program-to-Customer Payment**: Record payments from program account to customer in a compact UI (no scrolling required)
2. **Payment Methods**: Support predefined methods (Vodafone Cash, etc.) per country + custom methods saved in settings
3. **Receipt Upload**: Attach payment receipt as image (JPG/PNG) or PDF
4. **Debt Filter**: Filter customer list to show only customers with outstanding balance
5. **Payment History**: Track all payments per customer with date, amount, method, receipt, notes

### Technical Requirements
- `payments` table: `id`, `customer_id`, `amount`, `currency`, `direction` (program_to_customer, customer_to_program), `method_id`, `receipt_url`, `notes`, `created_by`, `created_at`
- `payment_methods` table: `id`, `name`, `country` (nullable for global), `is_active`, `sort_order`
- Pre-seed: Vodafone Cash (Egypt), STC Pay (Saudi), etc. + "Other" per country
- Admin settings to add/edit/delete payment methods
- File upload for receipts (max 10MB, types: jpg, jpeg, png, pdf)
- Storage: local or S3-compatible
- Compact payment entry UI (inline or modal, no full-page scroll)
- Debt calculation: sum of customer_to_program payments vs program_to_customer payments

## Sub-tasks

### Sub-task 3.1: Database Schema for Payments & Methods
- `payment_methods` table:
  - `id`, `name`, `country` (enum + null for global), `is_active`, `sort_order`, `created_at`
- `payments` table:
  - `id`, `customer_id` (FK), `amount` (decimal), `currency` (char 3), `direction` (enum: 'in', 'out'), `method_id` (FK, nullable), `receipt_url` (nullable), `notes` (text, nullable), `created_by` (user FK), `created_at`
- Indexes on `customer_id`, `created_at`, `direction`
- Seed default payment methods per country

### Sub-task 3.2: Payment Methods Management API
- `GET /api/payment-methods` - List active methods (filter by country optional)
- `POST /api/admin/payment-methods` - Create method (admin)
- `PUT /api/admin/payment-methods/:id` - Update method (admin)
- `DELETE /api/admin/payment-methods/:id` - Deactivate method (admin)
- Admin settings page for managing methods

### Sub-task 3.3: File Upload for Receipts
- `POST /api/upload/receipt` - Upload image/PDF, return URL
- Validation: max 10MB, mime types: image/jpeg, image/png, application/pdf
- Storage: configure local disk or S3
- Generate unique filename, preserve extension
- Cleanup orphaned files on payment deletion

### Sub-task 3.4: Payment CRUD API
- `POST /api/customers/:customerId/payments` - Record payment
  - Body: `amount`, `currency`, `direction`, `method_id`, `receipt_file` (optional), `notes`
- `GET /api/customers/:customerId/payments` - List payments for customer (paginated)
- `GET /api/customers/:customerId/payments/summary` - Get totals: total_in, total_out, balance
- `DELETE /api/payments/:id` - Delete payment (admin, with receipt cleanup)

### Sub-task 3.5: Compact Payment Entry UI (Frontend)
- Inline component or small modal (max height 400px, no scroll)
- Fields: Amount (number), Currency (auto from customer country), Direction (radio: Program→Customer / Customer→Program), Method (dropdown), Receipt (file input), Notes (textarea, 2 lines)
- Save button with loading state
- Keyboard shortcuts: Enter to save, Escape to cancel
- Pre-fill currency based on customer country (Task 2)
- Show method dropdown filtered by customer country + global methods

### Sub-task 3.6: Payment History Display (Frontend)
- In Customer Detail: Payment history table/accordion
- Columns: Date, Direction (badge), Amount, Method, Receipt (icon/link), Notes
- Receipt click → open in new tab (image preview or PDF)
- Expandable rows for long notes
- Summary row: Total In, Total Out, Net Balance

### Sub-task 3.7: Debt Filter (Customers with Outstanding Balance)
- Add "Has Debt" filter to Customer List (Task 1.5)
- Logic: Customer has debt if `SUM(case when direction='in' then amount else 0 end) > SUM(case when direction='out' then amount else 0 end)`
- Or maintain `balance` column on customer updated via trigger/application logic
- Filter options: All, Has Debt, No Debt, Paid in Full
- Visual indicator on customer card: "Outstanding: 500 EGP" (red badge)

### Sub-task 3.8: Payment Methods Admin Page (Frontend)
- Page: `/admin/payment-methods`
- Table with: Name, Country, Active, Sort Order, Actions
- Add/Edit modal: Name, Country (dropdown + "Global"), Active toggle, Sort Order
- Drag-to-reorder sort order (optional)

## Files / Areas to Modify
### Backend
- `backend/src/models/Payment.ts`, `PaymentMethod.ts`
- `backend/src/controllers/paymentController.ts`, `paymentMethodController.ts`
- `backend/src/routes/paymentRoutes.ts`, `paymentMethodRoutes.ts`
- `backend/src/services/fileUpload.ts`
- `backend/src/validators/paymentValidator.ts`
- Database migrations for `payments`, `payment_methods`

### Frontend
- `frontend/src/components/PaymentEntryCompact.tsx`
- `frontend/src/components/PaymentHistory.tsx`
- `frontend/src/components/ReceiptViewer.tsx`
- `frontend/src/pages/admin/PaymentMethodsSettings.tsx`
- `frontend/src/services/paymentApi.ts`
- Update `CustomerDetail.tsx`, `CustomersList.tsx` (debt filter)

## Dependencies
- **Task 1 (Customer Core)**: Requires `customers` table and API
- **Task 2 (Pricing)**: Uses currency from customer country for payment defaults
- Must be completed before Task 6 (WhatsApp Integration) for payment status context

## Edge Cases
- Receipt upload fails after payment created → transaction rollback or cleanup job
- Customer changes country → existing payments keep original currency
- Deleting payment method used by existing payments → soft delete (deactivate only)
- Large receipt files → compression or rejection
- Concurrent payment entries → race condition on balance calculation
- Negative amounts not allowed (use direction instead)
- Currency mismatch: payment currency should match customer country currency

## Rules / Constraints
- **Do NOT** allow payment entry UI to require scrolling (compact design)
- **Do NOT** delete payment methods that have associated payments (deactivate only)
- **Do NOT** store receipt files in database (store paths/URLs only)
- Payment `direction`: 'in' = customer pays program, 'out' = program pays customer
- Debt = total_in - total_out (positive = customer owes)
- All monetary values stored as decimal(12,2) or integer cents
- Receipt URLs must be accessible but not publicly guessable (signed URLs or auth)

## Acceptance Criteria
1. ✅ Admin can manage payment methods (CRUD) with country association
2. ✅ Can record Program→Customer payment in compact UI (no scroll)
3. ✅ Can record Customer→Program payment with receipt upload
4. ✅ Receipt upload accepts JPG, PNG, PDF ≤10MB
5. ✅ Payment history shows all transactions with receipts viewable
6. ✅ Customer Detail shows payment summary (In, Out, Balance)
7. ✅ Customer List has "Has Debt" filter showing only customers with positive balance
8. ✅ Customer cards show "Outstanding: X" badge for debtors
9. ✅ Currency auto-filled from customer country
10. ✅ Payment methods dropdown filtered by customer country + global

## Testing
### Unit Tests
- Debt calculation logic
- Payment validation (amount > 0, valid direction, valid method)
- Receipt file validation
- Currency-country mapping

### Integration Tests
- Full payment CRUD with receipt upload
- Payment method filtering by country
- Debt filter query performance

### Frontend Tests
- Compact payment form: no scroll, keyboard shortcuts
- Receipt preview (image/PDF)
- Debt filter toggle
- Payment method management admin page

## Final Verification
1. Run all tests
2. Manual verification:
   - Add payment methods: Vodafone Cash (Egypt), STC Pay (Saudi), Global "Bank Transfer"
   - Create 3 customers in different countries
   - Record Program→Customer payments for each (compact UI)
   - Record Customer→Program payments with receipts
   - Verify debt filter shows correct customers
   - Verify outstanding badges on cards
   - Test receipt download/preview
   - Test admin payment methods page