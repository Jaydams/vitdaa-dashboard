-- Simple fix for inventory requests schema - no complex syntax
-- Run this SQL directly in your Supabase dashboard

-- Add missing columns to inventory_request_items if they don't exist
ALTER TABLE inventory_request_items 
ADD COLUMN IF NOT EXISTS estimated_unit_cost DECIMAL(10,2) DEFAULT 0;

ALTER TABLE inventory_request_items 
ADD COLUMN IF NOT EXISTS approved_unit_cost DECIMAL(10,2);

ALTER TABLE inventory_request_items 
ADD COLUMN IF NOT EXISTS supplier_id UUID;

ALTER TABLE inventory_request_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to inventory_requests if they don't exist
ALTER TABLE inventory_requests 
ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'normal';

ALTER TABLE inventory_requests 
ADD COLUMN IF NOT EXISTS justification TEXT;

ALTER TABLE inventory_requests 
ADD COLUMN IF NOT EXISTS total_estimated_cost DECIMAL(10,2) DEFAULT 0;

-- Add constraints if they don't exist (will fail silently if they already exist)
DO $$
BEGIN
    BEGIN
        ALTER TABLE inventory_requests 
        ADD CONSTRAINT inventory_requests_urgency_check 
        CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent'));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE inventory_request_items 
        ADD CONSTRAINT inventory_request_items_supplier_id_fkey 
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_table THEN NULL; -- In case suppliers table doesn't exist
    END;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_inventory_requests_business_id ON inventory_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_status ON inventory_requests(status);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_urgency ON inventory_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_request_id ON inventory_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_supplier_id ON inventory_request_items(supplier_id);

-- Verify the schema
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('inventory_requests', 'inventory_request_items')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;