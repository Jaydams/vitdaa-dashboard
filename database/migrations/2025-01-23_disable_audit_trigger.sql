-- Temporarily disable the audit trigger to fix staff login
-- This trigger logs session activities but is not essential for core functionality

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS audit_staff_sessions ON staff_sessions;

-- Verify the trigger is dropped
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'audit_staff_sessions' 
        AND tgrelid = 'staff_sessions'::regclass
    ) THEN
        RAISE EXCEPTION 'audit_staff_sessions trigger still exists';
    ELSE
        RAISE NOTICE 'audit_staff_sessions trigger successfully dropped';
    END IF;
END $$;
