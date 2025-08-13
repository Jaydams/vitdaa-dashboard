-- Staff Role-Based Permissions Update Migration
-- This migration updates the staff system to properly implement role-based access control
-- and remove dependencies on test data

-- 1. Update staff table to ensure proper role constraints and permissions
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'standard' CHECK (access_level = ANY (ARRAY['standard'::text, 'elevated'::text, 'admin'::text])),
ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone,
ADD COLUMN IF NOT EXISTS session_timeout_minutes integer DEFAULT 480; -- 8 hours default

-- 2. Create staff_permissions table for granular permission management
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  permission_name text NOT NULL,
  is_granted boolean DEFAULT true,
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT staff_permissions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_permissions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT staff_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT staff_permissions_unique UNIQUE (staff_id, permission_name)
);

-- 3. Create staff_access_logs table for detailed access tracking
CREATE TABLE IF NOT EXISTS public.staff_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  session_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  permission_required text,
  access_granted boolean DEFAULT true,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_access_logs_pkey PRIMARY KEY (id),
  CONSTRAINT staff_access_logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_access_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT staff_access_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.staff_sessions(id) ON DELETE CASCADE
);

-- 4. Create role_permission_templates table for default role permissions
CREATE TABLE IF NOT EXISTS public.role_permission_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permission_templates_pkey PRIMARY KEY (id)
);

-- 5. Insert default role permission templates
INSERT INTO public.role_permission_templates (role_name, permissions, description) VALUES
('reception', '[
  "orders:create", "orders:read", "orders:update", 
  "tables:read", "tables:update", "tables:assign",
  "customers:read", "customers:update", "customers:create",
  "payments:process", "payments:read"
]'::jsonb, 'Reception staff with order and customer management permissions'),
('kitchen', '[
  "orders:read", "orders:update_status",
  "inventory:read", "inventory:update", "inventory:alerts"
]'::jsonb, 'Kitchen staff with food preparation and inventory permissions'),
('bar', '[
  "orders:read", "orders:update_status",
  "inventory:read", "inventory:update", "inventory:restock_requests"
]'::jsonb, 'Bar staff with beverage preparation and inventory permissions'),
('accountant', '[
  "reports:read", "reports:generate",
  "transactions:read", "payments:read", "payments:refund"
]'::jsonb, 'Accountant with financial reporting and transaction permissions'),
('storekeeper', '[
  "inventory:read", "inventory:update", "inventory:alerts",
  "inventory:restock_requests", "inventory:count"
]'::jsonb, 'Storekeeper with comprehensive inventory management permissions'),
('waiter', '[
  "orders:read", "orders:update_status",
  "tables:read", "tables:update",
  "customers:read"
]'::jsonb, 'Waiter with order and table management permissions')
ON CONFLICT (role_name) DO NOTHING;

