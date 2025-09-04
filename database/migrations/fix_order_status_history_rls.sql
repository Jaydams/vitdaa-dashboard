-- Fix RLS policies for order_status_history table
-- This migration ensures that order status updates can be properly recorded

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Business owners can view order status history" ON order_status_history;
DROP POLICY IF EXISTS "Staff can view order status history for their business" ON order_status_history;
DROP POLICY IF EXISTS "Staff can insert order status history" ON order_status_history;

-- Create more permissive policies for order status history
CREATE POLICY "Allow order status history access for business" ON order_status_history
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id = (
        SELECT business_id FROM staff WHERE id = auth.uid()
        UNION
        SELECT id FROM business_owner WHERE id = auth.uid()
      )
    )
  );

-- Alternative policy for direct business owner access
CREATE POLICY "Business owners can manage order status history" ON order_status_history
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id = auth.uid()
    )
  );

-- Policy for staff access
CREATE POLICY "Staff can manage order status history" ON order_status_history
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id = (
        SELECT business_id FROM staff WHERE id = auth.uid()
      )
    )
  );

-- Ensure the table is properly accessible
GRANT ALL ON order_status_history TO authenticated;
GRANT USAGE ON SEQUENCE order_status_history_id_seq TO authenticated;

-- Verify the policies are working
-- You can test this by running:
-- SELECT * FROM order_status_history LIMIT 1;
