# Design Document

## Overview

The Comprehensive Staff Management System extends the existing staff RBAC system to provide complete employee lifecycle management. The system centers around a detailed staff profile page that serves as a hub for all staff-related information and operations. When a business owner clicks on any staff member from the staff table, they are taken to a comprehensive staff management interface that includes personal information, salary management, shift scheduling, performance tracking, and detailed session monitoring.

The design builds upon the existing database schema while adding new tables for salary management, shift scheduling, performance tracking, and enhanced activity monitoring. The system maintains the current role-based access control while adding comprehensive management capabilities.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Staff Management Hub                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Staff Profile │  │ Salary & Payroll│  │   Scheduling │ │
│  │   Management    │  │   Management    │  │  Management  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Performance   │  │    Session &    │  │   Document   │ │
│  │   Tracking      │  │ Activity Monitor│  │  Management  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Staff Tables   │  │  Salary Tables  │  │ Schedule     │ │
│  │  (Existing)     │  │     (New)       │  │ Tables (New) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Performance    │  │   Activity &    │  │   Document   │ │
│  │ Tables (New)    │  │ Session Tables  │  │ Tables (New) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Flow

```
Staff Table → Click Staff Row → Comprehensive Staff Profile Page
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
            ┌───────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
            │   Profile &    │ │   Salary &      │ │   Schedule &    │
            │   Personal     │ │   Payroll       │ │   Time Tracking │
            │   Information  │ │   Management    │ │   Management    │
            └────────────────┘ └─────────────────┘ └─────────────────┘
                    │                   │                   │
            ┌───────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
            │   Performance  │ │   Session &     │ │   Documents &   │
            │   & Reviews    │ │   Activity      │ │   Compliance    │
            │   Management   │ │   Monitoring    │ │   Management    │
            └────────────────┘ └─────────────────┘ └─────────────────┘
```

## Components and Interfaces

### 1. Staff Profile Hub Component

**Location**: `app/(dashboard)/staff/[staffId]/page.tsx`

**Purpose**: Main staff management interface that displays comprehensive staff information in a tabbed or sectioned layout.

**Key Features**:

- Staff profile header with photo, name, role, and status
- Tabbed interface for different management sections
- Quick action buttons for common tasks
- Real-time session status indicator

**Props Interface**:

```typescript
interface StaffProfileHubProps {
  staffId: string;
  initialTab?:
    | "profile"
    | "salary"
    | "schedule"
    | "performance"
    | "sessions"
    | "documents";
}
```

### 2. Staff Profile Management Component

**Purpose**: Manages personal information, contact details, and employment information.

**Features**:

- Editable profile information
- Profile photo upload
- Emergency contact management
- Employment history tracking

### 3. Salary & Payroll Management Component

**Purpose**: Handles all compensation-related information and calculations.

**Features**:

- Current salary display and editing
- Salary history with change tracking
- Payroll calculation based on hours worked
- Commission and bonus tracking

### 4. Schedule Management Component

**Purpose**: Manages shift scheduling and time tracking.

**Features**:

- Weekly/monthly calendar view
- Shift creation and editing
- Attendance tracking
- Overtime calculation

### 5. Performance Tracking Component

**Purpose**: Tracks employee performance and evaluations.

**Features**:

- Performance review forms
- Goal setting and tracking
- Training and certification management
- Performance analytics

### 6. Session & Activity Monitor Component

**Purpose**: Provides detailed session monitoring and activity tracking.

**Features**:

- Real-time session status
- Detailed activity logs
- Productivity metrics
- Session history

### 7. Document Management Component

**Purpose**: Manages employment documents and compliance.

**Features**:

- Document upload and storage
- Compliance tracking
- Expiration date monitoring
- Secure document access

## Data Models

### New Database Tables

#### 1. Staff Salary Information

```sql
CREATE TABLE public.staff_salary (
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
  CONSTRAINT staff_salary_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT staff_salary_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);
```

#### 2. Staff Shifts and Scheduling

```sql
CREATE TABLE public.staff_shifts (
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
  CONSTRAINT staff_shifts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT staff_shifts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);
```

#### 3. Staff Performance Reviews

```sql
CREATE TABLE public.staff_performance_reviews (
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
  CONSTRAINT staff_performance_reviews_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT staff_performance_reviews_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id),
  CONSTRAINT staff_performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.business_owner(id)
);
```

