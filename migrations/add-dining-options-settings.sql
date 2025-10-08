-- Add dining options configuration to business settings
-- This allows businesses to configure which dining options they support

-- Update cart table to support pickup option
ALTER TABLE public.cart 
DROP CONSTRAINT IF EXISTS cart_dining_option_check;

ALTER TABLE public.cart 
ADD CONSTRAINT cart_dining_option_check 
CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]));

-- Update orders table to support pickup option
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_dining_option_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_dining_option_check 
CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]));

-- Add dining options configuration to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS enabled_dining_options jsonb DEFAULT '["indoor", "delivery", "pickup"]'::jsonb,
ADD COLUMN IF NOT EXISTS default_takeaway_pack_price integer DEFAULT 100;

-- Add comments for documentation
COMMENT ON COLUMN public.business_settings.enabled_dining_options IS 'Array of enabled dining options: indoor, delivery, pickup';
COMMENT ON COLUMN public.business_settings.default_takeaway_pack_price IS 'Default price for takeaway packs in kobo/cents';

-- Update existing business_settings records to have default dining options
UPDATE public.business_settings 
SET enabled_dining_options = '["indoor", "delivery", "pickup"]'::jsonb 
WHERE enabled_dining_options IS NULL;