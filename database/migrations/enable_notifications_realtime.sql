-- Enable real-time for notifications table
-- This migration ensures that the notifications table can be subscribed to for real-time updates

-- Add the notifications table to Supabase real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Verify the table is in the publication
-- You can check this by running:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';

-- Enable real-time for the table
SELECT add_table_to_realtime_if_not_exists('notifications');

-- Ensure proper permissions for real-time subscriptions
GRANT SELECT ON notifications TO anon;
GRANT SELECT ON notifications TO authenticated;

-- Create a function to broadcast notification changes
CREATE OR REPLACE FUNCTION notify_notification_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Broadcast the change to real-time subscribers
  PERFORM pg_notify(
    'notification_change',
    json_build_object(
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'record', row_to_json(NEW)
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
DROP TRIGGER IF EXISTS trigger_notify_notification_change ON notifications;
CREATE TRIGGER trigger_notify_notification_change
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_notification_change();

-- Test real-time functionality
-- You can test this by running:
-- INSERT INTO notifications (business_id, type, title, message, data) 
-- VALUES ('test-business-id', 'system_alert', 'Test', 'Test message', '{}');
