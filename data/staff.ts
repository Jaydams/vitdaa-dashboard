import axiosInstance from "@/helpers/axiosInstance";

import {
  Staff,
  StaffSalary,
  StaffShift,
  StaffAttendance,
  StaffPerformanceReview,
  StaffDocument,
  StaffSessionActivity,
  ComprehensiveStaffProfile,
  StaffManagementSummary,
  Goal,
  Achievement,
} from "@/types/staff";
import { StaffSessionRecord } from "@/types/auth";
import { PaginationData, PaginationQueryProps } from "@/types/pagination";

// Extended staff type with session information
export type StaffWithSession = Staff & {
  activeSession?: StaffSessionRecord | null;
  permissions?: string[];
  roleAssignments?: any[];
  totalPermissions?: number;
};

export const fetchStaff = async ({
  page,
  perPage = 10,
}: PaginationQueryProps) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const { data } = await axiosInstance.get(
    `/staff?_page=${page}&_per_page=${perPage}`
  );
  return data as PaginationData<Staff>;
};

export const fetchStaffWithSessions = async ({
  page,
  perPage = 10,
}: PaginationQueryProps): Promise<PaginationData<StaffWithSession>> => {
  try {
    const response = await fetch(`/api/staff?page=${page}&perPage=${perPage}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as PaginationData<StaffWithSession>;
  } catch (error) {
    console.error("Error fetching staff with sessions:", error);
    return {
      data: [],
      first: 1,
      last: 1,
      next: null,
      pages: 1,
      prev: null,
      items: 0,
    };
  }
};

export const fetchStaffById = async (staffId: string): Promise<Staff> => {
  try {
    const response = await fetch(`/api/staff/${staffId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Staff member not found");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as Staff;
  } catch (error) {
    console.error("Error fetching staff by ID:", error);
    throw error;
  }
};

export const updateStaffProfile = async (
  staffId: string,
  profileData: Partial<Staff>
): Promise<Staff> => {
  try {
    const response = await fetch(`/api/staff/${staffId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update staff profile");
    }

    const data = await response.json();
    return data as Staff;
  } catch (error) {
    console.error("Error updating staff profile:", error);
    throw error;
  }
};

// ============================================================================
// SALARY MANAGEMENT DATA ACCESS FUNCTIONS
// ============================================================================

export const fetchStaffSalary = async (
  staffId: string
): Promise<StaffSalary | null> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/salary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No salary record found
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffSalary;
  } catch (error) {
    console.error("Error fetching staff salary:", error);
    throw error;
  }
};

export const fetchStaffSalaryHistory = async (
  staffId: string
): Promise<StaffSalary[]> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/salary/history`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffSalary[];
  } catch (error) {
    console.error("Error fetching staff salary history:", error);
    return [];
  }
};

export const updateStaffSalary = async (
  staffId: string,
  salaryData: Omit<StaffSalary, "id" | "staff_id" | "created_at" | "updated_at">
): Promise<StaffSalary> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/salary`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(salaryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update staff salary");
    }

    const data = await response.json();
    return data as StaffSalary;
  } catch (error) {
    console.error("Error updating staff salary:", error);
    throw error;
  }
};

export const createStaffSalary = async (
  staffId: string,
  salaryData: Omit<StaffSalary, "id" | "staff_id" | "created_at" | "updated_at">
): Promise<StaffSalary> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/salary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(salaryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create staff salary");
    }

    const data = await response.json();
    return data as StaffSalary;
  } catch (error) {
    console.error("Error creating staff salary:", error);
    throw error;
  }
};

// ============================================================================
// SHIFT SCHEDULING DATA ACCESS FUNCTIONS
// ============================================================================

export const fetchStaffShifts = async (
  staffId: string,
  startDate?: string,
  endDate?: string
): Promise<StaffShift[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const queryString = params.toString();
    const url = `/api/staff/${staffId}/shifts${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffShift[];
  } catch (error) {
    console.error("Error fetching staff shifts:", error);
    return [];
  }
};

export const createStaffShift = async (
  staffId: string,
  shiftData: Omit<StaffShift, "id" | "staff_id" | "created_at" | "updated_at">
): Promise<StaffShift> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/shifts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shiftData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create staff shift");
    }

    const data = await response.json();
    return data as StaffShift;
  } catch (error) {
    console.error("Error creating staff shift:", error);
    throw error;
  }
};

