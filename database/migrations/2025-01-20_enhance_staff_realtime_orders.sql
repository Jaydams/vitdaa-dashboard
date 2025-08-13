-- Enhance Orders Table for Staff Role-Based Management
-- This migration adds fields needed for real-time staff order management

-- Add new columns to orders table for enhanced staff management
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS assigned_to_staff_id UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kitchen_notes TEXT,
ADD COLUMN IF NOT EXISTS bar_notes TEXT,
ADD COLUMN IF NOT EXISTS estimated_completion_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preparation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ready_for_pickup_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES staff(id);

-- Add new columns to order_items for item-level status tracking
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS item_status TEXT DEFAULT 'pending' CHECK (item_status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
ADD COLUMN IF NOT EXISTS assigned_to_staff_id UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preparation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS is_kitchen_item BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_bar_item BOOLEAN DEFAULT false;

-- Create order_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_assignments table for tracking staff assignments
CREATE TABLE IF NOT EXISTS order_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('kitchen', 'bar', 'service', 'delivery')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unassigned_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to_staff ON orders(assigned_to_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_updated_by ON orders(status_updated_by);
CREATE INDEX IF NOT EXISTS idx_orders_priority_level ON orders(priority_level);
CREATE INDEX IF NOT EXISTS idx_orders_estimated_completion ON orders(estimated_completion_time);
CREATE INDEX IF NOT EXISTS idx_order_items_item_status ON order_items(item_status);
CREATE INDEX IF NOT EXISTS idx_order_items_assigned_to_staff ON order_items(assigned_to_staff_id);
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_bar ON order_items(is_kitchen_item, is_bar_item);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_order_assignments_order_id ON order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_staff_id ON order_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_active ON order_assignments(is_active);

-- Enable RLS on new tables
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for order_status_history
CREATE POLICY "Business owners can view order status history" ON order_status_history
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Staff can view order status history for their business" ON order_status_history
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN staff s ON s.business_id = o.business_id
      JOIN staff_sessions ss ON ss.staff_id = s.id
      WHERE ss.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
      AND ss.is_active = true
    )
  );

CREATE POLICY "Staff can insert order status history" ON order_status_history
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN staff s ON s.business_id = o.business_id
      JOIN staff_sessions ss ON ss.staff_id = s.id
      WHERE ss.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
      AND ss.is_active = true
    )
  );

-- Create RLS policies for order_assignments
CREATE POLICY "Business owners can view order assignments" ON order_assignments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Staff can view order assignments for their business" ON order_assignments
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN staff s ON s.business_id = o.business_id
      JOIN staff_sessions ss ON ss.staff_id = s.id
      WHERE ss.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
      AND ss.is_active = true
    )
  );

CREATE POLICY "Staff can manage order assignments" ON order_assignments
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN staff s ON s.business_id = o.business_id
      JOIN staff_sessions ss ON ss.staff_id = s.id
      WHERE ss.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
      AND ss.is_active = true
    )
  );

-- Create function to automatically update last_status_update
CREATE OR REPLACE FUNCTION update_order_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_status_update = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status update timestamp
CREATE TRIGGER trigger_update_order_status_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_order_status_timestamp();

-- Create function to automatically insert status history
CREATE OR REPLACE FUNCTION insert_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_status_history (
    order_id,
    staff_id,
    previous_status,
    new_status,
    notes
  ) VALUES (
    NEW.id,
    NEW.status_updated_by,
    OLD.status,
    NEW.status,
    CASE 
      WHEN NEW.status = 'processing' THEN 'Order started processing'
      WHEN NEW.status = 'delivered' THEN 'Order completed'
      WHEN NEW.status = 'cancelled' THEN 'Order cancelled'
      ELSE 'Status updated'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status history
CREATE TRIGGER trigger_insert_order_status_history
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION insert_order_status_history();

-- Function to categorize menu items as kitchen or bar items
CREATE OR REPLACE FUNCTION categorize_menu_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Default to kitchen item unless specified otherwise
  NEW.is_kitchen_item = COALESCE(NEW.is_kitchen_item, true);
  NEW.is_bar_item = COALESCE(NEW.is_bar_item, false);
  
  -- If it's a bar item, it's not a kitchen item
  IF NEW.is_bar_item = true THEN
    NEW.is_kitchen_item = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for menu item categorization
CREATE TRIGGER trigger_categorize_menu_items
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION categorize_menu_items();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE order_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE order_assignments;

-- Update existing orders to have default values
UPDATE orders SET 
  priority_level = 'normal',
  last_status_update = COALESCE(last_status_update, created_at)
WHERE priority_level IS NULL;

-- Update existing order_items to have default values
UPDATE order_items SET 
  item_status = 'pending',
  is_kitchen_item = true,
  is_bar_item = false
WHERE item_status IS NULL;
