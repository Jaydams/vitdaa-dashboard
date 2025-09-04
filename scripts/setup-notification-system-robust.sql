-- Robust setup script for Vitdaa POS Notification System
-- This script handles existing objects gracefully and avoids conflicts
-- Run this script in your Supabase SQL editor to set up the complete notification system

-- 1. Create notifications table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid,
  staff_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['new_order'::text, 'order_status_change'::text, 'low_stock'::text, 'payment_received'::text, 'system_alert'::text])),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  priority text DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE
);

-- 2. Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON public.notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_staff_id ON public.notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create trigger to automatically update updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- 5. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Business owners can view all notifications for their business" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Business owners can update all notifications for their business" ON public.notifications;

-- 7. Create RLS policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR staff_id IN (
    SELECT id FROM public.staff WHERE business_id = (
      SELECT business_id FROM public.staff WHERE id = staff_id
    )
  ));

CREATE POLICY "Business owners can view all notifications for their business" ON public.notifications
  FOR SELECT USING (business_id IN (
    SELECT id FROM public.business_owner WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() OR staff_id IN (
    SELECT id FROM public.staff WHERE business_id = (
      SELECT business_id FROM public.staff WHERE id = staff_id
    )
  ));

CREATE POLICY "Business owners can update all notifications for their business" ON public.notifications
  FOR UPDATE USING (business_id IN (
    SELECT id FROM public.business_owner WHERE id = auth.uid()
  ));

-- 8. Fix order_status_history RLS policies (drop existing ones first)
DROP POLICY IF EXISTS "Business owners can view order status history" ON order_status_history;
DROP POLICY IF EXISTS "Staff can view order status history for their business" ON order_status_history;
DROP POLICY IF EXISTS "Staff can insert order status history" ON order_status_history;
DROP POLICY IF EXISTS "Allow order status history access for business" ON order_status_history;
DROP POLICY IF EXISTS "Business owners can manage order status history" ON order_status_history;
DROP POLICY IF EXISTS "Staff can manage order status history" ON order_status_history;

-- 9. Create new RLS policies for order_status_history
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

CREATE POLICY "Business owners can manage order status history" ON order_status_history
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage order status history" ON order_status_history
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id = (
        SELECT business_id FROM staff WHERE id = auth.uid()
      )
    )
  );

-- 10. Ensure proper permissions
GRANT ALL ON order_status_history TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- 11. Check if sequence exists and grant permissions if it does
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'order_status_history_id_seq') THEN
    EXECUTE 'GRANT USAGE ON SEQUENCE order_status_history_id_seq TO authenticated';
  ELSIF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'order_status_history_id_seq' AND sequence_schema = 'public') THEN
    EXECUTE 'GRANT USAGE ON SEQUENCE public.order_status_history_id_seq TO authenticated';
  END IF;
END $$;

-- 12. Enable real-time for notifications table (add if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- 13. Enable real-time using the helper function (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_table_to_realtime_if_not_exists') THEN
    PERFORM add_table_to_realtime_if_not_exists('notifications');
  END IF;
END $$;

-- 14. Ensure proper permissions for real-time subscriptions
GRANT SELECT ON notifications TO anon;
GRANT SELECT ON notifications TO authenticated;

-- 15. Create a function to broadcast notification changes
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

-- 16. Create trigger for real-time notifications (drop if exists first)
DROP TRIGGER IF EXISTS trigger_notify_notification_change ON notifications;
CREATE TRIGGER trigger_notify_notification_change
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_notification_change();

-- 17. Insert sample notifications for testing (only if they don't exist)
INSERT INTO public.notifications (business_id, type, title, message, data, priority)
SELECT 
  bo.id,
  'system_alert',
  'Welcome to Vitdaa POS',
  'Your POS system is now ready to receive orders and manage your business.',
  '{"welcome": true}',
  'normal'
FROM public.business_owner bo
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n WHERE n.business_id = bo.id AND n.type = 'system_alert'
);

-- 18. Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Notification system setup completed successfully!';
  RAISE NOTICE 'Tables created: notifications';
  RAISE NOTICE 'Real-time enabled for: notifications';
  RAISE NOTICE 'RLS policies configured for: notifications, order_status_history';
  RAISE NOTICE 'Sample notification created for existing business owners';
  
  -- Check if notifications table is in real-time publication
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    RAISE NOTICE '✅ Notifications table is in real-time publication';
  ELSE
    RAISE NOTICE '⚠️ Notifications table is NOT in real-time publication';
  END IF;
  
  -- Check notification count
  DECLARE
    notif_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO notif_count FROM notifications;
    RAISE NOTICE '📊 Current notification count: %', notif_count;
  END;
END $$;
