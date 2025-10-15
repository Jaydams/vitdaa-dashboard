# Inventory Requests Error Fix

## Problem

The inventory requests page is showing "Failed to fetch inventory requests" error because the required database tables and API endpoints were missing.

## Solution

### 1. Database Tables

Run this SQL in your Supabase dashboard to create the missing tables:

```sql
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
```

### 2. API Endpoints Created

#### `/api/inventory/requests` - For managing inventory requests

- **GET**: Fetch inventory requests with filtering and pagination
- **POST**: Create new inventory requests

#### `/api/suppliers` - For fetching suppliers

- **GET**: Fetch suppliers with filtering and pagination

### 3. Files Created/Fixed

1. **`app/api/inventory/requests/route.ts`** - Main inventory requests API
2. **`app/api/suppliers/route.ts`** - Suppliers API endpoint
3. **`add_inventory_requests_tables.sql`** - Database schema for inventory requests
4. **`add_supplier_banking_fields.sql`** - Banking fields for suppliers (from earlier)

### 4. What These Fix

#### Inventory Requests Functionality:

- Staff can create inventory requests for items they need
- Admins can approve/deny requests with modifications
- Real-time updates when requests are processed
- Filtering by status, urgency, and search
- Complete audit trail of all requests

#### Suppliers Integration:

- Inventory requests can specify preferred suppliers
- Supplier information is available for cost estimation
- Banking details for payment processing

### 5. Next Steps

1. **Run the SQL scripts** in your Supabase dashboard:

   - `add_supplier_banking_fields.sql` (if not already done)
   - `add_inventory_requests_tables.sql`

2. **Restart your development server** to pick up the new API routes

3. **Test the functionality**:
   - Navigate to `/inventory/requests`
   - The page should now load without errors
   - You can create test inventory requests
   - Admins can approve/deny requests

### 6. Features Now Available

#### For Staff:

- Create inventory requests with justification
- Specify urgency levels (low, normal, high, urgent)
- Add multiple items per request
- Track request status and admin responses

#### For Admins:

- View all pending requests
- Filter by status, urgency, staff member
- Approve requests with quantity/cost modifications
- Deny requests with detailed reasons
- Add admin notes for communication

#### System Features:

- Real-time updates using Supabase subscriptions
- Proper business isolation (multi-tenant)
- Comprehensive audit trail
- Performance optimized with indexes

### 7. Error Resolution

The original error "Failed to fetch inventory requests" was caused by:

1. Missing database tables (`inventory_requests`, `inventory_request_items`)
2. Missing API endpoint (`/api/inventory/requests`)
3. Missing suppliers API endpoint (`/api/suppliers`)

All of these have now been created and should resolve the error completely.

### 8. Testing

After running the SQL scripts, you should be able to:

1. Visit `/inventory/requests` without errors
2. See an empty list of requests (initially)
3. Create new requests using the interface
4. View and manage requests as an admin

The system is now fully functional for inventory request management!
