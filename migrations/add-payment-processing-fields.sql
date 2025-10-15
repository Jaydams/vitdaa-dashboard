-- Add missing fields to payments table for proper payment processing
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS amount_received integer,
ADD COLUMN IF NOT EXISTS change_amount integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- Update the payment_time column to be nullable since we now have processed_at
ALTER TABLE public.payments 
ALTER COLUMN payment_time DROP NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_processed_at ON public.payments(processed_at);