-- Comprehensive Staff Management System Migration
-- This migration adds new tables and columns for enhanced staff management

-- 1. Add new columns to existing staff table for enhanced profile information
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS address jsonb,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
ADD COLUMN IF NOT EXISTS employment_start_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS employment_end_date date,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS employee_id text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add unique constraint for employee_id
ALTER TABLE public.staff
ADD CONSTRAINT staff_employee_id_unique UNIQUE (employee_id);

-- 2. Create staff_salary table for salary and compensation management
CREATE TABLE IF NOT EXISTS public.staff_salary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  base_salary numeric,
  hourly_rate numeric,
  salary_type text NOT NULL CHECK (salary_type = ANY (ARRAY['hourly'::text, 'monthly'::text, 'annual'::text])),
  payment_frequency text NOT NULL CHECK (payment_frequency = ANY (ARRAY['weekly'::text, 'bi_weekly'::text, 'monthly'::text])),
  commission_rate numeric DEFAULT 0,
  bonus_eligible boolean DEFAULT false,
  effective_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_salary_pkey PRIMARY KEY (id),
  CONSTRAINT staff_salary_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_salary_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE
);

-- 3. Create staff_shifts table for shift scheduling
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  shift_date date NOT NULL,
  scheduled_start_time time NOT NULL,
  scheduled_end_time time NOT NULL,
  actual_start_time time,
  actual_end_time time,
  break_duration_minutes integer DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'missed'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_shifts_pkey PRIMARY KEY (id),
  CONSTRAINT staff_shifts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_shifts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE
);

-- 4. Create staff_performance_reviews table for performance management
CREATE TABLE IF NOT EXISTS public.staff_performance_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  goals jsonb DEFAULT '[]'::jsonb,
  achievements jsonb DEFAULT '[]'::jsonb,
  areas_for_improvement text,
  comments text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'completed'::text, 'approved'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_performance_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT staff_performance_reviews_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_performance_reviews_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT staff_performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.business_owner(id) ON DELETE CASCADE
);

-- 5. Create staff_documents table for document management
CREATE TABLE IF NOT EXISTS public.staff_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type = ANY (ARRAY['contract'::text, 'id_document'::text, 'tax_form'::text, 'certification'::text, 'training_record'::text, 'other'::text])),
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  expiration_date date,
  is_required boolean DEFAULT false,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_documents_pkey PRIMARY KEY (id),
  CONSTRAINT staff_documents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_documents_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT staff_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.business_owner(id) ON DELETE CASCADE
);

-- 6. Create staff_attendance table for attendance tracking
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  shift_id uuid,
  attendance_date date NOT NULL,
  clock_in_time timestamp with time zone,
  clock_out_time timestamp with time zone,
  total_hours_worked numeric,
  overtime_hours numeric DEFAULT 0,
  status text NOT NULL CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'early_departure'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_attendance_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT staff_attendance_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.staff_shifts(id) ON DELETE SET NULL
);

-- 7. Enhance existing staff_session_activity table with additional columns
ALTER TABLE public.staff_session_activity
ADD COLUMN IF NOT EXISTS screens_accessed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tasks_completed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS productivity_score numeric,
ADD COLUMN IF NOT EXISTS break_time_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_time_minutes integer DEFAULT 0;

-- 8. Create indexes for performance optimization on frequently queried columns

-- Indexes for staff table
CREATE INDEX IF NOT EXISTS idx_staff_business_id ON public.staff(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON public.staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON public.staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_employment_dates ON public.staff(employment_start_date, employment_end_date);

-- Indexes for staff_salary table
CREATE INDEX IF NOT EXISTS idx_staff_salary_staff_id ON public.staff_salary(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_salary_business_id ON public.staff_salary(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_salary_is_current ON public.staff_salary(is_current);
CREATE INDEX IF NOT EXISTS idx_staff_salary_effective_date ON public.staff_salary(effective_date);

-- Indexes for staff_shifts table
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_id ON public.staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_business_id ON public.staff_shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON public.staff_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_status ON public.staff_shifts(status);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date_range ON public.staff_shifts(shift_date, scheduled_start_time, scheduled_end_time);

-- Indexes for staff_performance_reviews table
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_staff_id ON public.staff_performance_reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_business_id ON public.staff_performance_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_reviewer_id ON public.staff_performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_period ON public.staff_performance_reviews(review_period_start, review_period_end);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_status ON public.staff_performance_reviews(status);

-- Indexes for staff_documents table
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON public.staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_business_id ON public.staff_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_type ON public.staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_staff_documents_expiration ON public.staff_documents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_staff_documents_required ON public.staff_documents(is_required);

-- Indexes for staff_attendance table
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_id ON public.staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_business_id ON public.staff_attendance(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON public.staff_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_status ON public.staff_attendance(status);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_shift_id ON public.staff_attendance(shift_id);

-- Indexes for enhanced staff_session_activity table
CREATE INDEX IF NOT EXISTS idx_staff_session_activity_staff_id ON public.staff_session_activity(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_session_activity_business_id ON public.staff_session_activity(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_session_activity_last_activity ON public.staff_session_activity(last_activity_at);

-- 9. Add comments to tables for documentation
COMMENT ON TABLE public.staff_salary IS 'Stores salary and compensation information for staff members';
COMMENT ON TABLE public.staff_shifts IS 'Manages staff shift scheduling and time tracking';
COMMENT ON TABLE public.staff_performance_reviews IS 'Tracks staff performance reviews and evaluations';
COMMENT ON TABLE public.staff_documents IS 'Manages staff documents and compliance records';
COMMENT ON TABLE public.staff_attendance IS 'Tracks staff attendance and time records';

-- 10. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_staff_salary_updated_at BEFORE UPDATE ON public.staff_salary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_shifts_updated_at BEFORE UPDATE ON public.staff_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_performance_reviews_updated_at BEFORE UPDATE ON public.staff_performance_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_documents_updated_at BEFORE UPDATE ON public.staff_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_attendance_updated_at BEFORE UPDATE ON public.staff_attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();