-- Insert default business settings for any business owners that don't have them
INSERT INTO business_settings (
  business_id, 
  vat_rate, 
  service_charge_rate, 
  enabled_dining_options, 
  default_takeaway_pack_price
)
SELECT 
  bo.id,
  7.5,
  2.5,
  '["indoor", "delivery", "pickup"]'::jsonb,
  100
FROM business_owner bo
WHERE bo.id NOT IN (
  SELECT business_id 
  FROM business_settings 
  WHERE business_id IS NOT NULL
)
ON CONFLICT (business_id) DO NOTHING;