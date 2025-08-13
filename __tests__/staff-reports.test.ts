import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePayrollSummaryReport,
  generateAttendancePunctualityReport,
  generatePerformanceTrendReport,
  generateProductivityAnalyticsReport,
} from "../lib/staff-reports-data";

// Mock the dependencies
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: [], error: null })),
            order: vi.fn(() => ({ data: [], error: null })),
            limit: vi.fn(() => ({ data: [], error: null })),
          })),
          order: vi.fn(() => ({ data: [], error: null })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => ({ data: [], error: null })),
            })),
          })),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
        order: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  })),
}));

vi.mock("../lib/staff-salary-data", () => ({
  getBusinessCurrentSalaries: vi.fn(() => Promise.resolve([])),
  getBusinessSalaryStatistics: vi.fn(() =>
    Promise.resolve({
      total_staff_with_salary: 0,
      average_hourly_rate: 0,
      average_monthly_salary: 0,
      total_monthly_payroll: 0,
      salary_type_distribution: { hourly: 0, monthly: 0, annual: 0 },
    })
  ),
  calculateStaffCompensation: vi.fn(() =>
    Promise.resolve({
      base_pay: 0,
      commission: 0,
      total: 0,
      salary_type: "hourly" as const,
    })
  ),
}));

vi.mock("../lib/staff-shifts-data", () => ({
  getBusinessShifts: vi.fn(() => Promise.resolve([])),
  getStaffAttendanceSummary: vi.fn(() =>
    Promise.resolve({
      total_days_worked: 0,
      total_hours_worked: 0,
      total_overtime_hours: 0,
      punctuality_score: 100,
      absence_count: 0,
      late_count: 0,
      early_departure_count: 0,
    })
  ),
}));

vi.mock("../lib/staff-performance-data", () => ({
  getBusinessPerformanceStatistics: vi.fn(() =>
    Promise.resolve({
      total_reviews: 0,
      average_rating: 0,
      reviews_by_status: { draft: 0, completed: 0, approved: 0 },
      staff_with_reviews: 0,
      pending_reviews: 0,
    })
  ),
  getStaffPerformanceTrend: vi.fn(() =>
    Promise.resolve({
      trend: "stable" as const,
      average_rating: 0,
      rating_change: 0,
      reviews_analyzed: 0,
    })
  ),
}));

vi.mock("../lib/staff-activity-tracking", () => ({
  getStaffActivitySummary: vi.fn(() => Promise.resolve([])),
  getRealTimeActivityMonitoring: vi.fn(() =>
    Promise.resolve({
      activeSessions: [],
      totalActiveStaff: 0,
      averageProductivity: 0,
      alertsCount: 0,
      alerts: [],
    })
  ),
}));

describe("Staff Reports Data Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePayrollSummaryReport", () => {
    it("should generate a payroll summary report with empty data", async () => {
      const result = await generatePayrollSummaryReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result).toEqual({
        period: "2024-01-01 to 2024-01-31",
        total_staff: 0,
        total_payroll: 0,
        average_salary: 0,
        salary_breakdown: {
          hourly_staff: 0,
          monthly_staff: 0,
          annual_staff: 0,
          total_hourly_cost: 0,
          total_monthly_cost: 0,
          total_annual_cost: 0,
        },
        overtime_costs: 0,
        commission_costs: 0,
        staff_details: [],
      });
    });

    it("should return null when salary statistics are not available", async () => {
      const { getBusinessSalaryStatistics } = await import(
        "../lib/staff-salary-data"
      );
      vi.mocked(getBusinessSalaryStatistics).mockResolvedValueOnce(null);

      const result = await generatePayrollSummaryReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      const { getBusinessCurrentSalaries } = await import(
        "../lib/staff-salary-data"
      );
      vi.mocked(getBusinessCurrentSalaries).mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await generatePayrollSummaryReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result).toBeNull();
    });
  });

  describe("generateAttendancePunctualityReport", () => {
    it("should generate an attendance report with empty data", async () => {
      // Mock the supabase client to return empty staff array
      const { createClient } = await import("../lib/supabase/server");
      const mockClient = vi.mocked(createClient)();
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      } as any);

      const result = await generateAttendancePunctualityReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result).toEqual({
        period: "2024-01-01 to 2024-01-31",
        total_staff: 0,
        overall_attendance_rate: 0,
        overall_punctuality_score: 0,
        total_hours_worked: 0,
        total_overtime_hours: 0,
        staff_details: [],
        trends: {
          daily_attendance: [],
          punctuality_trend: [],
        },
      });
    });

    it("should handle staff data retrieval errors", async () => {
      const { createClient } = await import("../lib/supabase/server");
      const mockClient = vi.mocked(createClient)();
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValue({
                data: null,
                error: new Error("Staff fetch error"),
              }),
          }),
        }),
      } as any);

      const result = await generateAttendancePunctualityReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result).toBeNull();
    });
  });

  describe("generatePerformanceTrendReport", () => {
    it("should generate a performance report with empty data", async () => {
      // Mock the supabase client to return empty staff array
      const { createClient } = await import("../lib/supabase/server");
      const mockClient = vi.mocked(createClient)();
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      } as any);

      const result = await generatePerformanceTrendReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result).toEqual({
        period: "2024-01-01 to 2024-01-31",
        total_reviews: 0,
        average_rating: 0,
        staff_performance: [],
        department_performance: [],
        performance_distribution: {
          excellent: 0,
          good: 0,
          satisfactory: 0,
          needs_improvement: 0,
          poor: 0,
        },
      });
    });

    it("should return null when performance statistics are not available", async () => {
      const { getBusinessPerformanceStatistics } = await import(
        "../lib/staff-performance-data"
      );
      vi.mocked(getBusinessPerformanceStatistics).mockResolvedValueOnce(null);

      const result = await generatePerformanceTrendReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result).toBeNull();
    });
  });

  describe("generateProductivityAnalyticsReport", () => {
    it("should generate a productivity report with empty data", async () => {
      // Mock the supabase client to return empty staff array
      const { createClient } = await import("../lib/supabase/server");
      const mockClient = vi.mocked(createClient)();
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      } as any);

      const result = await generateProductivityAnalyticsReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result).toEqual({
        period: "2024-01-01 to 2024-01-31",
        total_sessions: 0,
        average_productivity_score: 0,
        total_active_time: 0,
        total_idle_time: 0,
        staff_productivity: [],
        productivity_trends: [],
        feature_usage: [],
      });
    });

    it("should handle activity summary data correctly", async () => {
      const { getStaffActivitySummary } = await import(
        "../lib/staff-activity-tracking"
      );
      vi.mocked(getStaffActivitySummary).mockResolvedValueOnce([
        {
          staff_id: "staff-1",
          staff_name: "John Doe",
          role: "Manager",
          total_sessions: 5,
          total_session_duration_minutes: 300,
          total_actions: 50,
          total_page_visits: 100,
          last_activity_at: "2024-01-15T10:00:00Z",
          average_session_duration_minutes: 60,
          most_common_actions: [
            { action: "view_dashboard", count: 20 },
            { action: "update_profile", count: 15 },
          ],
        },
      ]);

      // Mock the supabase client to return empty staff array
      const { createClient } = await import("../lib/supabase/server");
      const mockClient = vi.mocked(createClient)();
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      } as any);

      const result = await generateProductivityAnalyticsReport(
        "business-123",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result?.total_sessions).toBe(5);
      expect(result?.staff_productivity).toHaveLength(1);
      expect(result?.staff_productivity[0].name).toBe("John Doe");
      expect(result?.staff_productivity[0].sessions_count).toBe(5);
    });
  });
});

