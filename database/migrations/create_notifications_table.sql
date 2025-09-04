-- Create notifications table for storing order notifications and system alerts
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON public.notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_staff_id ON public.notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Insert sample notifications for testing
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
