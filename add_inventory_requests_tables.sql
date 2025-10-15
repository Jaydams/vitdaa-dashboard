-- Add inventory requests tables if they don't exist
-- Run this SQL directly in your Supabase dashboard

-- Create inventory_requests table
CREATE TABLE IF NOT EXISTS public.inventory_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  requested_by_staff_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'partially_approved'::text])),
  urgency_level text NOT NULL DEFAULT 'normal' CHECK (urgency_level = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  justification text NOT NULL,
  total_estimated_cost numeric DEFAULT 0,
  admin_notes text,
  approved_by_admin_id uuid,
  approved_at timestamp with time zone,
  denied_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_requests_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_requests_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT inventory_requests_requested_by_staff_id_fkey FOREIGN KEY (requested_by_staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT inventory_requests_approved_by_admin_id_fkey FOREIGN KEY (approved_by_admin_id) REFERENCES public.staff(id) ON DELETE SET NULL
);

-- Create inventory_request_items table
CREATE TABLE IF NOT EXISTS public.inventory_request_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inventory_request_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  requested_quantity numeric NOT NULL,
  approved_quantity numeric,
  estimated_unit_cost numeric NOT NULL,
  approved_unit_cost numeric,
  supplier_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_request_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_request_items_inventory_request_id_fkey FOREIGN KEY (inventory_request_id) REFERENCES public.inventory_requests(id) ON DELETE CASCADE,
  CONSTRAINT inventory_request_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT inventory_request_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_requests_business_id ON public.inventory_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_status ON public.inventory_requests(status);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_urgency_level ON public.inventory_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_requested_by_staff_id ON public.inventory_requests(requested_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_created_at ON public.inventory_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_request_items_inventory_request_id ON public.inventory_request_items(inventory_request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_inventory_item_id ON public.inventory_request_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_supplier_id ON public.inventory_request_items(supplier_id);

-- Add comments for documentation
COMMENT ON TABLE public.inventory_requests IS 'Staff requests for inventory items that need admin approval';
COMMENT ON TABLE public.inventory_request_items IS 'Individual items in inventory requests';

COMMENT ON COLUMN public.inventory_requests.status IS 'Request status: pending, approved, denied, partially_approved';
COMMENT ON COLUMN public.inventory_requests.urgency_level IS 'Request priority: low, normal, high, urgent';
COMMENT ON COLUMN public.inventory_requests.justification IS 'Reason for the inventory request';
COMMENT ON COLUMN public.inventory_requests.total_estimated_cost IS 'Total estimated cost of all requested items';

-- Verify the tables were created successfully
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('inventory_requests', 'inventory_request_items')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;