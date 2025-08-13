-- Re-enable the audit_staff_sessions trigger after fixing the audit_session_changes function
-- This trigger was temporarily disabled to fix the function that was incorrectly accessing business_owner_id

-- Re-enable the audit trigger for staff_sessions
CREATE TRIGGER audit_staff_sessions
    AFTER INSERT OR UPDATE ON staff_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_session_changes();

-- Verify the trigger is created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'audit_staff_sessions' 
        AND tgrelid = 'staff_sessions'::regclass
    ) THEN
        RAISE NOTICE 'audit_staff_sessions trigger successfully re-enabled';
    ELSE
        RAISE EXCEPTION 'Failed to create audit_staff_sessions trigger';
    END IF;
END $$;
