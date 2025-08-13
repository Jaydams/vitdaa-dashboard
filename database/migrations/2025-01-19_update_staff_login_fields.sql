-- Update Staff Table for Email/Username Login
-- This migration makes email required and adds a username field for better staff login experience

-- Add username column
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS username text;

-- Make email required (update existing null emails to a placeholder)
UPDATE public.staff SET email = 'staff-' || id || '@example.com' WHERE email IS NULL;

-- Now make email NOT NULL
ALTER TABLE public.staff ALTER COLUMN email SET NOT NULL;

-- Add unique constraints for email and username per business
ALTER TABLE public.staff ADD CONSTRAINT staff_email_business_unique UNIQUE (email, business_id);
ALTER TABLE public.staff ADD CONSTRAINT staff_username_business_unique UNIQUE (username, business_id);

-- Add indexes for login performance
CREATE INDEX IF NOT EXISTS idx_staff_email_business ON public.staff (business_id, email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_username_business ON public.staff (business_id, username) WHERE is_active = true;

-- Add check constraint to ensure either email or username is provided
ALTER TABLE public.staff ADD CONSTRAINT staff_login_identifier_check 
  CHECK (email IS NOT NULL OR username IS NOT NULL);

-- Update the existing unique constraint to include email
-- First drop the old constraint
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_pin_hash_business_unique;

-- Add new constraint that includes email
ALTER TABLE public.staff ADD CONSTRAINT staff_pin_hash_email_business_unique 
  UNIQUE (pin_hash, email, business_id);

-- Add new constraint for username and pin
ALTER TABLE public.staff ADD CONSTRAINT staff_pin_hash_username_business_unique 
  UNIQUE (pin_hash, username, business_id);

-- Add comments for documentation
COMMENT ON COLUMN public.staff.email IS 'Required email for staff login';
COMMENT ON COLUMN public.staff.username IS 'Optional username for staff login (alternative to email)';
COMMENT ON COLUMN public.staff.employee_id IS 'Internal employee ID (not used for login)'; 