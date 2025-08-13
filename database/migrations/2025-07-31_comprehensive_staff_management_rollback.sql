-- Rollback script for Comprehensive Staff Management System Migration
-- This script removes all tables and columns added by the comprehensive staff management migration

-- Drop indexes first
DROP INDEX IF EXISTS idx_staff_business_id;
DROP INDEX IF EXISTS idx_staff_role;
DROP INDEX IF EXISTS idx_staff_is_active;
DROP INDEX IF EXISTS idx_staff_employee_id;
DROP INDEX IF EXISTS idx_staff_employment_dates;

DROP INDEX IF EXISTS idx_staff_salary_staff_id;
DROP INDEX IF EXISTS idx_staff_salary_business_id;
DROP INDEX IF EXISTS idx_staff_salary_is_current;
DROP INDEX IF EXISTS idx_staff_salary_effective_date;

DROP INDEX IF EXISTS idx_staff_shifts_staff_id;
DROP INDEX IF EXISTS idx_staff_shifts_business_id;
DROP INDEX IF EXISTS idx_staff_shifts_date;
DROP INDEX IF EXISTS idx_staff_shifts_status;
DROP INDEX IF EXISTS idx_staff_shifts_date_range;

DROP INDEX IF EXISTS idx_staff_performance_reviews_staff_id;
DROP INDEX IF EXISTS idx_staff_performance_reviews_business_id;
DROP INDEX IF EXISTS idx_staff_performance_reviews_reviewer_id;
DROP INDEX IF EXISTS idx_staff_performance_reviews_period;
DROP INDEX IF EXISTS idx_staff_performance_reviews_status;

DROP INDEX IF EXISTS idx_staff_documents_staff_id;
DROP INDEX IF EXISTS idx_staff_documents_business_id;
DROP INDEX IF EXISTS idx_staff_documents_type;
DROP INDEX IF EXISTS idx_staff_documents_expiration;
DROP INDEX IF EXISTS idx_staff_documents_required;

DROP INDEX IF EXISTS idx_staff_attendance_staff_id;
DROP INDEX IF EXISTS idx_staff_attendance_business_id;
DROP INDEX IF EXISTS idx_staff_attendance_date;
DROP INDEX IF EXISTS idx_staff_attendance_status;
DROP INDEX IF EXISTS idx_staff_attendance_shift_id;

DROP INDEX IF EXISTS idx_staff_session_activity_staff_id;
DROP INDEX IF EXISTS idx_staff_session_activity_business_id;
DROP INDEX IF EXISTS idx_staff_session_activity_last_activity;

-- Drop triggers
DROP TRIGGER IF EXISTS update_staff_salary_updated_at ON public.staff_salary;
DROP TRIGGER IF EXISTS update_staff_shifts_updated_at ON public.staff_shifts;
DROP TRIGGER IF EXISTS update_staff_performance_reviews_updated_at ON public.staff_performance_reviews;
DROP TRIGGER IF EXISTS update_staff_documents_updated_at ON public.staff_documents;
DROP TRIGGER IF EXISTS update_staff_attendance_updated_at ON public.staff_attendance;

-- Drop new tables (in reverse order due to foreign key dependencies)
DROP TABLE IF EXISTS public.staff_attendance;
DROP TABLE IF EXISTS public.staff_documents;
DROP TABLE IF EXISTS public.staff_performance_reviews;
DROP TABLE IF EXISTS public.staff_shifts;
DROP TABLE IF EXISTS public.staff_salary;

-- Remove new columns from staff_session_activity table
ALTER TABLE public.staff_session_activity
DROP COLUMN IF EXISTS screens_accessed,
DROP COLUMN IF EXISTS tasks_completed,
DROP COLUMN IF EXISTS productivity_score,
DROP COLUMN IF EXISTS break_time_minutes,
DROP COLUMN IF EXISTS active_time_minutes;

-- Remove new columns from staff table
ALTER TABLE public.staff
DROP COLUMN IF EXISTS profile_image_url,
DROP COLUMN IF EXISTS date_of_birth,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS emergency_contact_name,
DROP COLUMN IF EXISTS emergency_contact_phone,
DROP COLUMN IF EXISTS emergency_contact_relationship,
DROP COLUMN IF EXISTS employment_start_date,
DROP COLUMN IF EXISTS employment_end_date,
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS employee_id,
DROP COLUMN IF EXISTS notes;

-- Drop the unique constraint
ALTER TABLE public.staff
DROP CONSTRAINT IF EXISTS staff_employee_id_unique;