export const updateStaffShift = async (
  shiftId: string,
  shiftData: Partial<StaffShift>
): Promise<StaffShift> => {
  try {
    const response = await fetch(`/api/shifts/${shiftId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shiftData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update staff shift");
    }

    const data = await response.json();
    return data as StaffShift;
  } catch (error) {
    console.error("Error updating staff shift:", error);
    throw error;
  }
};

export const deleteStaffShift = async (shiftId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/shifts/${shiftId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete staff shift");
    }
  } catch (error) {
    console.error("Error deleting staff shift:", error);
    throw error;
  }
};

// ============================================================================
// ATTENDANCE TRACKING DATA ACCESS FUNCTIONS
// ============================================================================

export const fetchStaffAttendance = async (
  staffId: string,
  startDate?: string,
  endDate?: string
): Promise<StaffAttendance[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const queryString = params.toString();
    const url = `/api/staff/${staffId}/attendance${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffAttendance[];
  } catch (error) {
    console.error("Error fetching staff attendance:", error);
    return [];
  }
};

export const clockInStaff = async (
  staffId: string,
  shiftId?: string
): Promise<StaffAttendance> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/attendance/clock-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shift_id: shiftId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to clock in staff");
    }

    const data = await response.json();
    return data as StaffAttendance;
  } catch (error) {
    console.error("Error clocking in staff:", error);
    throw error;
  }
};

export const clockOutStaff = async (
  attendanceId: string,
  notes?: string
): Promise<StaffAttendance> => {
  try {
    const response = await fetch(`/api/attendance/${attendanceId}/clock-out`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to clock out staff");
    }

    const data = await response.json();
    return data as StaffAttendance;
  } catch (error) {
    console.error("Error clocking out staff:", error);
    throw error;
  }
};

export const updateStaffAttendance = async (
  attendanceId: string,
  attendanceData: Partial<StaffAttendance>
): Promise<StaffAttendance> => {
  try {
    const response = await fetch(`/api/attendance/${attendanceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attendanceData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update staff attendance");
    }

    const data = await response.json();
    return data as StaffAttendance;
  } catch (error) {
    console.error("Error updating staff attendance:", error);
    throw error;
  }
};

// ============================================================================
// PERFORMANCE MANAGEMENT DATA ACCESS FUNCTIONS
// ============================================================================

export const fetchStaffPerformanceReviews = async (
  staffId: string
): Promise<StaffPerformanceReview[]> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/performance`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffPerformanceReview[];
  } catch (error) {
    console.error("Error fetching staff performance reviews:", error);
    return [];
  }
};

export const fetchLatestPerformanceReview = async (
  staffId: string
): Promise<StaffPerformanceReview | null> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/performance/latest`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No performance review found
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffPerformanceReview;
  } catch (error) {
    console.error("Error fetching latest performance review:", error);
    throw error;
  }
};

export const createPerformanceReview = async (
  staffId: string,
  reviewData: Omit<
    StaffPerformanceReview,
    "id" | "staff_id" | "created_at" | "updated_at"
  >
): Promise<StaffPerformanceReview> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/performance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reviewData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create performance review");
    }

    const data = await response.json();
    return data as StaffPerformanceReview;
  } catch (error) {
    console.error("Error creating performance review:", error);
    throw error;
  }
};

export const updatePerformanceReview = async (
  reviewId: string,
  reviewData: Partial<StaffPerformanceReview>
): Promise<StaffPerformanceReview> => {
  try {
    const response = await fetch(`/api/performance/${reviewId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reviewData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update performance review");
    }

    const data = await response.json();
    return data as StaffPerformanceReview;
  } catch (error) {
    console.error("Error updating performance review:", error);
    throw error;
  }
};

export const fetchStaffGoals = async (staffId: string): Promise<Goal[]> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/goals`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as Goal[];
  } catch (error) {
    console.error("Error fetching staff goals:", error);
    return [];
  }
};

export const createStaffGoal = async (
  staffId: string,
  goalData: Omit<Goal, "id">
): Promise<Goal> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/goals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(goalData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create staff goal");
    }

    const data = await response.json();
    return data as Goal;
  } catch (error) {
    console.error("Error creating staff goal:", error);
    throw error;
  }
};

export const updateStaffGoal = async (
  goalId: string,
  goalData: Partial<Goal>
): Promise<Goal> => {
  try {
    const response = await fetch(`/api/goals/${goalId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(goalData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update staff goal");
    }

    const data = await response.json();
    return data as Goal;
  } catch (error) {
    console.error("Error updating staff goal:", error);
    throw error;
  }
};

export const fetchStaffAchievements = async (
  staffId: string
): Promise<Achievement[]> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/achievements`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as Achievement[];
  } catch (error) {
    console.error("Error fetching staff achievements:", error);
    return [];
  }
};

export const createStaffAchievement = async (
  staffId: string,
  achievementData: Omit<Achievement, "id">
): Promise<Achievement> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/achievements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(achievementData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create staff achievement");
    }

    const data = await response.json();
    return data as Achievement;
  } catch (error) {
    console.error("Error creating staff achievement:", error);
    throw error;
  }
};

// ============================================================================
// DOCUMENT MANAGEMENT DATA ACCESS FUNCTIONS
// ============================================================================

export const fetchStaffDocuments = async (
  staffId: string
): Promise<StaffDocument[]> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/documents`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffDocument[];
  } catch (error) {
    console.error("Error fetching staff documents:", error);
    return [];
  }
};

