-- Business Settings Table Migration
-- This table stores configurable business settings like VAT and service charge rates

CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  vat_rate DECIMAL(5,2) DEFAULT 7.5,
  service_charge_rate DECIMAL(5,2) DEFAULT 2.5,
  enabled_dining_options JSONB DEFAULT '["indoor", "delivery", "pickup"]'::jsonb,
  default_takeaway_pack_price INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Create index for faster lookups by business_id
CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_settings_updated_at();

-- Insert default settings for existing businesses
INSERT INTO business_settings (business_id, vat_rate, service_charge_rate, enabled_dining_options, default_takeaway_pack_price)
SELECT id, 7.5, 2.5, '["indoor", "delivery", "pickup"]'::jsonb, 100
FROM business_owner 
WHERE id NOT IN (SELECT business_id FROM business_settings WHERE business_id IS NOT NULL)
ON CONFLICT (business_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN business_settings.enabled_dining_options IS 'Array of enabled dining options: indoor, delivery, pickup';
COMMENT ON COLUMN business_settings.default_takeaway_pack_price IS 'Default price for takeaway packs in kobo/cents';