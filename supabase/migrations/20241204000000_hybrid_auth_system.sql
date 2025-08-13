-- Hybrid Authentication System Database Schema
-- Four-layer authentication structure with hierarchical session management

-- Admin Sessions Table
-- Layer 1: Admin Authentication tracking
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Indexes for performance
    CONSTRAINT admin_sessions_token_unique UNIQUE (session_token)
);

-- Restaurant Shifts Table
-- Layer 2: Shift Control for time-bound access
CREATE TABLE IF NOT EXISTS restaurant_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
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

-- Staff Sessions Table (Enhanced)
-- Layer 3 & 4: Staff PIN Authentication and Session Management
CREATE TABLE IF NOT EXISTS staff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES restaurant_shifts(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    device_info JSONB,
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT staff_sessions_token_unique UNIQUE (session_token),
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Audit Logs Table
-- Security and compliance tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to existing staff table for enhanced PIN authentication
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_admin_sessions_business_active ON admin_sessions(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_activity ON admin_sessions(last_activity) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_restaurant_shifts_business_active ON restaurant_shifts(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_shifts_admin ON restaurant_shifts(admin_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_shifts_auto_end ON restaurant_shifts(auto_end_time) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_sessions_business_active ON staff_sessions(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff ON staff_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_shift ON staff_sessions(shift_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON staff_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_expiry ON staff_sessions(expires_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff ON audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_staff_pin_lookup ON staff(business_id, is_active) WHERE pin_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_locked ON staff(locked_until) WHERE locked_until IS NOT NULL;

-- Row Level Security (RLS) Policies

-- Admin Sessions RLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin sessions are viewable by business owners" ON admin_sessions
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Admin sessions are insertable by business owners" ON admin_sessions
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Admin sessions are updatable by business owners" ON admin_sessions
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Restaurant Shifts RLS
ALTER TABLE restaurant_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant shifts are viewable by business owners" ON restaurant_shifts
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Restaurant shifts are manageable by business owners" ON restaurant_shifts
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Staff Sessions RLS
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff sessions are viewable by business owners" ON staff_sessions
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff sessions are manageable by business owners" ON staff_sessions
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Audit Logs RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are viewable by business owners" ON audit_logs
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Audit logs are insertable by authenticated users" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            business_id IN (
                SELECT id FROM businesses WHERE owner_id = auth.uid()
            ) OR
            staff_id IN (
                SELECT id FROM staff WHERE business_id IN (
                    SELECT id FROM businesses WHERE owner_id = auth.uid()
                )
            )
        )
    );

-- Functions for session management

-- Function to automatically end expired shifts
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
        (SELECT COUNT(*) FROM admin_sessions WHERE business_id = p_business_id AND is_active = true) as admin_sessions_count,
        (SELECT COUNT(*) FROM staff_sessions WHERE business_id = p_business_id AND is_active = true) as staff_sessions_count,
        (SELECT COUNT(*) FROM admin_sessions WHERE business_id = p_business_id AND is_active = true) +
        (SELECT COUNT(*) FROM staff_sessions WHERE business_id = p_business_id AND is_active = true) as total_sessions_count;
END;
$$;

-- Triggers for audit logging

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
            NEW.business_id,
            CASE WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.admin_id ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'staff_sessions' THEN NEW.staff_id ELSE NULL END,
            TG_TABLE_NAME || '_created',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object(
                'session_token', LEFT(NEW.session_token, 8) || '...',
                'ip_address', NEW.ip_address,
                'created_at', NEW.created_at
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
                NEW.business_id,
                CASE WHEN TG_TABLE_NAME = 'admin_sessions' THEN NEW.admin_id ELSE NULL END,
                CASE WHEN TG_TABLE_NAME = 'staff_sessions' THEN NEW.staff_id ELSE NULL END,
                TG_TABLE_NAME || '_ended',
                TG_TABLE_NAME,
                NEW.id,
                jsonb_build_object(
                    'session_token', LEFT(NEW.session_token, 8) || '...',
                    'duration_minutes', EXTRACT(EPOCH FROM (NOW() - NEW.created_at))/60,
                    'ended_at', NOW()
                )
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS audit_admin_sessions ON admin_sessions;
CREATE TRIGGER audit_admin_sessions
    AFTER INSERT OR UPDATE ON admin_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_session_changes();

DROP TRIGGER IF EXISTS audit_staff_sessions ON staff_sessions;
CREATE TRIGGER audit_staff_sessions
    AFTER INSERT OR UPDATE ON staff_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_session_changes();

-- Create a scheduled job to clean up expired sessions (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-expired-sessions', '*/15 * * * *', 'SELECT cleanup_expired_sessions();');
-- SELECT cron.schedule('end-expired-shifts', '*/5 * * * *', 'SELECT end_expired_shifts();');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE admin_sessions IS 'Tracks admin authentication sessions with Supabase auth integration';
COMMENT ON TABLE restaurant_shifts IS 'Time-bound permission gates that control when staff can login';
COMMENT ON TABLE staff_sessions IS 'Staff PIN-based sessions that depend on active shifts';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for security and compliance';

COMMENT ON COLUMN staff.pin_hash IS 'SHA-256 hash of staff PIN for secure authentication';
COMMENT ON COLUMN staff.failed_login_attempts IS 'Counter for failed PIN attempts to prevent brute force';
COMMENT ON COLUMN staff.locked_until IS 'Timestamp until which account is locked after failed attempts';

-- Insert sample data for testing (optional)
-- This would be removed in production
/*
INSERT INTO restaurant_shifts (business_id, admin_id, shift_name, max_staff_sessions) 
SELECT 
    b.id,
    b.owner_id,
    'Morning Shift',
    25
FROM businesses b
WHERE b.owner_id IS NOT NULL
LIMIT 1;
*/