-- Quick fix for order_items RLS policy issue
-- Run this script to immediately resolve the "new row violates row-level security policy" error

-- Enable RLS for order_items table if not already enabled
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting order items (anyone can create order items when creating orders)
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items" 
ON public.order_items FOR INSERT 
WITH CHECK (true);

-- Create policy for business owners to view order items for their orders
DROP POLICY IF EXISTS "Business owners can view order items" ON public.order_items;
CREATE POLICY "Business owners can view order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.business_id = auth.uid()
  )
);

-- Create policy for customers to view their own order items
DROP POLICY IF EXISTS "Customers can view their order items" ON public.order_items;
CREATE POLICY "Customers can view their order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.customer_id = auth.uid() OR orders.customer_id IS NULL)
  )
);

-- Also fix payments table RLS if needed
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create payments" ON public.payments;
CREATE POLICY "Anyone can create payments" 
ON public.payments FOR INSERT 
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments (order_id);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('order_items', 'payments') 
ORDER BY tablename, policyname;