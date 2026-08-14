# Task 2: Program Pricing by Country

## Objective
Implement multi-country program pricing with specific prices for Egypt, Saudi Arabia, Oman, Libya, and a USD fallback price for all other countries. Prices must be configurable and associated with customers based on their country.

## Context
The El Kayan program has different subscription prices per country. The system needs to store and manage these prices, apply the correct price based on customer's country, and allow administrators to update prices. This pricing is used for payment calculations, invoicing, and the "payment from program account" feature.

## Requirements
### Functional Requirements
1. **Country-Specific Prices**: Separate price fields for:
   - Egypt (EGP)
   - Saudi Arabia (SAR)
   - Oman (OMR)
   - Libya (LYD)
2. **USD Fallback Price**: Single USD price field for all other countries
3. **Price Management**: Admin interface to view and update all prices
4. **Automatic Price Application**: When viewing/processing a customer, show the correct price based on their country
5. **Currency Display**: Show prices in correct currency format per country

### Technical Requirements
- Database table/model for `program_prices` with one row (singleton) or key-value pairs
- Fields: `egypt_price`, `saudi_arabia_price`, `oman_price`, `libya_price`, `usd_fallback_price`
- All prices stored as decimal (e.g., `decimal(10,2)`) or integer (smallest currency unit)
- Currency codes: EGP, SAR, OMR, LYD, USD
- API endpoint to get all prices (public or admin)
- API endpoint to update prices (admin only)
- Frontend price display utility: `getPriceForCountry(country): { amount, currency }`
- Integration with customer country field (Task 1)

## Sub-tasks

### Sub-task 2.1: Database Schema for Program Prices
- Create `program_prices` table (single row, singleton pattern):
  - `id` (integer, primary key, default 1)
  - `egypt_price` (decimal, default 0)
  - `saudi_arabia_price` (decimal, default 0)
  - `oman_price` (decimal, default 0)
  - `libya_price` (decimal, default 0)
  - `usd_fallback_price` (decimal, default 0)
  - `updated_at` (timestamp)
- Or use key-value `settings` table with keys: `price_egypt`, `price_saudi`, `price_oman`, `price_libya`, `price_usd`
- Seed with default values (0 or reasonable defaults)

### Sub-task 2.2: Price Management API
- `GET /api/settings/prices` - Get all program prices (public)
- `PUT /api/admin/settings/prices` - Update prices (admin only, validate all fields)
- Response format:
  ```json
  {
    "egypt": { "amount": 500, "currency": "EGP" },
    "saudi_arabia": { "amount": 100, "currency": "SAR" },
    "oman": { "amount": 10, "currency": "OMR" },
    "libya": { "amount": 200, "currency": "LYD" },
    "usd_fallback": { "amount": 25, "currency": "USD" }
  }
  ```

### Sub-task 2.3: Price Utility Functions
- Backend: `getPriceForCountry(country: string): { amount: number, currency: string }`
- Frontend: Mirror utility in `frontend/src/utils/pricing.ts`
- Mapping:
  - `egypt` → egypt_price + EGP
  - `saudi_arabia` → saudi_arabia_price + SAR
  - `oman` → oman_price + OMR
  - `libya` → libya_price + LYD
  - `other` / default → usd_fallback_price + USD

### Sub-task 2.4: Admin Price Settings Page (Frontend)
- Page: `/admin/pricing` (protected, admin only)
- Form with 5 price fields, each with currency label
- Input validation: positive numbers, 2 decimal places max
- Save button with loading state
- Success/error toast notifications
- Display current prices in a summary table

### Sub-task 2.5: Price Display in Customer Context (Frontend)
- In Customer Detail view (Task 1.6): Show "Program Price: 500 EGP" based on customer's country
- In Customer List/Card: Optional price badge
- Format currency correctly (EGP 500.00, SAR 100.00, etc.)
- Handle "Other" country → show USD price

## Files / Areas to Modify
### Backend
- `backend/src/models/ProgramPrice.ts` or `Settings.ts`
- `backend/src/controllers/priceController.ts`
- `backend/src/routes/priceRoutes.ts`
- `backend/src/utils/pricing.ts`
- Database migration for `program_prices` or `settings` table

### Frontend
- `frontend/src/pages/admin/PricingSettings.tsx`
- `frontend/src/utils/pricing.ts`
- `frontend/src/services/settingsApi.ts`
- `frontend/src/components/PriceDisplay.tsx` (reusable)
- Update `CustomerDetail.tsx` and `CustomerCard.tsx` to use price display

## Dependencies
- **Task 1 (Customer Core Management)**: Requires `customer.country` field
- Must be completed before Task 3 (Payment System) and Task 6 (WhatsApp Integration)

## Edge Cases
- Price not set for a country (default to 0 or USD fallback)
- Customer country is "other" → use USD fallback
- Currency formatting for different locales (Arabic numbers vs Western)
- Price updates affecting existing customers (should not retroactively change recorded payments)
- Admin entering invalid prices (negative, non-numeric, too many decimals)

## Rules / Constraints
- **Do NOT** hardcode prices in frontend or backend code
- **Do NOT** allow price updates without admin authentication
- Prices must be stored in database, not config files
- Single source of truth for prices (one table/row)
- USD fallback applies to ANY country not in the 4 specific ones
- Currency codes must be ISO 4217 standard

## Acceptance Criteria
1. ✅ Admin can view all 5 prices on `/admin/pricing`
2. ✅ Admin can update any price and see it persisted
3. ✅ `GET /api/settings/prices` returns correct structure with all 5 prices
4. ✅ `getPriceForCountry('egypt')` returns EGP price
5. ✅ `getPriceForCountry('saudi_arabia')` returns SAR price
6. ✅ `getPriceForCountry('oman')` returns OMR price
7. ✅ `getPriceForCountry('libya')` returns LYD price
7. ✅ `getPriceForCountry('france')` returns USD fallback price
8. ✅ Customer Detail shows correct price for customer's country
9. ✅ Currency formatting displays correctly (symbol, decimals, RTL for Arabic)

## Testing
### Unit Tests
- `getPriceForCountry` for all 4 specific countries + "other"
- Price validation (positive, decimals)
- Currency formatting for each currency

### Integration Tests
- Admin price update API (auth, validation, persistence)
- Public price fetch API
- Price display in customer context

### Frontend Tests
- Pricing settings form validation
- Price display component with various countries
- RTL currency formatting

## Final Verification
1. Run all tests
2. Manual verification:
   - Set prices: Egypt=500, Saudi=100, Oman=10, Libya=200, USD=25
   - Create customers in each country (Task 1)
   - Verify Customer Detail shows correct price/currency for each
   - Change Egypt price to 600 → verify Customer Detail updates
   - Test "Other" country customer shows USD price
   - Verify Arabic number formatting in RTL mode