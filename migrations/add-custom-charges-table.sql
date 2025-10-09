-- Create custom charges table for additional order fees
CREATE TABLE IF NOT EXISTS public.order_custom_charges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  charge_name text NOT NULL,
  charge_type text NOT NULL CHECK (charge_type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
  charge_value numeric NOT NULL,
  calculated_amount integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_custom_charges_pkey PRIMARY KEY (id),
  CONSTRAINT order_custom_charges_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Add custom charges total to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_charges_total integer DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_custom_charges_order_id ON public.order_custom_charges(order_id);

-- Enable RLS (Row Level Security) for the custom charges table
ALTER TABLE public.order_custom_charges ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for custom charges - users can only access charges for their business orders
CREATE POLICY "Users can access custom charges for their business orders" ON public.order_custom_charges
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.business_owner bo ON o.business_id = bo.id
    WHERE o.id = order_custom_charges.order_id
    AND bo.email = auth.email()
  )
);