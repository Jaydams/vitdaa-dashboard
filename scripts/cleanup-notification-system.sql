-- Cleanup script for Vitdaa POS Notification System
-- Run this script first to remove any conflicting objects, then run the setup script

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS trigger_notify_notification_change ON notifications;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_notifications_updated_at() CASCADE;
DROP FUNCTION IF EXISTS notify_notification_change() CASCADE;

-- Drop existing policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Business owners can view all notifications for their business" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Business owners can update all notifications for their business" ON public.notifications;

-- Drop existing policies for order_status_history
DROP POLICY IF EXISTS "Business owners can view order status history" ON order_status_history;
DROP POLICY IF EXISTS "Staff can view order status history for their business" ON order_status_history;
DROP POLICY IF EXISTS "Staff can insert order status history" ON order_status_history;
DROP POLICY IF EXISTS "Allow order status history access for business" ON order_status_history;
DROP POLICY IF EXISTS "Business owners can manage order status history" ON order_status_history;
DROP POLICY IF EXISTS "Staff can manage order status history" ON order_status_history;

-- Remove notifications table from real-time publication (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
  END IF;
END $$;

-- Drop the notifications table completely (if you want to start fresh)
-- Uncomment the next line if you want to remove the table and start over
-- DROP TABLE IF EXISTS public.notifications CASCADE;

RAISE NOTICE 'Cleanup completed. Now run the setup script.';
