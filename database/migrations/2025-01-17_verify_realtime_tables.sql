-- Verify and Add Tables to Realtime Publication
-- This script checks if tables are already in the publication and adds them only if needed

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

-- Add tables to realtime publication if they don't exist
SELECT add_table_to_realtime_if_not_exists('orders');
SELECT add_table_to_realtime_if_not_exists('order_items');
SELECT add_table_to_realtime_if_not_exists('payments');
SELECT add_table_to_realtime_if_not_exists('customers');

-- Clean up the function
DROP FUNCTION add_table_to_realtime_if_not_exists(text); 