-- =====================================================
-- HYBRID AUTHENTICATION ADDON FOR EXISTING DATABASE
-- This script adds hybrid authentication features to your existing schema
-- =====================================================

-- Add missing columns to existing staff table for hybrid authentication
ALTER TABLE staff ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Create restaurant_shifts table for shift-based access control
CREATE TABLE IF NOT EXISTS restaurant_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shift_name TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    max_staff_sessions INTEGER DEFAULT 50,
    auto_end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_shift_times CHECK (ended_at IS NULL OR ended_at > started_at),
    CONSTRAINT positive_max_sessions CHECK (max_staff_sessions > 0)
);

-- Update existing admin_sessions table structure for hybrid auth
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update existing staff_sessions table for hybrid auth
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES restaurant_shifts(id) ON DELETE CASCADE;
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    business_id UUID REFERENCES business_owner(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_shifts_business_active ON restaurant_shifts(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_shifts_admin ON restaurant_shifts(admin_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_shifts_auto_end ON restaurant_shifts(auto_end_time) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_admin_sessions_business_active ON admin_sessions(business_owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_activity ON admin_sessions(last_activity) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_sessions_shift ON staff_sessions(shift_id) WHERE shift_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_sessions_activity ON staff_sessions(last_activity) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_staff_pin_lookup ON staff(business_id, is_active) WHERE pin_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_locked ON staff(locked_until) WHERE locked_until IS NOT NULL;

-- Enable Row Level Security for new tables
ALTER TABLE restaurant_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurant_shifts
CREATE POLICY "Restaurant shifts are viewable by business owners" ON restaurant_shifts
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM business_owner WHERE id = auth.uid()
        )
    );

CREATE POLICY "Restaurant shifts are manageable by business owners" ON restaurant_shifts
    FOR ALL USING (
        business_id IN (
            SELECT id FROM business_owner WHERE id = auth.uid()
        )
    );

-- RLS Policies for audit_logs
CREATE POLICY "Audit logs are viewable by business owners" ON audit_logs
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM business_owner WHERE id = auth.uid()
        )
    );

CREATE POLICY "Audit logs are insertable by authenticated users" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            business_id IN (
                SELECT id FROM business_owner WHERE id = auth.uid()
            ) OR
            staff_id IN (
                SELECT id FROM staff WHERE business_id IN (
                    SELECT id FROM business_owner WHERE id = auth.uid()
                )
            )
        )
    );

-- Functions for session management
CREATE OR REPLACE FUNCTION end_expired_shifts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- End shifts that have passed their auto_end_time
    UPDATE restaurant_shifts 
    SET is_active = false, ended_at = NOW()
    WHERE is_active = true 
    AND auto_end_time IS NOT NULL 
    AND auto_end_time < NOW();
    
    -- End staff sessions for inactive shifts
    UPDATE staff_sessions 
    SET is_active = false
    WHERE is_active = true 
    AND shift_id IN (
        SELECT id FROM restaurant_shifts WHERE is_active = false
    );
END;
$$;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- End expired staff sessions
    UPDATE staff_sessions 
    SET is_active = false
    WHERE is_active = true 
    AND expires_at < NOW();
    
    -- End inactive admin sessions (24 hours)
    UPDATE admin_sessions 
    SET is_active = false
    WHERE is_active = true 
    AND last_activity < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to get active session count for a business
CREATE OR REPLACE FUNCTION get_active_session_count(p_business_id UUID)
RETURNS TABLE(
    admin_sessions_count BIGINT,
    staff_sessions_count BIGINT,
    total_sessions_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM admin_sessions WHERE business_owner_id = p_business_id AND is_active = true) as admin_sessions_count,
        (SELECT COUNT(*) FROM staff_sessions WHERE business_id = p_business_id AND is_active = true) as staff_sessions_count,
        (SELECT COUNT(*) FROM admin_sessions WHERE business_owner_id = p_business_id AND is_active = true) +
        (SELECT COUNT(*) FROM staff_sessions WHERE business_id = p_business_id AND is_active = true) as total_sessions_count;
END;
$$;

-- Trigger function for audit logging
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
            CASE WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.business_owner_id ELSE NEW.business_id END,
            CASE WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.admin_id ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'staff_sessions' THEN NEW.staff_id ELSE NULL END,
            TG_TABLE_NAME || '_created',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object(
                'session_token', LEFT(NEW.session_token, 8) || '...',
                'ip_address', NEW.ip_address,
                'created_at', COALESCE(NEW.created_at, NEW.signed_in_at)
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
                CASE WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.business_owner_id ELSE NEW.business_id END,
                CASE WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.admin_id ELSE NULL END,
                CASE WHEN TG_TABLE_NAME = 'staff_sessions' THEN NEW.staff_id ELSE NULL END,
                TG_TABLE_NAME || '_ended',
                TG_TABLE_NAME,
                NEW.id,
                jsonb_build_object(
                    'session_token', LEFT(NEW.session_token, 8) || '...',
                    'duration_minutes', EXTRACT(EPOCH FROM (NOW() - COALESCE(NEW.created_at, NEW.signed_in_at)))/60,
                    'ended_at', NOW()
                )
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Create triggers for audit logging (drop existing first to avoid conflicts)
DROP TRIGGER IF EXISTS audit_admin_sessions ON admin_sessions;
CREATE TRIGGER audit_admin_sessions
    AFTER INSERT OR UPDATE ON admin_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_session_changes();

DROP TRIGGER IF EXISTS audit_staff_sessions ON staff_sessions;
CREATE TRIGGER audit_staff_sessions
    AFTER INSERT OR UPDATE ON staff_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_session_changes();

-- Enable Realtime for Required Tables
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE restaurant_shifts IS 'Time-bound permission gates that control when staff can login';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for security and compliance';

COMMENT ON COLUMN staff.position IS 'Staff job position/title';
COMMENT ON COLUMN staff.failed_login_attempts IS 'Counter for failed PIN attempts to prevent brute force';
COMMENT ON COLUMN staff.locked_until IS 'Timestamp until which account is locked after failed attempts';

-- =====================================================
-- HYBRID AUTHENTICATION ADDON COMPLETE!
-- 
-- Added to your existing database:
-- ✅ Enhanced staff table with hybrid auth columns
-- ✅ Restaurant shifts table for time-bound access control
-- ✅ Enhanced admin_sessions and staff_sessions tables
-- ✅ Audit logs table for security tracking
-- ✅ Realtime enabled for instant updates
-- ✅ Row Level Security (RLS) policies
-- ✅ Performance indexes
-- ✅ Session management functions
-- ✅ Audit logging triggers
-- 
-- Your hybrid authentication system is now ready!
-- =====================================================