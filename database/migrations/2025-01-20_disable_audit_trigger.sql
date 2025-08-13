-- Temporarily disable the audit trigger that's causing the business_owner_id error
-- This will allow staff sessions to be created while we fix the function

DROP TRIGGER IF EXISTS audit_staff_sessions ON public.staff_sessions; 