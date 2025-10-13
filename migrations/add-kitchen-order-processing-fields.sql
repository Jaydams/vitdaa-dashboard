-- Add kitchen order processing fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preparation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preparation_duration INTEGER, -- in seconds
ADD COLUMN IF NOT EXISTS assigned_to_staff_id UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS completed_by_staff_id UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS kitchen_notes TEXT,
ADD COLUMN IF NOT EXISTS estimated_completion_time TIMESTAMP WITH TIME ZONE;

-- Add kitchen order processing fields to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS item_status TEXT DEFAULT 'pending' CHECK (item_status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
ADD COLUMN IF NOT EXISTS preparation_time INTEGER, -- estimated time in minutes
ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preparation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preparation_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_by_staff_id UUID REFERENCES staff(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_priority_level ON orders(priority_level);
CREATE INDEX IF NOT EXISTS idx_orders_preparation_started_at ON orders(preparation_started_at);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to_staff_id ON orders(assigned_to_staff_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_status ON order_items(item_status);
CREATE INDEX IF NOT EXISTS idx_order_items_preparation_started_at ON order_items(preparation_started_at);

-- Update existing orders to have default priority
UPDATE orders SET priority_level = 'normal' WHERE priority_level IS NULL;

-- Update existing order items to have default status
UPDATE order_items SET item_status = 'pending' WHERE item_status IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN orders.priority_level IS 'Kitchen priority level for order processing';
COMMENT ON COLUMN orders.preparation_started_at IS 'When kitchen staff started preparing this order';
COMMENT ON COLUMN orders.preparation_completed_at IS 'When kitchen staff completed preparing this order';
COMMENT ON COLUMN orders.preparation_duration IS 'Total preparation time in seconds';
COMMENT ON COLUMN orders.assigned_to_staff_id IS 'Kitchen staff member assigned to this order';
COMMENT ON COLUMN orders.completed_by_staff_id IS 'Kitchen staff member who completed this order';
COMMENT ON COLUMN orders.kitchen_notes IS 'Notes added by kitchen staff during preparation';
COMMENT ON COLUMN orders.estimated_completion_time IS 'Estimated time when order will be ready';

COMMENT ON COLUMN order_items.item_status IS 'Individual item preparation status';
COMMENT ON COLUMN order_items.preparation_time IS 'Estimated preparation time for this item in minutes';
COMMENT ON COLUMN order_items.preparation_started_at IS 'When preparation started for this specific item';
COMMENT ON COLUMN order_items.preparation_completed_at IS 'When preparation completed for this specific item';
COMMENT ON COLUMN order_items.preparation_notes IS 'Notes for this specific item preparation';
COMMENT ON COLUMN order_items.updated_by_staff_id IS 'Staff member who last updated this item';