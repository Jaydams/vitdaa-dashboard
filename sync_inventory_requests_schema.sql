-- Sync inventory requests schema with existing functional staff dashboards
-- This ensures compatibility between the inventory management and staff dashboard systems
-- Run this SQL directly in your Supabase dashboard

-- Check if tables already exist and verify schema
DO $$ 
BEGIN
    -- Check if inventory_requests table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_requests') THEN
        RAISE NOTICE 'inventory_requests table already exists';
        
        -- Check if it has the correct columns
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
        
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE inventory_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id UUID NOT NULL,
          requested_by_staff_id UUID NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          urgency_level TEXT NOT NULL DEFAULT 'normal',
          justification TEXT,
          total_estimated_cost DECIMAL(10,2) DEFAULT 0,
          admin_notes TEXT,
          approved_by_admin_id UUID,
          approved_at TIMESTAMP WITH TIME ZONE,
          denied_reason TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT inventory_requests_status_check CHECK (status IN ('pending', 'approved', 'denied', 'partially_approved')),
          CONSTRAINT inventory_requests_urgency_check CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent'))
        );
        
        -- Add foreign key constraints
        ALTER TABLE inventory_requests 
          ADD CONSTRAINT inventory_requests_business_id_fkey 
          FOREIGN KEY (business_id) REFERENCES business_owner(id) ON DELETE CASCADE;

        ALTER TABLE inventory_requests 
          ADD CONSTRAINT inventory_requests_requested_by_staff_id_fkey 
          FOREIGN KEY (requested_by_staff_id) REFERENCES staff(id) ON DELETE CASCADE;

        ALTER TABLE inventory_requests 
          ADD CONSTRAINT inventory_requests_approved_by_admin_id_fkey 
          FOREIGN KEY (approved_by_admin_id) REFERENCES business_owner(id);
    END IF;

    -- Check if inventory_request_items table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_request_items') THEN
        RAISE NOTICE 'inventory_request_items table already exists';
        
        -- Verify it has the correct column name (request_id, not inventory_request_id)
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'request_id') THEN
            -- If it has inventory_request_id instead, rename it
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'inventory_request_id') THEN
                ALTER TABLE inventory_request_items RENAME COLUMN inventory_request_id TO request_id;
            ELSE
                ALTER TABLE inventory_request_items ADD COLUMN request_id UUID NOT NULL;
            END IF;
        END IF;
        
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE inventory_request_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id UUID NOT NULL,
          inventory_item_id UUID NOT NULL,
          requested_quantity INTEGER NOT NULL,
          approved_quantity INTEGER,
          estimated_unit_cost DECIMAL(10,2) DEFAULT 0,
          approved_unit_cost DECIMAL(10,2),
          supplier_id UUID,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT inventory_request_items_quantity_check CHECK (requested_quantity > 0),
          CONSTRAINT inventory_request_items_approved_quantity_check CHECK (approved_quantity IS NULL OR approved_quantity >= 0)
        );
        
        -- Add foreign key constraints
        ALTER TABLE inventory_request_items 
          ADD CONSTRAINT inventory_request_items_request_id_fkey 
          FOREIGN KEY (request_id) REFERENCES inventory_requests(id) ON DELETE CASCADE;

        ALTER TABLE inventory_request_items 
          ADD CONSTRAINT inventory_request_items_inventory_item_id_fkey 
          FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;

        ALTER TABLE inventory_request_items 
          ADD CONSTRAINT inventory_request_items_supplier_id_fkey 
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_inventory_requests_business_id ON inventory_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_staff_id ON inventory_requests(requested_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_status ON inventory_requests(status);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_created_at ON inventory_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_urgency ON inventory_requests(urgency_level);

CREATE INDEX IF NOT EXISTS idx_inventory_request_items_request_id ON inventory_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_inventory_item_id ON inventory_request_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_supplier_id ON inventory_request_items(supplier_id);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inventory_requests_business_status ON inventory_requests(business_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_staff_status ON inventory_requests(requested_by_staff_id, status);

-- Add trigger to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_inventory_requests_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inventory_requests_updated_at ON inventory_requests;
CREATE TRIGGER trigger_update_inventory_requests_updated_at
  BEFORE UPDATE ON inventory_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_requests_updated_at();

-- Add comments for documentation
COMMENT ON TABLE inventory_requests IS 'Stores inventory requests made by kitchen staff to admin for approval';
COMMENT ON TABLE inventory_request_items IS 'Individual items within each inventory request with quantities and costs';

-- Verify the schema is correct
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