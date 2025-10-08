-- Fix delivery location foreign key constraints to allow deletion
-- This allows users to delete delivery locations even if they're referenced by orders

-- Drop the existing constraint on orders table
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_delivery_location_id_fkey;

-- Add the constraint back with ON DELETE SET NULL
ALTER TABLE public.orders 
ADD CONSTRAINT orders_delivery_location_id_fkey 
FOREIGN KEY (delivery_location_id) 
REFERENCES public.delivery_locations(id) 
ON DELETE SET NULL;

-- Verify cart table already has the correct constraint (it should)
-- If not, fix it too
DO $$
BEGIN
    -- Check if cart constraint exists with ON DELETE SET NULL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.referential_constraints 
        WHERE constraint_name = 'cart_delivery_location_id_fkey' 
        AND delete_rule = 'SET NULL'
    ) THEN
        -- Drop and recreate cart constraint if needed
        ALTER TABLE public.cart 
        DROP CONSTRAINT IF EXISTS cart_delivery_location_id_fkey;
        
        ALTER TABLE public.cart 
        ADD CONSTRAINT cart_delivery_location_id_fkey 
        FOREIGN KEY (delivery_location_id) 
        REFERENCES public.delivery_locations(id) 
        ON DELETE SET NULL;
    END IF;
END $$;