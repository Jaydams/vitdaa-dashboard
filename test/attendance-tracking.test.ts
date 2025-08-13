import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  createAttendanceRecord,
  updateAttendanceRecord,
  getStaffAttendance,
  getStaffAttendanceSummary,
} from "@/lib/staff-shifts-data";

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Attendance Tracking System", () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockSupabaseClient = {
      from: vi.fn(() => mockSupabaseClient),
      select: vi.fn(() => mockSupabaseClient),
      insert: vi.fn(() => mockSupabaseClient),
      update: vi.fn(() => mockSupabaseClient),
      eq: vi.fn(() => mockSupabaseClient),
      gte: vi.fn(() => mockSupabaseClient),
      lte: vi.fn(() => mockSupabaseClient),
      order: vi.fn(() => mockSupabaseClient),
      single: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createAttendanceRecord", () => {
    it("should create a new attendance record successfully", async () => {
      const mockRecord = {
        id: "attendance-123",
        staff_id: "staff-123",
        business_id: "business-123",
        attendance_date: "2024-01-15",
        clock_in_time: "2024-01-15T09:00:00Z",
        status: "present",
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockRecord,
        error: null,
      });

      const result = await createAttendanceRecord("staff-123", "business-123", {
        attendance_date: "2024-01-15",
        clock_in_time: "09:00:00",
        status: "present",
      });

      expect(result).toEqual(mockRecord);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("staff_attendance");
    });

    it("should handle database errors when creating attendance record", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await createAttendanceRecord("staff-123", "business-123", {
        attendance_date: "2024-01-15",
        clock_in_time: "09:00:00",
        status: "present",
      });

      expect(result).toBeNull();
    });
  });

  describe("updateAttendanceRecord", () => {
    it("should update attendance record with clock out time", async () => {
      const mockCurrentRecord = {
        attendance_date: "2024-01-15",
        clock_in_time: "2024-01-15T09:00:00Z",
        clock_out_time: null,
      };

      const mockUpdatedRecord = {
        id: "attendance-123",
        staff_id: "staff-123",
        business_id: "business-123",
        attendance_date: "2024-01-15",
        clock_in_time: "2024-01-15T09:00:00Z",
        clock_out_time: "2024-01-15T17:00:00Z",
        status: "present",
        total_hours_worked: 8,
        overtime_hours: 0,
      };

      // Mock the select query for current record first, then the update query
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: mockCurrentRecord,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockUpdatedRecord,
          error: null,
        });

      const result = await updateAttendanceRecord(
        "attendance-123",
        "business-123",
        {
          clock_out_time: "17:00:00",
        }
      );

      expect(result).toEqual(mockUpdatedRecord);
    });

    it("should handle errors when updating attendance record", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Record not found" },
      });

      const result = await updateAttendanceRecord(
        "attendance-123",
        "business-123",
        {
          clock_out_time: "17:00:00",
        }
      );

      expect(result).toBeNull();
    });
  });

  describe("getStaffAttendance", () => {
    it("should retrieve staff attendance records for date range", async () => {
      const mockAttendanceRecords = [
        {
          id: "attendance-1",
          staff_id: "staff-123",
          business_id: "business-123",
          attendance_date: "2024-01-15",
          clock_in_time: "2024-01-15T09:00:00Z",
          clock_out_time: "2024-01-15T17:00:00Z",
          status: "present",
          total_hours_worked: 8,
        },
        {
          id: "attendance-2",
          staff_id: "staff-123",
          business_id: "business-123",
          attendance_date: "2024-01-16",
          clock_in_time: "2024-01-16T09:00:00Z",
          clock_out_time: "2024-01-16T17:00:00Z",
          status: "present",
          total_hours_worked: 8,
        },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockAttendanceRecords,
        error: null,
      });

      const result = await getStaffAttendance(
        "staff-123",
        "business-123",
        "2024-01-15",
        "2024-01-16"
      );

      expect(result).toEqual(mockAttendanceRecords);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("staff_attendance");
    });

    it("should handle errors when retrieving attendance records", async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: "Fetch failed" },
      });

      const result = await getStaffAttendance(
        "staff-123",
        "business-123",
        "2024-01-15",
        "2024-01-16"
      );

      expect(result).toEqual([]);
    });
  });

  describe("getStaffAttendanceSummary", () => {
    it("should calculate attendance summary correctly", async () => {
      const mockAttendanceRecords = [
        {
          id: "attendance-1",
          staff_id: "staff-123",
          business_id: "business-123",
          attendance_date: "2024-01-15",
          clock_in_time: "2024-01-15T09:00:00Z",
          clock_out_time: "2024-01-15T17:00:00Z",
          status: "present",
          total_hours_worked: 8,
          overtime_hours: 0,
        },
        {
          id: "attendance-2",
          staff_id: "staff-123",
          business_id: "business-123",
          attendance_date: "2024-01-16",
          clock_in_time: "2024-01-16T09:00:00Z",
          clock_out_time: "2024-01-16T17:00:00Z",
          status: "present",
          total_hours_worked: 8,
          overtime_hours: 0,
        },
        {
          id: "attendance-3",
          staff_id: "staff-123",
          business_id: "business-123",
          attendance_date: "2024-01-17",
          status: "absent",
          total_hours_worked: 0,
          overtime_hours: 0,
        },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockAttendanceRecords,
        error: null,
      });

      const result = await getStaffAttendanceSummary(
        "staff-123",
        "business-123",
        "2024-01-15",
        "2024-01-17"
      );

      expect(result).toEqual({
        total_days_worked: 2,
        total_hours_worked: 16,
        total_overtime_hours: 0,
        punctuality_score: 100,
        absence_count: 1,
        late_count: 0,
        early_departure_count: 0,
      });
    });

    it("should handle empty attendance records", async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getStaffAttendanceSummary(
        "staff-123",
        "business-123",
        "2024-01-15",
        "2024-01-17"
      );

      expect(result).toEqual({
        total_days_worked: 0,
        total_hours_worked: 0,
        total_overtime_hours: 0,
        punctuality_score: 100,
        absence_count: 0,
        late_count: 0,
        early_departure_count: 0,
      });
    });

    it("should calculate punctuality score with late arrivals", async () => {
      const mockAttendanceRecords = [
        {
          id: "attendance-1",
          staff_id: "staff-123",
          business_id: "business-123",
          attendance_date: "2024-01-15",
          status: "present",
          total_hours_worked: 8,
          overtime_hours: 0,
        },
        {
          id: "attendance-2",
          staff_id: "staff-123",
          business_id: "business-123",
          attendance_date: "2024-01-16",
          status: "late",
          total_hours_worked: 7.5,
          overtime_hours: 0,
        },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockAttendanceRecords,
        error: null,
      });

      const result = await getStaffAttendanceSummary(
        "staff-123",
        "business-123",
        "2024-01-15",
        "2024-01-16"
      );

      expect(result?.punctuality_score).toBe(50); // 1 on-time out of 2 total = 50%
      expect(result?.late_count).toBe(1);
    });
  });
});
