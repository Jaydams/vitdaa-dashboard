-- Enable Realtime for Staff Dashboard Tables
-- This migration enables real-time updates for tables used in staff dashboards

-- Function to safely add table to realtime publication
CREATE OR REPLACE FUNCTION add_table_to_realtime_if_not_exists(table_name text)
RETURNS void AS $$
BEGIN
  -- Check if table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = table_name
  ) THEN
    -- Add table to publication
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
    RAISE NOTICE 'Added table % to supabase_realtime publication', table_name;
  ELSE
    RAISE NOTICE 'Table % is already in supabase_realtime publication', table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add new tables to realtime publication
SELECT add_table_to_realtime_if_not_exists('order_status_history');
SELECT add_table_to_realtime_if_not_exists('order_assignments');
SELECT add_table_to_realtime_if_not_exists('inventory_items');
SELECT add_table_to_realtime_if_not_exists('inventory_alerts');
SELECT add_table_to_realtime_if_not_exists('tables');

-- Clean up the function
DROP FUNCTION add_table_to_realtime_if_not_exists(text);

-- Verify tables are in realtime publication
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('orders', 'order_items', 'payments', 'customers', 'order_status_history', 'order_assignments', 'inventory_items', 'inventory_alerts', 'tables')
ORDER BY tablename;
