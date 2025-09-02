-- Update orders table to support transfer payment method
-- This ensures the payment_method column accepts 'transfer' as a valid value

-- First, let's check the current constraint
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add the new constraint that includes 'transfer'
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check,
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method = ANY (ARRAY['cash'::text, 'wallet'::text, 'card'::text, 'transfer'::text]));

-- Update payments table to support transfer payment method
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_payment_method_check,
ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method = ANY (ARRAY['cash'::text, 'wallet'::text, 'card'::text, 'transfer'::text, 'direct_debit'::text]));

-- Ensure all orders start as 'pending' by default to allow restaurant confirmation
-- This allows orders to be placed without immediate payment completion
ALTER TABLE public.orders 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at 
ON public.orders (status, created_at DESC) 
WHERE status = 'pending';

-- Add index for business orders
CREATE INDEX IF NOT EXISTS idx_orders_business_status 
ON public.orders (business_id, status, created_at DESC);

-- Enable RLS (Row Level Security) for orders if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy for business owners to see their own orders
DROP POLICY IF EXISTS "Business owners can view their orders" ON public.orders;
CREATE POLICY "Business owners can view their orders" 
ON public.orders FOR SELECT 
USING (business_id = auth.uid());

-- Create policy for business owners to update their orders
DROP POLICY IF EXISTS "Business owners can update their orders" ON public.orders;
CREATE POLICY "Business owners can update their orders" 
ON public.orders FOR UPDATE 
USING (business_id = auth.uid());

-- Create policy for customers to view their own orders (including anonymous orders)
DROP POLICY IF EXISTS "Customers can view their orders" ON public.orders;
CREATE POLICY "Customers can view their orders" 
ON public.orders FOR SELECT 
USING (customer_id = auth.uid() OR customer_id IS NULL);

-- Create policy for inserting orders (anyone can create orders)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (true);

-- Allow anonymous orders by making customer_id nullable
ALTER TABLE public.orders ALTER COLUMN customer_id DROP NOT NULL;

-- Add index for anonymous order tracking
CREATE INDEX IF NOT EXISTS idx_orders_invoice_phone 
ON public.orders (invoice_no, customer_phone) 
WHERE customer_id IS NULL;

-- Add comment to document the change
COMMENT ON COLUMN public.orders.payment_method IS 'Payment method: cash, wallet, card, or transfer. Transfer orders require manual confirmation.';
COMMENT ON COLUMN public.orders.status IS 'Order status: pending (awaiting confirmation), processing, delivered, or cancelled. All orders start as pending.';
COMMENT ON COLUMN public.orders.customer_id IS 'Customer ID for logged-in users, NULL for anonymous orders. Anonymous orders can be tracked using invoice_no + customer_phone.';