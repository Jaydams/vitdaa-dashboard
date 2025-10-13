-- Migration: Add tables for functional staff dashboards
-- Description: Creates inventory requests, inventory request items, and staff activity logs tables
-- Date: 2025-01-13

-- Drop tables if they exist to ensure clean creation
DROP TABLE IF EXISTS staff_activity_logs CASCADE;
DROP TABLE IF EXISTS inventory_request_items CASCADE;
DROP TABLE IF EXISTS inventory_requests CASCADE;

-- Create inventory_requests table for kitchen staff to request inventory items from admin
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

-- Create inventory_request_items table for individual items in each request
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

-- Create staff_activity_logs table for performance tracking and business intelligence
CREATE TABLE staff_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  staff_session_id UUID,
  business_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_details JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT staff_activity_logs_activity_type_check CHECK (activity_type IN (
    'order_created', 'order_updated', 'order_status_changed', 'payment_processed',
    'inventory_requested', 'inventory_approved', 'inventory_denied', 'inventory_updated',
    'table_assigned', 'customer_served', 'report_generated', 'refund_processed',
    'dashboard_accessed', 'login', 'logout', 'error_occurred'
  ))
);

-- Add foreign key constraints after table creation
ALTER TABLE inventory_requests 
  ADD CONSTRAINT inventory_requests_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_owner(id) ON DELETE CASCADE;

ALTER TABLE inventory_requests 
  ADD CONSTRAINT inventory_requests_requested_by_staff_id_fkey 
  FOREIGN KEY (requested_by_staff_id) REFERENCES staff(id) ON DELETE CASCADE;

ALTER TABLE inventory_requests 
  ADD CONSTRAINT inventory_requests_approved_by_admin_id_fkey 
  FOREIGN KEY (approved_by_admin_id) REFERENCES business_owner(id);

ALTER TABLE inventory_request_items 
  ADD CONSTRAINT inventory_request_items_request_id_fkey 
  FOREIGN KEY (request_id) REFERENCES inventory_requests(id) ON DELETE CASCADE;

ALTER TABLE inventory_request_items 
  ADD CONSTRAINT inventory_request_items_inventory_item_id_fkey 
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;

ALTER TABLE inventory_request_items 
  ADD CONSTRAINT inventory_request_items_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

ALTER TABLE staff_activity_logs 
  ADD CONSTRAINT staff_activity_logs_staff_id_fkey 
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE;

ALTER TABLE staff_activity_logs 
  ADD CONSTRAINT staff_activity_logs_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_owner(id) ON DELETE CASCADE;

ALTER TABLE staff_activity_logs 
  ADD CONSTRAINT staff_activity_logs_staff_session_id_fkey 
  FOREIGN KEY (staff_session_id) REFERENCES staff_sessions(id) ON DELETE CASCADE;

-- Create indexes for performance optimization
CREATE INDEX idx_inventory_requests_business_id ON inventory_requests(business_id);
CREATE INDEX idx_inventory_requests_staff_id ON inventory_requests(requested_by_staff_id);
CREATE INDEX idx_inventory_requests_status ON inventory_requests(status);
CREATE INDEX idx_inventory_requests_created_at ON inventory_requests(created_at);
CREATE INDEX idx_inventory_requests_urgency ON inventory_requests(urgency_level);

CREATE INDEX idx_inventory_request_items_request_id ON inventory_request_items(request_id);
CREATE INDEX idx_inventory_request_items_inventory_item_id ON inventory_request_items(inventory_item_id);
CREATE INDEX idx_inventory_request_items_supplier_id ON inventory_request_items(supplier_id);

CREATE INDEX idx_staff_activity_logs_staff_id ON staff_activity_logs(staff_id);
CREATE INDEX idx_staff_activity_logs_business_id ON staff_activity_logs(business_id);
CREATE INDEX idx_staff_activity_logs_activity_type ON staff_activity_logs(activity_type);
CREATE INDEX idx_staff_activity_logs_timestamp ON staff_activity_logs(timestamp);
CREATE INDEX idx_staff_activity_logs_shift_date ON staff_activity_logs(shift_date);
CREATE INDEX idx_staff_activity_logs_session_id ON staff_activity_logs(staff_session_id);

-- Create composite indexes for common query patterns
CREATE INDEX idx_inventory_requests_business_status ON inventory_requests(business_id, status);
CREATE INDEX idx_inventory_requests_staff_status ON inventory_requests(requested_by_staff_id, status);
CREATE INDEX idx_staff_activity_logs_staff_date ON staff_activity_logs(staff_id, shift_date);
CREATE INDEX idx_staff_activity_logs_business_date ON staff_activity_logs(business_id, shift_date);

-- Add trigger to update updated_at timestamp on inventory_requests
CREATE OR REPLACE FUNCTION update_inventory_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_requests_updated_at
  BEFORE UPDATE ON inventory_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_requests_updated_at();

-- Add comments for documentation
COMMENT ON TABLE inventory_requests IS 'Stores inventory requests made by kitchen staff to admin for approval';
COMMENT ON TABLE inventory_request_items IS 'Individual items within each inventory request with quantities and costs';
COMMENT ON TABLE staff_activity_logs IS 'Comprehensive logging of all staff activities for performance tracking and business intelligence';

COMMENT ON COLUMN inventory_requests.urgency_level IS 'Priority level of the request: low, normal, high, urgent';
COMMENT ON COLUMN inventory_requests.status IS 'Current status: pending, approved, denied, partially_approved';
COMMENT ON COLUMN inventory_request_items.requested_quantity IS 'Quantity requested by kitchen staff';
COMMENT ON COLUMN inventory_request_items.approved_quantity IS 'Quantity approved by admin (may differ from requested)';
COMMENT ON COLUMN staff_activity_logs.activity_details IS 'JSON object containing specific details about the activity';
COMMENT ON COLUMN staff_activity_logs.performance_metrics IS 'JSON object containing performance data like response_time, efficiency_score';