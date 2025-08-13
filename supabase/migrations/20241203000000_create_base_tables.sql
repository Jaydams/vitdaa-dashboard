-- Base Tables for Staff Management System
-- These tables must be created before the hybrid authentication system

-- Businesses Table
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

-- Staff Table
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
    manager_id UUID REFERENCES staff(id),
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
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT unique_employee_id_per_business UNIQUE (business_id, employee_id),
    CONSTRAINT valid_employment_dates CHECK (hire_date <= CURRENT_DATE)
);

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

-- Indexes for performance
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

-- Row Level Security (RLS)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_salary_history ENABLE ROW LEVEL SECURITY;

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

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_documents_updated_at BEFORE UPDATE ON staff_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_shifts_updated_at BEFORE UPDATE ON staff_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_performance_reviews_updated_at BEFORE UPDATE ON staff_performance_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE businesses IS 'Core business entities that own staff and manage operations';
COMMENT ON TABLE staff IS 'Employee records with comprehensive HR information';
COMMENT ON TABLE staff_documents IS 'Document management for staff files and certifications';
COMMENT ON TABLE staff_shifts IS 'Shift scheduling and time tracking for staff';
COMMENT ON TABLE staff_performance_reviews IS 'Performance evaluation and review system';
COMMENT ON TABLE staff_salary_history IS 'Salary change tracking and audit trail';