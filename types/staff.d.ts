export type StaffStatus = "active" | "inactive";

// Updated role constraints for RBAC system
export type StaffRole = "reception" | "kitchen" | "bar" | "accountant" | "storekeeper" | "waiter";

// Address structure for staff profiles
export interface StaffAddress {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// Enhanced Staff type with new profile fields
export type Staff = {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  pin_hash: string;
  role: StaffRole;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  // New enhanced profile fields
  profile_image_url?: string;
  date_of_birth?: string;
  address?: StaffAddress;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  employment_start_date?: string;
  employment_end_date?: string;
  department?: string;
  employee_id?: string;
  notes?: string;
};

// Salary and compensation types
export type SalaryType = "hourly" | "monthly" | "annual";
export type PaymentFrequency = "weekly" | "bi_weekly" | "monthly";

export interface StaffSalary {
  id: string;
  staff_id: string;
  business_id: string;
  base_salary?: number;
  hourly_rate?: number;
  salary_type: SalaryType;
  payment_frequency: PaymentFrequency;
  commission_rate: number;
  bonus_eligible: boolean;
  effective_date: string;
  end_date?: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

// Shift scheduling types
export type ShiftStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "missed"
  | "cancelled";

export interface StaffShift {
  id: string;
  staff_id: string;
  business_id: string;
  shift_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  break_duration_minutes: number;
  status: ShiftStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Attendance tracking types
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "early_departure";

export interface StaffAttendance {
  id: string;
  staff_id: string;
  business_id: string;
  shift_id?: string;
  attendance_date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  total_hours_worked?: number;
  overtime_hours: number;
  status: AttendanceStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Performance review types
export type ReviewStatus = "draft" | "completed" | "approved";

export interface PerformanceMetric {
  name: string;
  score: number;
  max_score: number;
  comments?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  status: "not_started" | "in_progress" | "completed" | "overdue";
  progress_percentage: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date_achieved: string;
  recognition_type: "commendation" | "award" | "milestone" | "other";
}

export interface StaffPerformanceReview {
  id: string;
  staff_id: string;
  business_id: string;
  reviewer_id: string;
  review_period_start: string;
  review_period_end: string;
  overall_rating?: number; // 1-5 scale
  performance_metrics: PerformanceMetric[];
  goals: Goal[];
  achievements: Achievement[];
  areas_for_improvement?: string;
  comments?: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

// Document management types
export type DocumentType =
  | "contract"
  | "id_document"
  | "tax_form"
  | "certification"
  | "training_record"
  | "other";

export interface StaffDocument {
  id: string;
  staff_id: string;
  business_id: string;
  document_type: DocumentType;
  document_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  expiration_date?: string;
  is_required: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// Staff session management types
export interface StaffSessionRecord {
  id: string;
  staff_id: string;
  business_id: string;
  session_token: string;
  signed_in_by: string;
  signed_in_at: string;
  signed_out_at?: string;
  is_active: boolean;
  expires_at: string;
}

// Role-based permissions
export interface RolePermissions {
  reception: string[];
  kitchen: string[];
  bar: string[];
  accountant: string[];
  storekeeper: string[];
  waiter: string[];
}

// Staff activity tracking types
export interface StaffActivityLog {
  id: string;
  business_id: string;
  staff_id: string;
  session_id?: string;
  action: string;
  performed_by: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Screen access tracking
export interface ScreenAccess {
  screen_name: string;
  access_time: string;
  duration_minutes: number;
}

// Task completion tracking
export interface TaskCompletion {
  task_name: string;
  completion_time: string;
  success: boolean;
  details?: Record<string, unknown>;
}

export interface StaffSessionActivity {
  id: string;
  session_id: string;
  staff_id: string;
  business_id: string;
  page_visits: number;
  actions_performed: number;
  last_activity_at: string;
  idle_time_minutes: number;
  total_session_duration_minutes: number;
  created_at: string;
  updated_at: string;
  // Enhanced activity tracking fields
  screens_accessed: ScreenAccess[];
  tasks_completed: TaskCompletion[];
  productivity_score?: number;
  break_time_minutes: number;
  active_time_minutes: number;
}

// Activity summary types for business owners
export interface StaffActivitySummary {
  staff_id: string;
  staff_name: string;
  role: StaffRole;
  total_sessions: number;
  total_session_duration_minutes: number;
  total_actions: number;
  total_page_visits: number;
  last_activity_at?: string;
  average_session_duration_minutes: number;
  most_common_actions: Array<{
    action: string;
    count: number;
  }>;
}

// Session monitoring types
export interface ActiveStaffSessionWithActivity extends StaffSessionRecord {
  staff: Staff;
  activity: StaffSessionActivity;
}

// Comprehensive staff profile type that combines all related data
export interface ComprehensiveStaffProfile {
  // Core staff information
  staff: Staff;

  // Salary and compensation information
  current_salary?: StaffSalary;
  salary_history: StaffSalary[];

  // Scheduling and attendance
  upcoming_shifts: StaffShift[];
  recent_shifts: StaffShift[];
  attendance_records: StaffAttendance[];
  attendance_summary: {
    total_days_worked: number;
    total_hours_worked: number;
    punctuality_score: number;
    absence_count: number;
  };

  // Performance and reviews
  latest_performance_review?: StaffPerformanceReview;
  performance_history: StaffPerformanceReview[];
  active_goals: Goal[];
  recent_achievements: Achievement[];

  // Documents and compliance
  documents: StaffDocument[];
  expired_documents: StaffDocument[];
  missing_required_documents: string[];

  // Session and activity data
  active_sessions: StaffSessionRecord[];
  recent_activity: StaffSessionActivity[];
  activity_summary: StaffActivitySummary;

  // Calculated metrics
  employment_duration_days: number;
  total_compensation_ytd: number;
  performance_trend: "improving" | "stable" | "declining";
  compliance_status: "compliant" | "needs_attention" | "non_compliant";
}

// Staff profile hub component props
export interface StaffProfileHubProps {
  staffId: string;
  initialTab?:
    | "profile"
    | "salary"
    | "schedule"
    | "attendance"
    | "performance"
    | "sessions"
    | "documents"
    | "permissions";
}

// Staff management summary for dashboard views
export interface StaffManagementSummary {
  staff_id: string;
  staff_name: string;
  role: StaffRole;
  department?: string;
  employment_status: "active" | "inactive" | "terminated";
  current_salary_amount?: number;
  salary_type?: SalaryType;
  next_shift?: {
    date: string;
    start_time: string;
    end_time: string;
  };
  last_performance_rating?: number;
  compliance_issues: number;
  active_session: boolean;
  profile_completion_percentage: number;
}
