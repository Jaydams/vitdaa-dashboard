import { useState, useEffect } from "react";
import { StaffAttendance } from "@/types/staff";

interface AttendanceStatus {
  staff: {
    id: string;
    name: string;
  };
  attendance: {
    is_clocked_in: boolean;
    clock_in_time?: string;
    clock_out_time?: string;
    status?: string;
    total_hours_worked?: number;
    overtime_hours?: number;
    current_session_duration_minutes: number;
    notes?: string;
  };
  shift?: {
    id: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    actual_start_time?: string;
    actual_end_time?: string;
    status: string;
    break_duration_minutes: number;
  };
}

interface AttendanceSummary {
  total_days_worked: number;
  total_hours_worked: number;
  total_overtime_hours: number;
  punctuality_score: number;
  absence_count: number;
  late_count: number;
  early_departure_count: number;
}

export function useStaffAttendance(staffId: string) {
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendance[]>(
    []
  );
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current attendance status
  const fetchAttendanceStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/staff/${staffId}/attendance/status`);

      if (!response.ok) {
        throw new Error("Failed to fetch attendance status");
      }

      const data = await response.json();
      setAttendanceStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching attendance status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance records for a date range
  const fetchAttendanceRecords = async (startDate: string, endDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/staff/${staffId}/attendance?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch attendance records");
      }

      const data = await response.json();
      setAttendanceRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance summary for a date range
  const fetchAttendanceSummary = async (startDate: string, endDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/staff/${staffId}/attendance/reports?startDate=${startDate}&endDate=${endDate}&type=summary`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch attendance summary");
      }

      const data = await response.json();
      setAttendanceSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching attendance summary:", err);
    } finally {
      setLoading(false);
    }
  };

  // Clock in staff member
  const clockIn = async (notes?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/staff/${staffId}/attendance/clock-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to clock in");
      }

      const data = await response.json();

      // Refresh attendance status after successful clock in
      await fetchAttendanceStatus();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error clocking in:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clock out staff member
  const clockOut = async (notes?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/staff/${staffId}/attendance/clock-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to clock out");
      }

      const data = await response.json();

      // Refresh attendance status after successful clock out
      await fetchAttendanceStatus();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error clocking out:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update attendance record
  const updateAttendanceRecord = async (
    attendanceId: string,
    updates: {
      clock_in_time?: string;
      clock_out_time?: string;
      status?: string;
      notes?: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/staff/${staffId}/attendance/${attendanceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update attendance record"
        );
      }

      const data = await response.json();

      // Refresh attendance data
      await fetchAttendanceStatus();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error updating attendance record:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get attendance report data
  const getAttendanceReport = async (
    startDate: string,
    endDate: string,
    type: "summary" | "detailed" = "summary"
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/staff/${staffId}/attendance/reports?startDate=${startDate}&endDate=${endDate}&type=${type}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error generating attendance report:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh attendance status every minute when component is mounted
  useEffect(() => {
    if (staffId) {
      fetchAttendanceStatus();

      const interval = setInterval(() => {
        fetchAttendanceStatus();
      }, 60000); // Refresh every minute

      return () => clearInterval(interval);
    }
  }, [staffId]);

  return {
    // State
    attendanceStatus,
    attendanceRecords,
    attendanceSummary,
    loading,
    error,

    // Actions
    fetchAttendanceStatus,
    fetchAttendanceRecords,
    fetchAttendanceSummary,
    clockIn,
    clockOut,
    updateAttendanceRecord,
    getAttendanceReport,

    // Computed values
    isClockedIn: attendanceStatus?.attendance.is_clocked_in || false,
    currentSessionDuration:
      attendanceStatus?.attendance.current_session_duration_minutes || 0,
    todayHours: attendanceStatus?.attendance.total_hours_worked || 0,
    todayOvertime: attendanceStatus?.attendance.overtime_hours || 0,
  };
}