export const uploadStaffDocument = async (
  staffId: string,
  documentData: FormData
): Promise<StaffDocument> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/documents`, {
      method: "POST",
      body: documentData, // FormData for file upload
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload staff document");
    }

    const data = await response.json();
    return data as StaffDocument;
  } catch (error) {
    console.error("Error uploading staff document:", error);
    throw error;
  }
};

export const updateStaffDocument = async (
  documentId: string,
  documentData: Partial<StaffDocument>
): Promise<StaffDocument> => {
  try {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(documentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update staff document");
    }

    const data = await response.json();
    return data as StaffDocument;
  } catch (error) {
    console.error("Error updating staff document:", error);
    throw error;
  }
};

export const deleteStaffDocument = async (
  documentId: string
): Promise<void> => {
  try {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete staff document");
    }
  } catch (error) {
    console.error("Error deleting staff document:", error);
    throw error;
  }
};

export const fetchExpiredDocuments = async (
  staffId: string
): Promise<StaffDocument[]> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/documents/expired`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffDocument[];
  } catch (error) {
    console.error("Error fetching expired documents:", error);
    return [];
  }
};

// ============================================================================
// SESSION ACTIVITY DATA ACCESS FUNCTIONS
// ============================================================================

export const fetchStaffSessionActivity = async (
  staffId: string,
  limit?: number
): Promise<StaffSessionActivity[]> => {
  try {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());

    const queryString = params.toString();
    const url = `/api/staff/${staffId}/activity${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffSessionActivity[];
  } catch (error) {
    console.error("Error fetching staff session activity:", error);
    return [];
  }
};

export const fetchActiveStaffSessions = async (
  staffId: string
): Promise<StaffSessionRecord[]> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/sessions/active`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffSessionRecord[];
  } catch (error) {
    console.error("Error fetching active staff sessions:", error);
    return [];
  }
};

// ============================================================================
// COMPREHENSIVE STAFF PROFILE DATA ACCESS FUNCTION
// ============================================================================

export const fetchComprehensiveStaffProfile = async (
  staffId: string
): Promise<ComprehensiveStaffProfile> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/comprehensive`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Staff member not found");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ComprehensiveStaffProfile;
  } catch (error) {
    console.error("Error fetching comprehensive staff profile:", error);
    throw error;
  }
};

// ============================================================================
// STAFF MANAGEMENT SUMMARY DATA ACCESS FUNCTIONS
// ============================================================================

export const fetchStaffManagementSummaries = async (
  businessId: string
): Promise<StaffManagementSummary[]> => {
  try {
    const response = await fetch(
      `/api/business/${businessId}/staff/summaries`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffManagementSummary[];
  } catch (error) {
    console.error("Error fetching staff management summaries:", error);
    return [];
  }
};

export const fetchStaffManagementSummary = async (
  staffId: string
): Promise<StaffManagementSummary> => {
  try {
    const response = await fetch(`/api/staff/${staffId}/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Staff member not found");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as StaffManagementSummary;
  } catch (error) {
    console.error("Error fetching staff management summary:", error);
    throw error;
  }
};

// ============================================================================
// BULK OPERATIONS DATA ACCESS FUNCTIONS
// ============================================================================

export const bulkUpdateStaffProfiles = async (
  updates: Array<{ staffId: string; profileData: Partial<Staff> }>
): Promise<Staff[]> => {
  try {
    const response = await fetch(`/api/staff/bulk-update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to bulk update staff profiles");
    }

    const data = await response.json();
    return data as Staff[];
  } catch (error) {
    console.error("Error bulk updating staff profiles:", error);
    throw error;
  }
};

export const bulkCreateStaffShifts = async (
  shifts: Array<Omit<StaffShift, "id" | "created_at" | "updated_at">>
): Promise<StaffShift[]> => {
  try {
    const response = await fetch(`/api/shifts/bulk-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shifts }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to bulk create staff shifts");
    }

    const data = await response.json();
    return data as StaffShift[];
  } catch (error) {
    console.error("Error bulk creating staff shifts:", error);
    throw error;
  }
};

// ============================================================================
// SEARCH AND FILTER DATA ACCESS FUNCTIONS
// ============================================================================

export const searchStaff = async (
  query: string,
  filters?: {
    role?: string;
    department?: string;
    status?: string;
  }
): Promise<Staff[]> => {
  try {
    const params = new URLSearchParams();
    params.append("query", query);

    if (filters?.role) params.append("role", filters.role);
    if (filters?.department) params.append("department", filters.department);
    if (filters?.status) params.append("status", filters.status);

    const response = await fetch(`/api/staff/search?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as Staff[];
  } catch (error) {
    console.error("Error searching staff:", error);
    return [];
  }
};

export const filterStaffByRole = async (role: string): Promise<Staff[]> => {
  try {
    const response = await fetch(`/api/staff/filter/role/${role}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as Staff[];
  } catch (error) {
    console.error("Error filtering staff by role:", error);
    return [];
  }
};

export const filterStaffByDepartment = async (
  department: string
): Promise<Staff[]> => {
  try {
    const response = await fetch(`/api/staff/filter/department/${department}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as Staff[];
  } catch (error) {
    console.error("Error filtering staff by department:", error);
    return [];
  }
};
