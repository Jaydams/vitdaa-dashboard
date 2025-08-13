# Comprehensive Staff Management Migration

## Overview

This migration adds comprehensive staff management capabilities to the existing staff system, including salary management, shift scheduling, performance tracking, document management, and enhanced activity monitoring.

## Files

- `2025-07-31_comprehensive_staff_management.sql` - Main migration script
- `2025-07-31_comprehensive_staff_management_rollback.sql` - Rollback script
- `README_comprehensive_staff_management.md` - This documentation

## Changes Made

### 1. Enhanced Staff Table

Added new columns to the existing `staff` table:

- `profile_image_url` - URL for staff profile photo
- `date_of_birth` - Staff member's date of birth
- `address` - JSON field for address information
- `emergency_contact_name` - Emergency contact name
- `emergency_contact_phone` - Emergency contact phone number
- `emergency_contact_relationship` - Relationship to emergency contact
- `employment_start_date` - Date of employment start (defaults to current date)
- `employment_end_date` - Date of employment end (nullable)
- `department` - Department assignment
- `employee_id` - Unique employee identifier
- `notes` - General notes about the staff member

### 2. New Tables Created

#### staff_salary

Manages salary and compensation information:

- Base salary, hourly rate, commission rate
- Salary type (hourly, monthly, annual)
- Payment frequency (weekly, bi-weekly, monthly)
- Effective date ranges for salary history
- Bonus eligibility tracking

#### staff_shifts

Handles shift scheduling and time tracking:

- Scheduled vs actual start/end times
- Break duration tracking
- Shift status (scheduled, in_progress, completed, missed, cancelled)
- Notes for each shift

#### staff_performance_reviews

Tracks performance evaluations:

- Review periods and ratings (1-5 scale)
- Performance metrics (JSON)
- Goals and achievements tracking
- Areas for improvement and comments
- Review status workflow

#### staff_documents

Manages employment documents:

- Document types (contract, ID, tax forms, certifications, etc.)
- File storage with metadata
- Expiration date tracking
- Required document flagging
- Upload tracking

#### staff_attendance

Records attendance and time tracking:

- Clock-in/clock-out times
- Total hours worked and overtime
- Attendance status (present, absent, late, early departure)
- Links to scheduled shifts

### 3. Enhanced Session Activity

Added new columns to `staff_session_activity`:

- `screens_accessed` - JSON array of accessed screens
- `tasks_completed` - JSON array of completed tasks
- `productivity_score` - Calculated productivity metric
- `break_time_minutes` - Time spent on breaks
- `active_time_minutes` - Active working time

### 4. Performance Indexes

Created indexes on frequently queried columns:

- Staff table: business_id, role, is_active, employee_id, employment dates
- All new tables: staff_id, business_id, and relevant date/status columns
- Composite indexes for date ranges and common query patterns

### 5. Database Triggers

Added `updated_at` triggers for all new tables to automatically update timestamps.

## Usage Instructions

### Running the Migration

```sql
-- Execute the main migration
\i database/migrations/2025-07-31_comprehensive_staff_management.sql
```

### Rolling Back

```sql
-- Execute the rollback script if needed
\i database/migrations/2025-07-31_comprehensive_staff_management_rollback.sql
```

## Requirements Addressed

This migration addresses the following requirements from the comprehensive staff management specification:

- 1.1: Staff profile management with comprehensive information
- 2.1: Salary and compensation tracking
- 3.1: Shift scheduling and time management
- 4.1: Attendance tracking and monitoring
- 5.1: Enhanced session activity monitoring
- 6.1: Performance review and evaluation system
- 7.1: Document management and compliance
- 10.1: Staff lifecycle management with employment history

## Data Integrity

- All new tables include proper foreign key constraints
- Cascade deletes are configured to maintain referential integrity
- Check constraints ensure data validity (e.g., rating scales, status values)
- Unique constraints prevent duplicate employee IDs

## Security Considerations

- Document URLs should point to secure storage locations
- Sensitive salary information requires proper access controls
- Personal information (DOB, address) needs privacy protection
- Audit trails are maintained through created_at/updated_at timestamps

## Performance Considerations

- Indexes are optimized for common query patterns
- JSON fields are used for flexible data storage where appropriate
- Date range queries are optimized with composite indexes
- Foreign key relationships enable efficient joins
