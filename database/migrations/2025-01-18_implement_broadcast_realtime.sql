-- Implement Broadcast Realtime for Restaurant Shifts
-- This migration implements the recommended Broadcast method for realtime updates

-- Create the broadcast authorization policy
CREATE POLICY "Authenticated users can receive broadcasts"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING ( true );

-- Create trigger function for restaurant_shifts table
CREATE OR REPLACE FUNCTION public.restaurant_shifts_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'topic:restaurant_shifts:' || COALESCE(NEW.business_id, OLD.business_id)::text, -- topic
    TG_OP,                                             -- event
    TG_OP,                                             -- operation
    TG_TABLE_NAME,                                     -- table
    TG_TABLE_SCHEMA,                                   -- schema
    NEW,                                               -- new record
    OLD                                                -- old record
  );
  RETURN NULL;
END;
$$;

-- Create trigger for restaurant_shifts table
DROP TRIGGER IF EXISTS handle_restaurant_shifts_changes ON public.restaurant_shifts;
CREATE TRIGGER handle_restaurant_shifts_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.restaurant_shifts
FOR EACH ROW
EXECUTE FUNCTION public.restaurant_shifts_changes();

-- Create trigger function for staff_sessions table
CREATE OR REPLACE FUNCTION public.staff_sessions_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'topic:staff_sessions:' || COALESCE(NEW.business_id, OLD.business_id)::text, -- topic
    TG_OP,                                             -- event
    TG_OP,                                             -- operation
    TG_TABLE_NAME,                                     -- table
    TG_TABLE_SCHEMA,                                   -- schema
    NEW,                                               -- new record
    OLD                                                -- old record
  );
  RETURN NULL;
END;
$$;

-- Create trigger for staff_sessions table
DROP TRIGGER IF EXISTS handle_staff_sessions_changes ON public.staff_sessions;
CREATE TRIGGER handle_staff_sessions_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.staff_sessions
FOR EACH ROW
EXECUTE FUNCTION public.staff_sessions_changes();

-- Create trigger function for admin_sessions table
CREATE OR REPLACE FUNCTION public.admin_sessions_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'topic:admin_sessions:' || COALESCE(NEW.business_owner_id, OLD.business_owner_id)::text, -- topic
    TG_OP,                                             -- event
    TG_OP,                                             -- operation
    TG_TABLE_NAME,                                     -- table
    TG_TABLE_SCHEMA,                                   -- schema
    NEW,                                               -- new record
    OLD                                                -- old record
  );
  RETURN NULL;
END;
$$;

-- Create trigger for admin_sessions table
DROP TRIGGER IF EXISTS handle_admin_sessions_changes ON public.admin_sessions;
CREATE TRIGGER handle_admin_sessions_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.admin_sessions
FOR EACH ROW
EXECUTE FUNCTION public.admin_sessions_changes();

-- Verify the triggers were created
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN (
  'handle_restaurant_shifts_changes',
  'handle_staff_sessions_changes',
  'handle_admin_sessions_changes'
); 