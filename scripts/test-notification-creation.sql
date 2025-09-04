-- Test script to verify notification creation
-- Run this in your Supabase SQL editor to test the notification system

-- 1. Check if we can create a notification manually
INSERT INTO public.notifications (
  business_id,
  type,
  title,
  message,
  data,
  priority
) VALUES (
  'e90d09b3-fd06-4577-96c3-e355a8481b2c', -- Use one of your business IDs
  'new_order',
  'Test Order Notification',
  'This is a test order notification',
  '{"test": true, "order_id": "test-123"}',
  'high'
) RETURNING *;

-- 2. Check the current notification count
SELECT COUNT(*) as total_notifications FROM notifications;

-- 3. Check unread notifications
SELECT COUNT(*) as unread_notifications FROM notifications WHERE is_read = false;

-- 4. Check notifications by type
SELECT type, COUNT(*) as count FROM notifications GROUP BY type;

-- 5. Check if the business_id exists in business_owner table
SELECT id, business_name FROM business_owner WHERE id = 'e90d09b3-fd06-4577-96c3-e355a8481b2c';

-- 6. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notifications';
