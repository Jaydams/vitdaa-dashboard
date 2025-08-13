-- Validation script to check if migration was successful
-- Run this after executing the main migration

-- Check if new columns were added to staff table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'staff' 
  AND table_schema = 'public'
  AND column_name IN (
    'profile_image_url', 'date_of_birth', 'address', 
    'emergency_contact_name', 'emergency_contact_phone', 
    'emergency_contact_relationship', 'employment_start_date', 
    'employment_end_date', 'department', 'employee_id', 'notes'
  )
ORDER BY column_name;

-- Check if new tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'staff_salary', 'staff_shifts', 'staff_performance_reviews',
    'staff_documents', 'staff_attendance'
  )
ORDER BY table_name;

-- Check if new columns were added to staff_session_activity
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'staff_session_activity' 
  AND table_schema = 'public'
  AND column_name IN (
    'screens_accessed', 'tasks_completed', 'productivity_score',
    'break_time_minutes', 'active_time_minutes'
  )
ORDER BY column_name;

-- Check if indexes were created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_staff_%'
ORDER BY tablename, indexname;

-- Check if constraints were created
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name IN ('staff', 'staff_salary', 'staff_shifts', 'staff_performance_reviews', 'staff_documents', 'staff_attendance')
  AND constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK')
ORDER BY table_name, constraint_type;