-- 6. Create staff_role_assignments table for role management
CREATE TABLE IF NOT EXISTS public.staff_role_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  role_name text NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_role_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT staff_role_assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_role_assignments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT staff_role_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.business_owner(id) ON DELETE CASCADE
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON public.staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_business_id ON public.staff_permissions(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_access_logs_staff_id ON public.staff_access_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_access_logs_session_id ON public.staff_access_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_staff_id ON public.staff_role_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_role_name ON public.staff_role_assignments(role_name);

-- 8. Create function to automatically assign default permissions based on role
CREATE OR REPLACE FUNCTION assign_default_role_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default permissions for the new staff member based on their role
  INSERT INTO public.staff_permissions (staff_id, business_id, permission_name, granted_by)
  SELECT 
    NEW.id,
    NEW.business_id,
    jsonb_array_elements_text(template.permissions),
    NEW.business_id -- Use business_id as granted_by for default permissions
  FROM public.role_permission_templates template
  WHERE template.role_name = NEW.role
    AND template.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically assign permissions when staff is created
DROP TRIGGER IF EXISTS trigger_assign_default_permissions ON public.staff;
CREATE TRIGGER trigger_assign_default_permissions
  AFTER INSERT ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role_permissions();

-- 10. Create function to update staff permissions from role template
CREATE OR REPLACE FUNCTION update_staff_permissions_from_role(staff_uuid uuid, new_role text)
RETURNS void AS $$
BEGIN
  -- Remove existing permissions for this staff member
  DELETE FROM public.staff_permissions WHERE staff_id = staff_uuid;
  
  -- Insert new permissions based on the role template
  INSERT INTO public.staff_permissions (staff_id, business_id, permission_name, granted_by)
  SELECT 
    staff_uuid,
    s.business_id,
    jsonb_array_elements_text(template.permissions),
    s.business_id
  FROM public.staff s
  JOIN public.role_permission_templates template ON template.role_name = new_role
  WHERE s.id = staff_uuid
    AND template.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to check if staff has permission
CREATE OR REPLACE FUNCTION staff_has_permission(staff_uuid uuid, permission_name text)
RETURNS boolean AS $$
DECLARE
  has_perm boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.staff_permissions sp
    WHERE sp.staff_id = staff_uuid
      AND sp.permission_name = permission_name
      AND sp.is_granted = true
      AND (sp.expires_at IS NULL OR sp.expires_at > now())
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to log staff access attempts
CREATE OR REPLACE FUNCTION log_staff_access(
  p_staff_id uuid,
  p_business_id uuid,
  p_session_id uuid,
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_permission_required text DEFAULT NULL,
  p_access_granted boolean DEFAULT true,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.staff_access_logs (
    staff_id, business_id, session_id, action, resource_type, 
    resource_id, permission_required, access_granted, ip_address, user_agent
  ) VALUES (
    p_staff_id, p_business_id, p_session_id, p_action, p_resource_type,
    p_resource_id, p_permission_required, p_access_granted, p_ip_address, p_user_agent
  );
END;
$$ LANGUAGE plpgsql;

-- 13. Update existing staff to have proper permissions based on their roles
DO $$
DECLARE
  staff_record RECORD;
BEGIN
  FOR staff_record IN SELECT id, business_id, role FROM public.staff WHERE role IS NOT NULL
  LOOP
    -- Remove any existing permissions for this staff member
    DELETE FROM public.staff_permissions WHERE staff_id = staff_record.id;
    
    -- Insert default permissions based on their role
    INSERT INTO public.staff_permissions (staff_id, business_id, permission_name, granted_by)
    SELECT 
      staff_record.id,
      staff_record.business_id,
      jsonb_array_elements_text(template.permissions),
      staff_record.business_id
    FROM public.role_permission_templates template
    WHERE template.role_name = staff_record.role
      AND template.is_active = true;
  END LOOP;
END $$;

-- 14. Add RLS policies for staff permissions
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permission_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_permissions
CREATE POLICY "Business owners can manage staff permissions" ON public.staff_permissions
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.business_owner WHERE id = business_id
    )
  );

-- RLS policies for staff_access_logs
CREATE POLICY "Business owners can view access logs" ON public.staff_access_logs
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.business_owner WHERE id = business_id
    )
  );

-- RLS policies for staff_role_assignments
CREATE POLICY "Business owners can manage role assignments" ON public.staff_role_assignments
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.business_owner WHERE id = business_id
    )
  );

-- RLS policies for role_permission_templates (read-only for business owners)
CREATE POLICY "Business owners can view role templates" ON public.role_permission_templates
  FOR SELECT USING (true);

-- 15. Create view for staff with permissions summary
CREATE OR REPLACE VIEW public.staff_permissions_summary AS
SELECT 
  s.id,
  s.business_id,
  s.first_name,
  s.last_name,
  s.role,
  s.is_active,
  s.created_at,
  array_agg(DISTINCT sp.permission_name) FILTER (WHERE sp.is_granted = true) as granted_permissions,
  array_agg(DISTINCT sp.permission_name) FILTER (WHERE sp.is_granted = false) as denied_permissions,
  count(DISTINCT CASE WHEN sp.is_granted = true THEN sp.permission_name END) as total_granted_permissions,
  count(DISTINCT CASE WHEN sp.is_granted = false THEN sp.permission_name END) as total_denied_permissions
FROM public.staff s
LEFT JOIN public.staff_permissions sp ON s.id = sp.staff_id
WHERE (sp.expires_at IS NULL OR sp.expires_at > now())
GROUP BY s.id, s.business_id, s.first_name, s.last_name, s.role, s.is_active, s.created_at;

-- Grant appropriate permissions
GRANT SELECT ON public.staff_permissions_summary TO authenticated;
GRANT SELECT ON public.role_permission_templates TO authenticated;
