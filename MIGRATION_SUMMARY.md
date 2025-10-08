# Migration Summary: Dining Options and Takeaway Packs

## Current Situation

- The `business_settings` table already exists in production with basic fields:
  - `id`, `business_id`, `vat_rate`, `service_charge_rate`, `created_at`, `updated_at`
- Need to add new fields for dining options configuration

## Migration Approach

Since the table exists, we're adding columns rather than creating a new table.

## Files Created/Modified

### New Migration Files

1. `migrations/add-dining-options-to-business-settings.sql` - Adds new columns safely
2. `run_simple_dining_migration.js` - Simple migration runner
3. `migrations/add-dining-options-settings.sql` - Updates dining option constraints

### Updated Files

1. `actions/business-settings-actions.ts` - Added new fields to interfaces
2. `app/(dashboard)/settings/_components/BusinessSettingsForm.tsx` - Added UI for new settings
3. `types/order.d.ts` - Added pickup to DiningOption type
4. `database.sql` - Updated constraints and documented existing table

## New Database Fields

### business_settings table additions:

```sql
enabled_dining_options JSONB DEFAULT '["indoor", "delivery", "pickup"]'::jsonb
default_takeaway_pack_price INTEGER DEFAULT 100
```

### Updated constraints:

```sql
-- Cart table
dining_option text CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]))

-- Orders table
dining_option text NOT NULL CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]))
```

## Business Settings Form Updates

### New UI Components

1. **Dining Options Checkboxes**

   - Indoor Dining
   - Delivery
   - Pickup
   - Validation: At least one must be selected

2. **Takeaway Pack Price Input**
   - Default price in Naira (₦)
   - Numeric validation
   - Used as fallback for takeaway pack pricing

## Migration Steps

### Recommended Approach

```bash
cd "Vitdaa POS"
node run_simple_dining_migration.js
```

### Manual SQL (if needed)

```sql
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS enabled_dining_options JSONB DEFAULT '["indoor", "delivery", "pickup"]'::jsonb,
ADD COLUMN IF NOT EXISTS default_takeaway_pack_price INTEGER DEFAULT 100;

UPDATE public.business_settings
SET
  enabled_dining_options = COALESCE(enabled_dining_options, '["indoor", "delivery", "pickup"]'::jsonb),
  default_takeaway_pack_price = COALESCE(default_takeaway_pack_price, 100);
```

## Testing Checklist

### After Migration

- [ ] Verify new columns exist in business_settings table
- [ ] Check that existing records have default values
- [ ] Test business settings form loads correctly
- [ ] Verify dining options checkboxes work
- [ ] Test takeaway pack price input
- [ ] Confirm form validation works
- [ ] Test saving settings

### Order Processing

- [ ] Verify pickup option appears in order forms
- [ ] Test creating orders with pickup option
- [ ] Check database constraints allow pickup orders
- [ ] Verify order display shows pickup correctly

## Rollback Plan

If issues occur, the new columns can be removed:

```sql
ALTER TABLE public.business_settings
DROP COLUMN IF EXISTS enabled_dining_options,
DROP COLUMN IF EXISTS default_takeaway_pack_price;
```

## Benefits After Migration

1. **Flexible Dining Options**: Businesses can choose which options to offer
2. **Better UX**: Customers only see relevant dining options
3. **Takeaway Pack Management**: Centralized default pricing
4. **Future-Proof**: Easy to add new dining options
5. **Backward Compatible**: Existing functionality unchanged
