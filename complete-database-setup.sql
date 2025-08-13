-- =====================================================
-- COMPLETE DATABASE SETUP FOR HYBRID AUTHENTICATION SYSTEM
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- STEP 1: Base Tables for Staff Management System
-- These tables must be created before the hybrid authentication system

-- Businesses Table (Create or update existing)
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    industry TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Add missing columns to existing businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Staff Table (Create or update existing)
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    department TEXT,
    hire_date DATE,
    salary DECIMAL(10,2),
    hourly_rate DECIMAL(8,2),
    employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'intern')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    address TEXT,
    date_of_birth DATE,
    social_security_number TEXT, -- Should be encrypted in production
    bank_account_number TEXT, -- Should be encrypted in production
    tax_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Add missing columns to existing staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES staff(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS social_security_number TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraints if they don't exist
DO $$ 
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_employee_id_per_business'
    ) THEN
        ALTER TABLE staff ADD CONSTRAINT unique_employee_id_per_business UNIQUE (business_id, employee_id);
    END IF;
    
    -- Add check constraint for employment dates if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_employment_dates'
    ) THEN
        ALTER TABLE staff ADD CONSTRAINT valid_employment_dates CHECK (hire_date <= CURRENT_DATE);
    END IF;
    
    -- Add check constraint for employment type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'staff_employment_type_check'
    ) THEN
        ALTER TABLE staff ADD CONSTRAINT staff_employment_type_check CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'intern'));
    END IF;
    
    -- Add check constraint for status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'staff_status_check'
    ) THEN
        ALTER TABLE staff ADD CONSTRAINT staff_status_check CHECK (status IN ('active', 'inactive', 'terminated'));
    END IF;
END $$;

-- Staff Documents Table
CREATE TABLE IF NOT EXISTS staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date DATE,
    is_required BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Shifts Table
CREATE TABLE IF NOT EXISTS staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INTEGER DEFAULT 0, -- in minutes
    shift_type TEXT DEFAULT 'regular' CHECK (shift_type IN ('regular', 'overtime', 'holiday', 'sick', 'vacation')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show')),
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    actual_hours DECIMAL(4,2),
    scheduled_hours DECIMAL(4,2),
    hourly_rate DECIMAL(8,2),
    total_pay DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_shift_times CHECK (end_time > start_time),
    CONSTRAINT valid_break_duration CHECK (break_duration >= 0),
    CONSTRAINT valid_actual_hours CHECK (actual_hours >= 0)
);

-- Staff Performance Reviews Table
CREATE TABLE IF NOT EXISTS staff_performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_type TEXT DEFAULT 'annual' CHECK (review_type IN ('annual', 'quarterly', 'monthly', 'probationary', 'project-based')),
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    goals_achievement_rating INTEGER CHECK (goals_achievement_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    teamwork_rating INTEGER CHECK (teamwork_rating BETWEEN 1 AND 5),
    leadership_rating INTEGER CHECK (leadership_rating BETWEEN 1 AND 5),
    technical_skills_rating INTEGER CHECK (technical_skills_rating BETWEEN 1 AND 5),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals_for_next_period TEXT,
    reviewer_comments TEXT,
    employee_comments TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed', 'acknowledged')),
    review_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_review_period CHECK (review_period_end >= review_period_start)
);

-- Staff Salary History Table
CREATE TABLE IF NOT EXISTS staff_salary_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    previous_salary DECIMAL(10,2),
    new_salary DECIMAL(10,2),
    previous_hourly_rate DECIMAL(8,2),
    new_hourly_rate DECIMAL(8,2),
    change_type TEXT CHECK (change_type IN ('promotion', 'merit_increase', 'cost_of_living', 'demotion', 'correction')),
    change_reason TEXT,
    approved_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_salary_change CHECK (
        (previous_salary IS NOT NULL AND new_salary IS NOT NULL) OR 
        (previous_hourly_rate IS NOT NULL AND new_hourly_rate IS NOT NULL)
    )
);

-- STEP 2: Hybrid Authentication System Tables
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

-- STEP 3: Create Indexes for Performance Optimization

-- Base tables indexes
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(is_active);

