# Fixed Dining Options and Takeaway Packs in Vitdaa POS

## Overview

Updated the Vitdaa POS system to support configurable dining options and fixed takeaway pack settings. Businesses can now configure which dining methods they support and set default takeaway pack prices.

## Changes Made

### 1. Database Schema Updates

#### New Business Settings Table

```sql
CREATE TABLE public.business_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  vat_rate numeric(5,2) DEFAULT 7.5,
  service_charge_rate numeric(5,2) DEFAULT 2.5,
  enabled_dining_options jsonb DEFAULT '["indoor", "delivery", "pickup"]'::jsonb,
  default_takeaway_pack_price integer DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_settings_pkey PRIMARY KEY (id),
  CONSTRAINT business_settings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE
);
```

#### Updated Dining Option Constraints

```sql
-- Cart table
dining_option text CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]))

-- Orders table
dining_option text NOT NULL CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]))
```

### 2. Business Settings Actions Updates

#### Enhanced Interfaces

```typescript
export interface BusinessSettings {
  id: string;
  business_id: string;
  vat_rate: number;
  service_charge_rate: number;
  enabled_dining_options: string[];
  default_takeaway_pack_price: number;
  created_at: string;
  updated_at: string;
}
```

#### Default Values

- **Enabled Dining Options**: `["indoor", "delivery", "pickup"]`
- **Default Takeaway Pack Price**: `100` (₦1.00)

### 3. Business Settings Form Enhancements

#### New Form Fields

1. **Dining Options Configuration**

   - Checkboxes for Indoor Dining, Delivery, and Pickup
   - At least one option must be selected
   - Visual labels with proper capitalization

2. **Takeaway Pack Settings**
   - Default takeaway pack price input
   - Currency symbol (₦) display
   - Validation for non-negative values

#### Form Schema Updates

```typescript
const businessSettingsSchema = z.object({
  vat_rate: z.number().min(0).max(100),
  service_charge_rate: z.number().min(0).max(100),
  enabled_dining_options: z
    .array(z.enum(["indoor", "delivery", "pickup"]))
    .min(1, "At least one dining option must be enabled"),
  default_takeaway_pack_price: z
    .number()
    .min(0, "Takeaway pack price must be 0 or greater"),
});
```

### 4. Type System Updates

#### Order Types

```typescript
export type DiningOption = "indoor" | "delivery" | "pickup";
```

### 5. Migration Scripts

#### Files Created

1. `migrations/add-dining-options-settings.sql` - Adds dining options configuration
2. `migrations/business-settings-table.sql` - Updated with new fields
3. `run_dining_options_migration.js` - Migration execution script

## Dining Options Explained

### Indoor Dining

- **Description**: Customers dine at the restaurant
- **Requirements**: Table selection required
- **Use Case**: Traditional restaurant dining experience

### Delivery

- **Description**: Food delivered to customer location
- **Requirements**: Customer address and delivery location required
- **Use Case**: Food delivery service

### Pickup

- **Description**: Customers collect their orders
- **Requirements**: Customer name and phone only
- **Use Case**: Takeaway/pickup orders

## Business Configuration

### Enabling/Disabling Dining Options

Businesses can configure which dining options to offer:

1. **All Options Enabled**: Full-service restaurant

   - Indoor dining with table service
   - Delivery service
   - Pickup/takeaway service

2. **Delivery + Pickup Only**: Cloud kitchen/ghost kitchen

   - No indoor seating
   - Focus on delivery and pickup

3. **Indoor + Pickup Only**: Traditional restaurant without delivery
   - Dine-in service
   - Takeaway service
   - No delivery

### Takeaway Pack Configuration

- **Default Price**: Set business-wide default price
- **Individual Packs**: Can be customized in main settings
- **Currency**: Displayed in Naira (₦)
- **Validation**: Must be non-negative value

## User Experience Improvements

### For Business Owners

1. **Flexible Configuration**: Choose which dining options to offer
2. **Easy Setup**: Default values provided for quick setup
3. **Visual Interface**: Clear checkboxes and labels
4. **Validation**: Prevents invalid configurations

### For Customers

1. **Relevant Options**: Only see dining options the business supports
2. **Simplified Pickup**: Minimal information required for pickup orders
3. **Clear Pricing**: Transparent takeaway pack pricing

## Technical Implementation

### Form Validation

```typescript
// At least one dining option must be enabled
enabled_dining_options: z.array(z.enum(["indoor", "delivery", "pickup"])).min(
  1,
  "At least one dining option must be enabled"
);

// Takeaway pack price validation
default_takeaway_pack_price: z.number().min(
  0,
  "Takeaway pack price must be 0 or greater"
);
```

### Database Constraints

- Foreign key relationships maintained
- JSON validation for dining options array
- Check constraints for valid dining option values
- Unique constraint on business_id in settings table

## Migration Instructions

### Important Note

The `business_settings` table already exists in production. This migration only adds new columns to the existing table.

### Running the Migration

```bash
cd "Vitdaa POS"
node run_simple_dining_migration.js
```

### Manual Migration (if script fails)

Run the following SQL commands in your Supabase SQL editor:

```sql
-- Add new columns to existing business_settings table
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS enabled_dining_options JSONB DEFAULT '["indoor", "delivery", "pickup"]'::jsonb,
ADD COLUMN IF NOT EXISTS default_takeaway_pack_price INTEGER DEFAULT 100;

-- Update existing records with default values
UPDATE public.business_settings
SET
  enabled_dining_options = COALESCE(enabled_dining_options, '["indoor", "delivery", "pickup"]'::jsonb),
  default_takeaway_pack_price = COALESCE(default_takeaway_pack_price, 100);

-- Update dining option constraints
ALTER TABLE public.cart DROP CONSTRAINT IF EXISTS cart_dining_option_check;
ALTER TABLE public.cart ADD CONSTRAINT cart_dining_option_check
CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_dining_option_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_dining_option_check
CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]));
```

## Testing Checklist

### Business Settings

- [ ] Can enable/disable dining options
- [ ] At least one option must be selected
- [ ] Default takeaway pack price can be set
- [ ] Settings save and persist correctly
- [ ] Form validation works properly

### Order Processing

- [ ] Orders can be created with pickup option
- [ ] Dining option constraints work in database
- [ ] Takeaway pack pricing applies correctly
- [ ] Order display shows correct dining option

### Database

- [ ] business_settings table created successfully
- [ ] Foreign key constraints work
- [ ] Default values applied to existing businesses
- [ ] Dining option constraints updated

## Backward Compatibility

- Existing orders with "indoor" and "delivery" remain valid
- Default settings applied to existing businesses
- No breaking changes to existing functionality
- Gradual rollout possible (businesses can keep current options)

## Future Enhancements

1. **Time-based Options**: Enable/disable options by time of day
2. **Capacity Management**: Limit orders based on dining option
3. **Pricing Tiers**: Different pricing for different dining options
4. **Analytics**: Track performance by dining option
