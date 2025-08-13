-- Security audit logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'staff_pin_failure',
        'staff_pin_success', 
        'staff_pin_lockout',
        'admin_pin_failure',
        'admin_pin_success',
        'admin_pin_lockout',
        'unauthorized_access_attempt',
        'session_hijack_attempt',
        'permission_violation',
        'suspicious_activity',
        'account_lockout',
        'password_reset_attempt',
        'multiple_login_attempts',
        'session_expired',
        'forced_logout'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES business_owner(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for security audit logs
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_business_id ON security_audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_staff_id ON security_audit_logs(staff_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_business_created ON security_audit_logs(business_id, created_at DESC);

-- Rate limiting table for persistent storage
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('staff_pin', 'admin_pin')),
    identifier TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint for rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_type_identifier ON rate_limits(type, identifier);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_locked_until ON rate_limits(locked_until);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at ON rate_limits(updated_at);

-- Admin sessions table for elevated access tracking
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_owner_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    required_for TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for admin sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_business_owner_id ON admin_sessions(business_owner_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_active ON admin_sessions(is_active);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for rate_limits table
CREATE TRIGGER update_rate_limits_updated_at 
    BEFORE UPDATE ON rate_limits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Security audit logs RLS
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their own security logs" ON security_audit_logs
    FOR SELECT USING (
        business_id = auth.uid() OR 
        user_id = auth.uid()
    );

CREATE POLICY "System can insert security logs" ON security_audit_logs
    FOR INSERT WITH CHECK (true);

-- Rate limits RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits" ON rate_limits
    FOR ALL USING (true);

-- Admin sessions RLS  
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their own admin sessions" ON admin_sessions
    FOR SELECT USING (business_owner_id = auth.uid());

CREATE POLICY "System can manage admin sessions" ON admin_sessions
    FOR ALL USING (true);

-- Add admin_pin_hash column to business_owner table if it doesn't exist
ALTER TABLE business_owner 
ADD COLUMN IF NOT EXISTS admin_pin_hash TEXT;

-- Comments for documentation
COMMENT ON TABLE security_audit_logs IS 'Audit trail for security events and authentication attempts';
COMMENT ON TABLE rate_limits IS 'Rate limiting data for PIN authentication attempts';
COMMENT ON TABLE admin_sessions IS 'Elevated admin sessions for sensitive operations';

COMMENT ON COLUMN business_owner.admin_pin_hash IS 'Hashed admin PIN for elevated access operations';

COMMENT ON COLUMN security_audit_logs.event_type IS 'Type of security event that occurred';
COMMENT ON COLUMN security_audit_logs.severity IS 'Severity level of the security event';
COMMENT ON COLUMN security_audit_logs.details IS 'Additional details about the security event in JSON format';

COMMENT ON COLUMN rate_limits.type IS 'Type of rate limit (staff_pin or admin_pin)';
COMMENT ON COLUMN rate_limits.identifier IS 'Unique identifier for the rate limit (e.g., business_id + partial_pin)';
COMMENT ON COLUMN rate_limits.locked_until IS 'Timestamp until which the identifier is locked out';

COMMENT ON COLUMN admin_sessions.required_for IS 'The operation that required elevated admin access';
COMMENT ON COLUMN admin_sessions.session_token IS 'Secure token for the elevated admin session';