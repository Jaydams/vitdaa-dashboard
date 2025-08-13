import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock data for tests
let mockReturnData: any = null;
let mockReturnError: any = null;

// Create chainable mock methods
const createChainableMock = () => {
  const chainable = {
    from: vi.fn(() => chainable),
    select: vi.fn(() => chainable),
    insert: vi.fn(() => chainable),
    update: vi.fn(() => chainable),
    delete: vi.fn(() => chainable),
    eq: vi.fn(() => chainable),
    neq: vi.fn(() => chainable),
    gte: vi.fn(() => chainable),
    lte: vi.fn(() => chainable),
    lt: vi.fn(() => chainable),
    gt: vi.fn(() => chainable),
    not: vi.fn(() => chainable),
    or: vi.fn(() => chainable),
    in: vi.fn(() => chainable),
    order: vi.fn(() => chainable),
    limit: vi.fn(() => chainable),
    range: vi.fn(() => chainable),
    single: vi.fn(() =>
      Promise.resolve({ data: mockReturnData, error: mockReturnError })
    ),
    raw: vi.fn((sql: string) => sql),
  };
  return chainable;
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(createChainableMock())),
}));

// Import the functions to test
import {
  createStaffSalary,
  getCurrentStaffSalary,
  getStaffSalaryHistory,
  calculateStaffCompensation,
} from "@/lib/staff-salary-data";

import {
  createStaffShift,
  checkShiftConflict,
  getStaffShifts,
  createAttendanceRecord,
  getStaffAttendanceSummary,
} from "@/lib/staff-shifts-data";

import {
  createPerformanceReview,
  getStaffPerformanceReviews,
  getStaffPerformanceTrend,
} from "@/lib/staff-performance-data";

import {
  createStaffDocument,
  getStaffDocuments,
  getStaffComplianceStatus,
} from "@/lib/staff-documents-data";

describe("Staff Salary Data Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturnData = null;
    mockReturnError = null;
  });

  it("should create a staff salary record", async () => {
    const mockSalary = {
      id: "salary-1",
      staff_id: "staff-1",
      business_id: "business-1",
      salary_type: "monthly" as const,
      payment_frequency: "monthly" as const,
      base_salary: 5000,
      is_current: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockReturnData = mockSalary;

    const result = await createStaffSalary("staff-1", "business-1", {
      salary_type: "monthly",
      payment_frequency: "monthly",
      base_salary: 5000,
      effective_date: "2024-01-01",
    });

    expect(result).toEqual(mockSalary);
  });

  it("should get current staff salary", async () => {
    const mockSalary = {
      id: "salary-1",
      staff_id: "staff-1",
      business_id: "business-1",
      salary_type: "hourly" as const,
      payment_frequency: "weekly" as const,
      hourly_rate: 25,
      is_current: true,
    };

    mockReturnData = mockSalary;

    const result = await getCurrentStaffSalary("staff-1", "business-1");

    expect(result).toEqual(mockSalary);
  });

  it("should calculate staff compensation correctly", async () => {
    const mockSalary = {
      id: "salary-1",
      staff_id: "staff-1",
      business_id: "business-1",
      salary_type: "hourly" as const,
      payment_frequency: "weekly" as const,
      hourly_rate: 25,
      commission_rate: 5,
      bonus_eligible: true,
      is_current: true,
    };

    mockReturnData = mockSalary;

    const result = await calculateStaffCompensation(
      "staff-1",
      "business-1",
      40,
      true,
      1000
    );

    expect(result).toEqual({
      base_pay: 1000, // 25 * 40
      commission: 50, // 1000 * 0.05
      total: 1050,
      salary_type: "hourly",
    });
  });
});

