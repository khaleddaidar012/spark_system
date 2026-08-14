# Task 1: Customer Core Management

## Objective
Implement the core customer management functionality including customer creation, editing, and listing with specific field requirements: WhatsApp number and country as mandatory fields, optional Arabic/English names, and automatic country detection from phone number.

## Context
The El Kayan system is a customer management platform for a subscription-based program. Customers are primarily identified by their WhatsApp number and country. The system must support Arabic and English interfaces. This task establishes the foundational customer data model and CRUD operations.

## Requirements
### Functional Requirements
1. **Mandatory Fields**: WhatsApp number and Country are required to create a customer
2. **Optional Fields**: Customer name in Arabic and English are optional - customer can be saved without them
3. **Country Detection**: Automatically detect customer's country from phone number prefix
4. **Customer Listing**: Display customers in cards with key information
5. **Customer Creation/Editing**: Forms for adding and modifying customer data

### Technical Requirements
- WhatsApp number field with validation (must be valid phone format)
- Country field with dropdown/select (Egypt, Saudi Arabia, Oman, Libya, Others)
- Auto-detection logic for country based on phone prefix:
  - Egypt: +20
  - Saudi Arabia: +966
  - Oman: +968
  - Libya: +218
- Arabic and English name fields (optional, nullable in database)
- Unique constraint on WhatsApp number per country (or globally)
- Proper indexing on WhatsApp number and country for fast lookups

## Sub-tasks

### Sub-task 1.1: Database Schema for Customers
- Create `customers` table with columns:
  - `id` (UUID, primary key)
  - `whatsapp_number` (string, unique, indexed, required)
  - `country` (string, required, enum: egypt, saudi_arabia, oman, libya, other)
  - `name_ar` (string, nullable)
  - `name_en` (string, nullable)
  - `created_at`, `updated_at` (timestamps)
- Add indexes on `whatsapp_number` and `country`

### Sub-task 1.2: Country Detection Utility
- Create utility function `detectCountryFromPhone(phoneNumber: string): Country`
- Implement prefix matching for: +20 (Egypt), +966 (Saudi), +968 (Oman), +218 (Libya)
- Default to "other" for unrecognized prefixes
- Handle various phone formats (+20, 0020, 0 prefix for local)
- Add unit tests for all supported countries and edge cases

### Sub-task 1.3: Customer API Endpoints
- `POST /api/customers` - Create customer (validate required fields, auto-detect country if not provided)
- `GET /api/customers` - List customers with pagination, search, and filters
- `GET /api/customers/:id` - Get single customer details
- `PUT /api/customers/:id` - Update customer (allow partial updates)
- `DELETE /api/customers/:id` - Delete customer (soft delete preferred)

### Sub-task 1.4: Customer Creation/Edit Form (Frontend)
- Build form with fields: WhatsApp Number (required), Country (required, auto-filled on phone input), Name AR (optional), Name EN (optional)
- Real-time country detection as user types phone number
- Visual indicator when country is auto-detected vs manually selected
- Validation: WhatsApp number format, required fields
- Submit handling with loading states and error display
- Support both create and edit modes

### Sub-task 1.5: Customer List/Cards View (Frontend)
- Display customers in card layout
- Each card shows: WhatsApp number, Country, Name AR/EN (if available), Status badge
- Search/filter by WhatsApp number, name, country
- Pagination or infinite scroll
- Click card to navigate to customer detail view

### Sub-task 1.6: Customer Detail View (Frontend)
- Full customer information display
- Edit button to navigate to edit form
- Sections for: Payments, Communications, Messages (placeholders for future tasks)
- Responsive design for mobile/desktop

## Files / Areas to Modify
### Backend
- `backend/src/models/Customer.ts` (or equivalent)
- `backend/src/controllers/customerController.ts`
- `backend/src/routes/customerRoutes.ts`
- `backend/src/utils/countryDetection.ts`
- `backend/src/validators/customerValidator.ts`
- Database migration file for `customers` table

### Frontend
- `frontend/src/pages/CustomersList.tsx`
- `frontend/src/pages/CustomerForm.tsx`
- `frontend/src/pages/CustomerDetail.tsx`
- `frontend/src/components/CustomerCard.tsx`
- `frontend/src/services/customerApi.ts`
- `frontend/src/utils/countryDetection.ts` (mirror of backend logic)

## Dependencies
- None (this is the foundational task)
- Must be completed before Tasks 2, 3, 4, 5, 6

## Edge Cases
- Phone numbers with different formats: +2010..., 002010..., 010... (Egypt local)
- Duplicate WhatsApp number handling (show existing customer or error)
- Country detection fails → default to "Other" with manual override
- Very long names (set reasonable max length, e.g., 100 chars)
- RTL/LTR text handling for Arabic/English names
- Customers from unsupported countries → "Other" with manual price handling (Task 2)

## Rules / Constraints
- **Do NOT** make name fields required at any level (database, API, frontend)
- **Do NOT** allow customer creation without WhatsApp number and country
- WhatsApp number must be unique (per country or globally - decide based on business logic)
- Country detection must not override manual country selection
- All user-facing text must support Arabic (RTL) and English (LTR)

## Acceptance Criteria
1. ✅ Can create customer with only WhatsApp number + Country (auto-detected or manual)
2. ✅ Can create customer with WhatsApp + Country + Name AR + Name EN
3. ✅ Cannot create customer without WhatsApp number
4. ✅ Cannot create customer without Country
4. ✅ Country auto-detects correctly for +20, +966, +968, +218 prefixes
5. ✅ Customer list displays all customers with key info
6. ✅ Customer edit allows partial updates (e.g., only update name)
7. ✅ Search works by WhatsApp number, name (AR/EN), country
8. ✅ Arabic and English names display correctly in RTL/LTR

## Testing
### Unit Tests
- Country detection utility: all supported prefixes, edge cases (spaces, dashes, 00 vs +)
- Customer validation: required fields, optional fields, phone format
- Duplicate WhatsApp handling

### Integration Tests
- Full CRUD cycle via API
- Create → Read → Update → Delete
- Search and filter endpoints

### Frontend Tests
- Form validation messages
- Country auto-detection on phone input
- Card display with/without optional names
- RTL layout for Arabic content

## Final Verification
1. Run backend tests: `npm test` (or equivalent)
2. Run frontend tests: `npm test`
3. Manual verification:
   - Create 5 test customers: 2 with only required fields, 3 with all fields
   - Test phone numbers from each supported country
   - Verify country auto-detection works in form
   - Verify list view shows all customers correctly
   - Verify edit form preserves existing data
   - Test Arabic name rendering in RTL