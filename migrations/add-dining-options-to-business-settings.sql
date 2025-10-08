-- Add Dining Options and Takeaway Pack Settings to Business Settings
-- This migration adds new columns to the existing business_settings table

-- Add new columns to existing business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS enabled_dining_options JSONB DEFAULT '["indoor", "delivery", "pickup"]'::jsonb,
ADD COLUMN IF NOT EXISTS default_takeaway_pack_price INTEGER DEFAULT 100;

-- Update existing records to have default values for new columns
UPDATE public.business_settings 
SET 
  enabled_dining_options = COALESCE(enabled_dining_options, '["indoor", "delivery", "pickup"]'::jsonb),
  default_takeaway_pack_price = COALESCE(default_takeaway_pack_price, 100);

-- Add comments for documentation
COMMENT ON COLUMN public.business_settings.enabled_dining_options IS 'Array of enabled dining options: indoor, delivery, pickup';
COMMENT ON COLUMN public.business_settings.default_takeaway_pack_price IS 'Default price for takeaway packs in kobo/cents';

-- Verify the columns were added successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'business_settings' 
        AND column_name = 'enabled_dining_options'
    ) THEN
        RAISE NOTICE 'Column enabled_dining_options added successfully';
    ELSE
        RAISE EXCEPTION 'Failed to add enabled_dining_options column';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'business_settings' 
        AND column_name = 'default_takeaway_pack_price'
    ) THEN
        RAISE NOTICE 'Column default_takeaway_pack_price added successfully';
    ELSE
        RAISE EXCEPTION 'Failed to add default_takeaway_pack_price column';
    END IF;
END $$;