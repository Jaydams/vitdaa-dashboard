-- Fix the audit_session_changes function to correctly handle staff_sessions table
-- The function was incorrectly trying to access business_owner_id for staff_sessions

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