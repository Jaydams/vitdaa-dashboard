-- Final fix for inventory requests schema synchronization
-- This ensures compatibility with existing functional staff dashboards
-- Run this SQL directly in your Supabase dashboard

-- Step 1: Ensure inventory_requests table has all required columns
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_requests' AND column_name = 'urgency_level') THEN
        ALTER TABLE inventory_requests ADD COLUMN urgency_level TEXT NOT NULL DEFAULT 'normal';
        ALTER TABLE inventory_requests ADD CONSTRAINT inventory_requests_urgency_check CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent'));
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_requests' AND column_name = 'justification') THEN
        ALTER TABLE inventory_requests ADD COLUMN justification TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_requests' AND column_name = 'total_estimated_cost') THEN
        ALTER TABLE inventory_requests ADD COLUMN total_estimated_cost DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_requests' AND column_name = 'admin_notes') THEN
        ALTER TABLE inventory_requests ADD COLUMN admin_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_requests' AND column_name = 'approved_by_admin_id') THEN
        ALTER TABLE inventory_requests ADD COLUMN approved_by_admin_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_requests' AND column_name = 'approved_at') THEN
        ALTER TABLE inventory_requests ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_requests' AND column_name = 'denied_reason') THEN
        ALTER TABLE inventory_requests ADD COLUMN denied_reason TEXT;
    END IF;
END $$;

-- Step 2: Ensure inventory_request_items table uses correct column name
DO $$ 
BEGIN
    -- Check if table has inventory_request_id instead of request_id
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'inventory_request_id') THEN
        -- Rename to match existing schema
        ALTER TABLE inventory_request_items RENAME COLUMN inventory_request_id TO request_id;
        RAISE NOTICE 'Renamed inventory_request_id to request_id';
    END IF;
    
    -- Ensure request_id column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'request_id') THEN
        ALTER TABLE inventory_request_items ADD COLUMN request_id UUID NOT NULL;
        RAISE NOTICE 'Added request_id column';
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'estimated_unit_cost') THEN
        ALTER TABLE inventory_request_items ADD COLUMN estimated_unit_cost DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'approved_unit_cost') THEN
        ALTER TABLE inventory_request_items ADD COLUMN approved_unit_cost DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'supplier_id') THEN
        ALTER TABLE inventory_request_items ADD COLUMN supplier_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'notes') THEN
        ALTER TABLE inventory_request_items ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Step 3: Ensure foreign key constraints exist
DO $$
BEGIN
    -- Add foreign key for request_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_request_items_request_id_fkey'
        AND table_name = 'inventory_request_items'
    ) THEN
        ALTER TABLE inventory_request_items 
          ADD CONSTRAINT inventory_request_items_request_id_fkey 
          FOREIGN KEY (request_id) REFERENCES inventory_requests(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for request_id';
    END IF;
    
    -- Add foreign key for supplier_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_request_items_supplier_id_fkey'
        AND table_name = 'inventory_request_items'
    ) THEN
        -- Only add if suppliers table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers') THEN
            ALTER TABLE inventory_request_items 
              ADD CONSTRAINT inventory_request_items_supplier_id_fkey 
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for supplier_id';
        END IF;
    END IF;
END $$;

-- Step 4: Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_inventory_requests_business_id ON inventory_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_staff_id ON inventory_requests(requested_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_status ON inventory_requests(status);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_created_at ON inventory_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_urgency ON inventory_requests(urgency_level);

CREATE INDEX IF NOT EXISTS idx_inventory_request_items_request_id ON inventory_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_inventory_item_id ON inventory_request_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_supplier_id ON inventory_request_items(supplier_id);

-- Step 5: Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inventory_requests_business_status ON inventory_requests(business_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_staff_status ON inventory_requests(requested_by_staff_id, status);

-- Step 6: Verify the final schema
SELECT 
    'inventory_requests' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

SELECT 
    'inventory_request_items' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_request_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;