#### 4. Staff Documents

```sql
CREATE TABLE public.staff_documents (
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
  CONSTRAINT staff_documents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT staff_documents_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id),
  CONSTRAINT staff_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.business_owner(id)
);
```

#### 5. Enhanced Staff Profiles

```sql
-- Add columns to existing staff table
ALTER TABLE public.staff
ADD COLUMN profile_image_url text,
ADD COLUMN date_of_birth date,
ADD COLUMN address jsonb,
ADD COLUMN emergency_contact_name text,
ADD COLUMN emergency_contact_phone text,
ADD COLUMN emergency_contact_relationship text,
ADD COLUMN employment_start_date date DEFAULT CURRENT_DATE,
ADD COLUMN employment_end_date date,
ADD COLUMN department text,
ADD COLUMN employee_id text UNIQUE,
ADD COLUMN notes text;
```

### Enhanced Activity Tracking

#### 6. Detailed Session Metrics

```sql
-- Add columns to existing staff_session_activity table
ALTER TABLE public.staff_session_activity
ADD COLUMN screens_accessed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN tasks_completed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN productivity_score numeric,
ADD COLUMN break_time_minutes integer DEFAULT 0,
ADD COLUMN active_time_minutes integer DEFAULT 0;
```

#### 7. Staff Attendance Tracking

```sql
CREATE TABLE public.staff_attendance (
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
  CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT staff_attendance_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id),
  CONSTRAINT staff_attendance_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.staff_shifts(id)
);
```

## Error Handling

### Client-Side Error Handling

1. **Form Validation Errors**: Real-time validation for all forms with clear error messages
2. **Network Errors**: Retry mechanisms for failed API calls with user feedback
3. **Permission Errors**: Clear messaging when users lack permissions for certain actions
4. **Data Loading Errors**: Graceful fallbacks when data fails to load

### Server-Side Error Handling

1. **Database Constraint Violations**: Proper error messages for unique constraints and foreign key violations
2. **Authentication Errors**: Secure error handling that doesn't expose sensitive information
3. **Authorization Errors**: Role-based error responses
4. **File Upload Errors**: Validation for file types, sizes, and storage limits

### Error Recovery Strategies

1. **Optimistic Updates**: UI updates immediately with rollback on failure
2. **Retry Logic**: Automatic retry for transient failures
3. **Offline Support**: Basic functionality when network is unavailable
4. **Data Synchronization**: Conflict resolution for concurrent updates

## Testing Strategy

### Unit Testing

1. **Component Testing**: Test individual React components with various props and states
2. **Utility Function Testing**: Test salary calculations, time tracking, and data transformations
3. **Hook Testing**: Test custom hooks for data fetching and state management
4. **Validation Testing**: Test form validation logic and business rules

### Integration Testing

1. **API Integration**: Test API endpoints with various scenarios and edge cases
2. **Database Integration**: Test database operations and constraint handling
3. **Authentication Integration**: Test role-based access and session management
4. **File Upload Integration**: Test document upload and storage functionality

### End-to-End Testing

1. **Staff Management Workflows**: Test complete staff management processes
2. **Salary Management Workflows**: Test salary updates and payroll calculations
3. **Schedule Management Workflows**: Test shift creation and attendance tracking
4. **Performance Review Workflows**: Test review creation and approval processes

### Performance Testing

1. **Load Testing**: Test system performance with multiple concurrent users
2. **Database Performance**: Test query performance with large datasets
3. **File Upload Performance**: Test document upload with various file sizes
4. **Real-time Updates**: Test session monitoring and activity tracking performance

## Security Considerations

### Data Protection

1. **Sensitive Data Encryption**: Encrypt salary information and personal data
2. **Document Security**: Secure file storage with access controls
3. **Session Security**: Secure session tokens and activity tracking
4. **Audit Logging**: Comprehensive logging of all staff management actions

### Access Control

1. **Role-Based Permissions**: Granular permissions for different management functions
2. **Data Isolation**: Ensure staff can only access their own business data
3. **Admin Controls**: Special permissions for sensitive operations
4. **Session Management**: Secure session handling and timeout policies

### Compliance

1. **Data Privacy**: GDPR/CCPA compliance for personal data handling
2. **Employment Law**: Compliance with local employment regulations
3. **Document Retention**: Proper document retention and disposal policies
4. **Audit Requirements**: Maintain audit trails for compliance reporting
