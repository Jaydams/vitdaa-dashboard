-- Complete fix for audit_session_changes function and trigger
-- This will completely drop and recreate everything to ensure the fix is applied

-- First, drop the existing trigger
DROP TRIGGER IF EXISTS audit_staff_sessions ON staff_sessions;
DROP TRIGGER IF EXISTS audit_admin_sessions ON admin_sessions;

-- Drop the existing function completely
DROP FUNCTION IF EXISTS audit_session_changes();

-- Create the corrected function
CREATE OR REPLACE FUNCTION audit_session_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            business_id,
            admin_id,
            staff_id,
            action,
            target_type,
            target_id,
            details
        ) VALUES (
            CASE 
                WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.business_owner_id 
                WHEN TG_TABLE_NAME = 'staff_sessions' THEN NEW.business_id 
                ELSE NEW.business_id 
            END,
            CASE WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.admin_id ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'staff_sessions' THEN NEW.staff_id ELSE NULL END,
            TG_TABLE_NAME || '_created',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object(
                'session_token', LEFT(NEW.session_token, 8) || '...',
                'ip_address', COALESCE(NEW.ip_address, 'unknown'),
                'created_at', COALESCE(NEW.created_at, NEW.signed_in_at, NOW())
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active = true AND NEW.is_active = false THEN
            INSERT INTO audit_logs (
                business_id,
                admin_id,
                staff_id,
                action,
                target_type,
                target_id,
                details
            ) VALUES (
                CASE 
                    WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.business_owner_id 
                    WHEN TG_TABLE_NAME = 'staff_sessions' THEN NEW.business_id 
                    ELSE NEW.business_id 
                END,
                CASE WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.admin_id ELSE NULL END,
                CASE WHEN TG_TABLE_NAME = 'staff_sessions' THEN NEW.staff_id ELSE NULL END,
                TG_TABLE_NAME || '_ended',
                TG_TABLE_NAME,
                NEW.id,
                jsonb_build_object(
                    'session_token', LEFT(NEW.session_token, 8) || '...',
                    'duration_minutes', EXTRACT(EPOCH FROM (NOW() - COALESCE(NEW.created_at, NEW.signed_in_at, NOW())))/60,
                    'ended_at', NOW()
                )
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER audit_admin_sessions
    AFTER INSERT OR UPDATE ON admin_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_session_changes();

CREATE TRIGGER audit_staff_sessions
    AFTER INSERT OR UPDATE ON staff_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_session_changes();

-- Verify the function and triggers are created correctly
DO $$
BEGIN
    -- Check if function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'audit_session_changes'
    ) THEN
        RAISE EXCEPTION 'audit_session_changes function was not created';
    END IF;
    
    -- Check if triggers exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'audit_staff_sessions' 
        AND tgrelid = 'staff_sessions'::regclass
    ) THEN
        RAISE EXCEPTION 'audit_staff_sessions trigger was not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'audit_admin_sessions' 
        AND tgrelid = 'admin_sessions'::regclass
    ) THEN
        RAISE EXCEPTION 'audit_admin_sessions trigger was not created';
    END IF;
    
    RAISE NOTICE 'All audit functions and triggers created successfully';
END $$;
