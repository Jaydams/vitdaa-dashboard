# Business Settings API Fix

## Issues Fixed

### 1. React Hydration Error

**Problem**: Select component in StaffFilters was uncontrolled, causing `aria-controls` attribute mismatch between server and client rendering.

**Solution**:

- Added "use client" directive to StaffFilters component
- Made Select component controlled with `value` and `onValueChange` props
- Added proper state management for search term and selected role
- Added reset functionality

### 2. Business Settings API Column Mismatch

**Problem**: API was querying `business_owner_id` column but database table uses `business_id`.

**Solution**:

- Updated `/api/business/settings` to use correct column name `business_id`
- Updated `/api/business/info` to use correct column name `business_id`

### 3. Missing Business Info Fields

**Problem**: Business settings table doesn't contain business name, address, phone, email fields.

**Solution**:

- Updated `/api/business/info` to query `business_owner` table instead of `business_settings`
- Updated `/api/business/settings` to combine data from both `business_settings` and `business_owner` tables
- Added proper handling for JSONB address field
- Added fallback values for missing data

### 4. Missing Business Settings Records

**Problem**: Some business owners didn't have corresponding business settings records.

**Solution**:

- Created SQL migration to insert default business settings for all business owners
- Added proper conflict handling with `ON CONFLICT (business_id) DO NOTHING`

## Files Modified

### API Routes

- `app/api/business/settings/route.ts` - Fixed column name and added business owner data
- `app/api/business/info/route.ts` - Fixed to query correct table and columns

### Components

- `app/(dashboard)/staff/_components/StaffFilters.tsx` - Fixed hydration issue with controlled Select

### Database

- `fix_business_settings_schema.sql` - Ensures all business owners have settings records

## API Response Format

### `/api/business/settings`

Now returns combined data from both tables:

```json
{
  "id": "uuid",
  "business_id": "uuid",
  "vat_rate": 7.5,
  "service_charge_rate": 2.5,
  "enabled_dining_options": ["indoor", "delivery", "pickup"],
  "default_takeaway_pack_price": 100,
  "business_name": "Your Business",
  "business_address": "Street, City, State",
  "business_phone": "+234 000 000 0000",
  "business_email": "business@example.com",
  "currency": "NGN",
  "timezone": "Africa/Lagos",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### `/api/business/info`

Returns business owner information:

```json
{
  "business_name": "Your Business",
  "business_address": "Street, City, State",
  "business_phone": "+234 000 000 0000",
  "business_email": "business@example.com"
}
```

## Testing

After applying these fixes, test the following:

1. **Hydration Error**: Visit `/staff` page - should no longer show hydration errors in console
2. **Business Settings API**: `GET /api/business/settings` should return 200 with proper data
3. **Business Info API**: `GET /api/business/info` should return 200 with business details
4. **Staff Filters**: Search and role filter should work properly with reset functionality

## Database Schema

The fix ensures:

- All business owners have corresponding business settings records
- Proper foreign key relationships are maintained
- Default values are set for new business settings

## Error Handling

Both APIs now handle:

- Missing business settings (returns defaults)
- Missing business owner records (returns defaults)
- JSONB address field parsing
- Proper error responses with status codes
