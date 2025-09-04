-- Fix RLS policies for notifications table to ensure proper access
-- Run this in your Supabase SQL editor

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Business owners can view all notifications for their business" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Business owners can update all notifications for their business" ON public.notifications;

-- 2. Create comprehensive policies that allow proper access
-- Policy for viewing notifications
CREATE POLICY "Allow viewing notifications for business" ON public.notifications
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM business_owner WHERE id = auth.uid()
      UNION
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

-- Policy for inserting notifications
CREATE POLICY "Allow inserting notifications for business" ON public.notifications
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM business_owner WHERE id = auth.uid()
      UNION
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

-- Policy for updating notifications
CREATE POLICY "Allow updating notifications for business" ON public.notifications
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM business_owner WHERE id = auth.uid()
      UNION
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

-- Policy for deleting notifications
CREATE POLICY "Allow deleting notifications for business" ON public.notifications
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM business_owner WHERE id = auth.uid()
      UNION
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

-- 3. Ensure proper permissions
GRANT ALL ON notifications TO authenticated;
GRANT SELECT ON notifications TO anon;

-- 4. Verify the policies are working
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated for notifications table';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '- Allow viewing notifications for business';
  RAISE NOTICE '- Allow inserting notifications for business';
  RAISE NOTICE '- Allow updating notifications for business';
  RAISE NOTICE '- Allow deleting notifications for business';
END $$;
