-- Migration: Add refund system tables
-- This migration adds tables for refund requests and refund transactions

-- Create refund_requests table
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text])),
  requested_by_staff_id uuid,
  approved_by_staff_id uuid,
  denied_by_staff_id uuid,
  approved_at timestamp with time zone,
  denied_at timestamp with time zone,
  admin_notes text,
  denial_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT refund_requests_pkey PRIMARY KEY (id),
  CONSTRAINT refund_requests_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE,
  CONSTRAINT refund_requests_requested_by_staff_id_fkey FOREIGN KEY (requested_by_staff_id) REFERENCES public.staff(id),
  CONSTRAINT refund_requests_approved_by_staff_id_fkey FOREIGN KEY (approved_by_staff_id) REFERENCES public.staff(id),
  CONSTRAINT refund_requests_denied_by_staff_id_fkey FOREIGN KEY (denied_by_staff_id) REFERENCES public.staff(id)
);

-- Create refund_transactions table
CREATE TABLE IF NOT EXISTS public.refund_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  refund_request_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  amount integer NOT NULL,
  refund_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  reference_number text,
  processed_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT refund_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT refund_transactions_refund_request_id_fkey FOREIGN KEY (refund_request_id) REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  CONSTRAINT refund_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment_id ON public.refund_requests (payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests (status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON public.refund_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_refund_request_id ON public.refund_transactions (refund_request_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_payment_id ON public.refund_transactions (payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_status ON public.refund_transactions (status);

-- Enable RLS for refund_requests table
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for business owners to manage refund requests for their payments
DROP POLICY IF EXISTS "Business owners can manage refund requests" ON public.refund_requests;
CREATE POLICY "Business owners can manage refund requests" 
ON public.refund_requests FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.payments 
    JOIN public.orders ON payments.id = refund_requests.payment_id AND orders.id = payments.order_id
    WHERE orders.business_id = auth.uid()
  )
);

-- Create policy for staff to create refund requests for their business
DROP POLICY IF EXISTS "Staff can create refund requests" ON public.refund_requests;
CREATE POLICY "Staff can create refund requests" 
ON public.refund_requests FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = refund_requests.requested_by_staff_id 
    AND staff.business_id = auth.uid()
  )
);

-- Enable RLS for refund_transactions table
ALTER TABLE public.refund_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for business owners to view refund transactions
DROP POLICY IF EXISTS "Business owners can view refund transactions" ON public.refund_transactions;
CREATE POLICY "Business owners can view refund transactions" 
ON public.refund_transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.payments 
    JOIN public.orders ON payments.id = refund_transactions.payment_id AND orders.id = payments.order_id
    WHERE orders.business_id = auth.uid()
  )
);

-- Create policy for system to create refund transactions
DROP POLICY IF EXISTS "System can create refund transactions" ON public.refund_transactions;
CREATE POLICY "System can create refund transactions" 
ON public.refund_transactions FOR INSERT 
WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.refund_requests IS 'Refund requests with approval workflow and audit trail';
COMMENT ON TABLE public.refund_transactions IS 'Refund transaction records for completed refunds';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_refund_requests_updated_at ON public.refund_requests;
CREATE TRIGGER update_refund_requests_updated_at 
    BEFORE UPDATE ON public.refund_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_refund_transactions_updated_at ON public.refund_transactions;
CREATE TRIGGER update_refund_transactions_updated_at 
    BEFORE UPDATE ON public.refund_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();