CREATE INDEX IF NOT EXISTS idx_staff_business ON staff(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(business_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_manager ON staff(manager_id);
CREATE INDEX IF NOT EXISTS idx_staff_position ON staff(business_id, position);

CREATE INDEX IF NOT EXISTS idx_staff_documents_staff ON staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_business ON staff_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_type ON staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_staff_documents_expiry ON staff_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_business ON staff_shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_status ON staff_shifts(status);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_staff ON staff_performance_reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_business ON staff_performance_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON staff_performance_reviews(review_period_start, review_period_end);

CREATE INDEX IF NOT EXISTS idx_salary_history_staff ON staff_salary_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_history_effective_date ON staff_salary_history(effective_date);

-- Hybrid auth indexes
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

-- STEP 4: Enable Row Level Security (RLS)

-- Base tables RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_salary_history ENABLE ROW LEVEL SECURITY;

-- Hybrid auth tables RLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS Policies

-- RLS Policies for businesses
CREATE POLICY "Business owners can manage their businesses" ON businesses
    FOR ALL USING (owner_id = auth.uid());

-- RLS Policies for staff
CREATE POLICY "Business owners can manage their staff" ON staff
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- RLS Policies for staff_documents
CREATE POLICY "Business owners can manage staff documents" ON staff_documents
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- RLS Policies for staff_shifts
CREATE POLICY "Business owners can manage staff shifts" ON staff_shifts
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- RLS Policies for staff_performance_reviews
CREATE POLICY "Business owners can manage performance reviews" ON staff_performance_reviews
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- RLS Policies for staff_salary_history
CREATE POLICY "Business owners can manage salary history" ON staff_salary_history
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Admin Sessions RLS
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

-- STEP 6: Create Functions for Session Management

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

-- Function for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- STEP 7: Create Triggers

-- Triggers for updated_at columns (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_documents_updated_at ON staff_documents;
CREATE TRIGGER update_staff_documents_updated_at BEFORE UPDATE ON staff_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_shifts_updated_at ON staff_shifts;
CREATE TRIGGER update_staff_shifts_updated_at BEFORE UPDATE ON staff_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_performance_reviews_updated_at ON staff_performance_reviews;
CREATE TRIGGER update_staff_performance_reviews_updated_at BEFORE UPDATE ON staff_performance_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- STEP 8: Enable Realtime for Required Tables
-- This enables Supabase Realtime subscriptions for instant updates

ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- STEP 9: Grant Permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- STEP 10: Add Comments for Documentation
COMMENT ON TABLE businesses IS 'Core business entities that own staff and manage operations';
COMMENT ON TABLE staff IS 'Employee records with comprehensive HR information';
COMMENT ON TABLE staff_documents IS 'Document management for staff files and certifications';
COMMENT ON TABLE staff_shifts IS 'Shift scheduling and time tracking for staff';
COMMENT ON TABLE staff_performance_reviews IS 'Performance evaluation and review system';
COMMENT ON TABLE staff_salary_history IS 'Salary change tracking and audit trail';

COMMENT ON TABLE admin_sessions IS 'Tracks admin authentication sessions with Supabase auth integration';
COMMENT ON TABLE restaurant_shifts IS 'Time-bound permission gates that control when staff can login';
COMMENT ON TABLE staff_sessions IS 'Staff PIN-based sessions that depend on active shifts';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for security and compliance';

COMMENT ON COLUMN staff.pin_hash IS 'SHA-256 hash of staff PIN for secure authentication';
COMMENT ON COLUMN staff.failed_login_attempts IS 'Counter for failed PIN attempts to prevent brute force';
COMMENT ON COLUMN staff.locked_until IS 'Timestamp until which account is locked after failed attempts';

-- =====================================================
-- SETUP COMPLETE!
-- 
-- Your database now includes:
-- ✅ Base staff management tables
-- ✅ Hybrid authentication system (4-layer security)
-- ✅ Realtime enabled for instant updates
-- ✅ Row Level Security (RLS) policies
-- ✅ Performance indexes
-- ✅ Audit logging system
-- ✅ Session management functions
-- 
-- Next steps:
-- 1. Verify all tables were created successfully
-- 2. Test the realtime subscriptions
-- 3. Configure your environment variables
-- 4. Start using the hybrid authentication system!
-- =====================================================