describe("Data Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle empty staff arrays", async () => {
    const { createClient } = await import("../lib/supabase/server");
    const mockClient = vi.mocked(createClient)();
    vi.mocked(mockClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      }),
    } as any);

    const result = await generateAttendancePunctualityReport(
      "business-123",
      "2024-01-01",
      "2024-01-31"
    );

    expect(result?.total_staff).toBe(0);
    expect(result?.staff_details).toEqual([]);
  });

  it("should handle null values in calculations", async () => {
    const { getStaffAttendanceSummary } = await import(
      "../lib/staff-shifts-data"
    );
    vi.mocked(getStaffAttendanceSummary).mockResolvedValueOnce(null);

    const { createClient } = await import("../lib/supabase/server");
    const mockClient = vi.mocked(createClient)();
    vi.mocked(mockClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [
              {
                id: "staff-1",
                first_name: "John",
                last_name: "Doe",
                role: "Manager",
              },
            ],
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await generateAttendancePunctualityReport(
      "business-123",
      "2024-01-01",
      "2024-01-31"
    );

    expect(result?.staff_details[0].days_worked).toBe(0);
    expect(result?.staff_details[0].hours_worked).toBe(0);
    expect(result?.staff_details[0].attendance_rate).toBe(0);
  });

  it("should calculate working days correctly in attendance report", async () => {
    // Mock staff data
    const { createClient } = await import("../lib/supabase/server");
    const mockClient = vi.mocked(createClient)();
    vi.mocked(mockClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [
              {
                id: "staff-1",
                first_name: "John",
                last_name: "Doe",
                role: "Manager",
              },
            ],
            error: null,
          }),
        }),
      }),
    } as any);

    const { getStaffAttendanceSummary } = await import(
      "../lib/staff-shifts-data"
    );
    vi.mocked(getStaffAttendanceSummary).mockResolvedValueOnce({
      total_days_worked: 20,
      total_hours_worked: 160,
      total_overtime_hours: 5,
      punctuality_score: 95,
      absence_count: 2,
      late_count: 1,
      early_departure_count: 0,
    });

    const result = await generateAttendancePunctualityReport(
      "business-123",
      "2024-01-01",
      "2024-01-31"
    );

    expect(result?.staff_details[0].days_worked).toBe(20);
    expect(result?.staff_details[0].attendance_rate).toBeGreaterThan(0);
  });
});

describe("Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle database connection errors", async () => {
    const { createClient } = await import("../lib/supabase/server");
    vi.mocked(createClient).mockImplementation(() => {
      throw new Error("Database connection failed");
    });

    const result = await generatePayrollSummaryReport(
      "business-123",
      "2024-01-01",
      "2024-01-31"
    );

    expect(result).toBeNull();
  });

  it("should handle month boundaries correctly", async () => {
    const result = await generatePayrollSummaryReport(
      "business-123",
      "2024-01-31",
      "2024-02-01"
    );

    expect(result?.period).toBe("2024-01-31 to 2024-02-01");
  });

  it("should handle year boundaries correctly", async () => {
    const result = await generatePayrollSummaryReport(
      "business-123",
      "2023-12-31",
      "2024-01-01"
    );

    expect(result?.period).toBe("2023-12-31 to 2024-01-01");
  });
});
