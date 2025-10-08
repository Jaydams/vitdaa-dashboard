-- Add status field to delivery_locations table for soft delete functionality
-- This allows locations to be marked as inactive instead of being physically deleted

-- Add status column with default 'active'
ALTER TABLE public.delivery_locations 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'deleted'));

-- Add index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_delivery_locations_status 
ON public.delivery_locations(business_id, status);

-- Update any existing records to have 'active' status
UPDATE public.delivery_locations 
SET status = 'active' 
WHERE status IS NULL;