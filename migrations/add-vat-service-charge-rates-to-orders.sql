-- Migration: Add VAT and service charge rates to orders table for historical accuracy
-- This allows storing the actual rates used when the order was created

-- Add vat_rate column to store the VAT rate used for this order
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 7.5;

-- Add service_charge_rate column to store the service charge rate used for this order  
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS service_charge_rate numeric DEFAULT 2.5;

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN public.orders.vat_rate IS 'VAT rate percentage used when this order was created (for historical accuracy)';
COMMENT ON COLUMN public.orders.service_charge_rate IS 'Service charge rate percentage used when this order was created (for historical accuracy)';