describe("Staff Shifts Data Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturnData = null;
    mockReturnError = null;
  });

  it("should create a staff shift", async () => {
    const mockShift = {
      id: "shift-1",
      staff_id: "staff-1",
      business_id: "business-1",
      shift_date: "2024-01-01",
      scheduled_start_time: "09:00:00",
      scheduled_end_time: "17:00:00",
      status: "scheduled" as const,
      break_duration_minutes: 60,
    };

    // First call for conflict check returns empty array (no conflicts)
    mockReturnData = [];

    // Second call for insert returns the shift
    setTimeout(() => {
      mockReturnData = mockShift;
    }, 10);

    const result = await createStaffShift("staff-1", "business-1", {
      shift_date: "2024-01-01",
      scheduled_start_time: "09:00:00",
      scheduled_end_time: "17:00:00",
      break_duration_minutes: 60,
    });

    expect(result).toEqual(mockShift);
  });

  it("should check for shift conflicts", async () => {
    mockReturnData = [{ id: "conflict-shift" }];

    const hasConflict = await checkShiftConflict(
      "staff-1",
      "business-1",
      "2024-01-01",
      "09:00:00",
      "17:00:00"
    );

    expect(hasConflict).toBe(true);
  });

  it("should create attendance record with hours calculation", async () => {
    const mockAttendance = {
      id: "attendance-1",
      staff_id: "staff-1",
      business_id: "business-1",
      attendance_date: "2024-01-01",
      clock_in_time: "2024-01-01T09:00:00Z",
      clock_out_time: "2024-01-01T17:00:00Z",
      total_hours_worked: 8,
      overtime_hours: 0,
      status: "present" as const,
    };

    mockReturnData = mockAttendance;

    const result = await createAttendanceRecord("staff-1", "business-1", {
      attendance_date: "2024-01-01",
      clock_in_time: "09:00:00",
      clock_out_time: "17:00:00",
      status: "present",
    });

    expect(result).toEqual(mockAttendance);
  });
});

describe("Staff Performance Data Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturnData = null;
    mockReturnError = null;
  });

  it("should create a performance review", async () => {
    const mockReview = {
      id: "review-1",
      staff_id: "staff-1",
      business_id: "business-1",
      reviewer_id: "reviewer-1",
      review_period_start: "2024-01-01",
      review_period_end: "2024-03-31",
      overall_rating: 4,
      status: "draft" as const,
      performance_metrics: [],
      goals: [],
      achievements: [],
    };

    mockReturnData = mockReview;

    const result = await createPerformanceReview(
      "staff-1",
      "business-1",
      "reviewer-1",
      {
        review_period_start: "2024-01-01",
        review_period_end: "2024-03-31",
        overall_rating: 4,
      }
    );

    expect(result).toEqual(mockReview);
  });

  it("should calculate performance trend", async () => {
    const mockReviews = [
      {
        id: "review-1",
        overall_rating: 3,
        status: "approved" as const,
        review_period_end: "2024-01-31",
      },
      {
        id: "review-2",
        overall_rating: 4,
        status: "approved" as const,
        review_period_end: "2024-02-28",
      },
      {
        id: "review-3",
        overall_rating: 5,
        status: "approved" as const,
        review_period_end: "2024-03-31",
      },
    ];

    mockReturnData = mockReviews;

    const result = await getStaffPerformanceTrend("staff-1", "business-1");

    expect(result?.trend).toBe("improving");
    expect(result?.average_rating).toBe(4);
    expect(result?.rating_change).toBe(2);
  });
});

describe("Staff Documents Data Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturnData = null;
    mockReturnError = null;
  });

  it("should create a staff document", async () => {
    const mockDocument = {
      id: "doc-1",
      staff_id: "staff-1",
      business_id: "business-1",
      uploaded_by: "uploader-1",
      document_type: "contract" as const,
      document_name: "Employment Contract",
      file_url: "https://example.com/contract.pdf",
      file_size: 1024,
      mime_type: "application/pdf",
      is_required: true,
    };

    mockReturnData = mockDocument;

    const result = await createStaffDocument(
      "staff-1",
      "business-1",
      "uploader-1",
      {
        document_type: "contract",
        document_name: "Employment Contract",
        file_url: "https://example.com/contract.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        is_required: true,
      }
    );

    expect(result).toEqual(mockDocument);
  });

  it("should calculate compliance status", async () => {
    const mockDocuments = [
      {
        id: "doc-1",
        document_type: "contract" as const,
        is_required: true,
        expiration_date: null,
      },
      {
        id: "doc-2",
        document_type: "id_document" as const,
        is_required: true,
        expiration_date: "2024-12-31",
      },
    ];

    mockReturnData = mockDocuments;

    const result = await getStaffComplianceStatus("staff-1", "business-1");

    expect(result?.status).toBe("compliant");
    expect(result?.total_documents).toBe(2);
    expect(result?.required_documents).toBe(2);
    expect(result?.missing_required_types).toEqual([]);
  });
});

describe("Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturnData = null;
    mockReturnError = null;
  });

  it("should handle database errors gracefully", async () => {
    mockReturnError = { message: "Database error", code: "DB_ERROR" };

    const result = await getCurrentStaffSalary("staff-1", "business-1");

    expect(result).toBeNull();
  });

  it("should handle not found errors", async () => {
    mockReturnError = { message: "Not found", code: "PGRST116" };

    const result = await getCurrentStaffSalary("staff-1", "business-1");

    expect(result).toBeNull();
  });
});
