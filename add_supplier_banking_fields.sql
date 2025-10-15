-- Add banking information fields to existing suppliers table
-- Run this SQL directly in your Supabase dashboard

-- Add banking information columns to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_name text,
ADD COLUMN IF NOT EXISTS routing_number text,
ADD COLUMN IF NOT EXISTS swift_code text,
ADD COLUMN IF NOT EXISTS bank_address text;

-- Add comment for documentation
COMMENT ON COLUMN public.suppliers.bank_name IS 'Name of the supplier bank';
COMMENT ON COLUMN public.suppliers.account_number IS 'Bank account number for payments';
COMMENT ON COLUMN public.suppliers.account_name IS 'Name on the bank account';
COMMENT ON COLUMN public.suppliers.routing_number IS 'Bank routing number or sort code';
COMMENT ON COLUMN public.suppliers.swift_code IS 'SWIFT/BIC code for international transfers';
COMMENT ON COLUMN public.suppliers.bank_address IS 'Bank branch address';

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'suppliers' 
AND table_schema = 'public'
ORDER BY ordinal_position;