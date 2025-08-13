import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  StaffShift,
  StaffAttendance,
  ShiftStatus,
  AttendanceStatus,
} from "@/types/staff";

// API functions for shifts
async function fetchStaffShifts(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<StaffShift[]> {
  const response = await fetch(
    `/api/staff/${staffId}/shifts?startDate=${startDate}&endDate=${endDate}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch shifts");
  }
  const data = await response.json();
  return data.shifts;
}

async function createShift(
  staffId: string,
  shiftData: {
    shift_date: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    break_duration_minutes?: number;
    notes?: string;
  }
): Promise<StaffShift> {
  const response = await fetch(`/api/staff/${staffId}/shifts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shiftData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create shift");
  }

  const data = await response.json();
  return data.shift;
}

async function updateShift(
  staffId: string,
  shiftId: string,
  updates: Partial<{
    shift_date: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    actual_start_time: string;
    actual_end_time: string;
    break_duration_minutes: number;
    status: ShiftStatus;
    notes: string;
  }>
): Promise<StaffShift> {
  const response = await fetch(`/api/staff/${staffId}/shifts/${shiftId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update shift");
  }

  const data = await response.json();
  return data.shift;
}

async function deleteShift(staffId: string, shiftId: string): Promise<void> {
  const response = await fetch(`/api/staff/${staffId}/shifts/${shiftId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete shift");
  }
}

async function startShift(
  staffId: string,
  shiftId: string,
  actualStartTime?: string
): Promise<StaffShift> {
  const response = await fetch(`/api/staff/${staffId}/shifts/${shiftId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "start",
      actual_start_time: actualStartTime,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start shift");
  }

  const data = await response.json();
  return data.shift;
}

async function endShift(
  staffId: string,
  shiftId: string,
  actualEndTime?: string
): Promise<StaffShift> {
  const response = await fetch(`/api/staff/${staffId}/shifts/${shiftId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "end",
      actual_end_time: actualEndTime,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to end shift");
  }

  const data = await response.json();
  return data.shift;
}

// API functions for attendance
async function fetchStaffAttendance(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<StaffAttendance[]> {
  const response = await fetch(
    `/api/staff/${staffId}/attendance?startDate=${startDate}&endDate=${endDate}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch attendance");
  }
  const data = await response.json();
  return data.attendance;
}

async function fetchAttendanceSummary(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<{
  total_days_worked: number;
  total_hours_worked: number;
  total_overtime_hours: number;
  punctuality_score: number;
  absence_count: number;
  late_count: number;
  early_departure_count: number;
}> {
  const response = await fetch(
    `/api/staff/${staffId}/attendance?startDate=${startDate}&endDate=${endDate}&summary=true`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch attendance summary");
  }
  const data = await response.json();
  return data.summary;
}

async function createAttendanceRecord(
  staffId: string,
  attendanceData: {
    shift_id?: string;
    attendance_date: string;
    clock_in_time?: string;
    clock_out_time?: string;
    status: AttendanceStatus;
    notes?: string;
  }
): Promise<StaffAttendance> {
  const response = await fetch(`/api/staff/${staffId}/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(attendanceData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create attendance record");
  }

  const data = await response.json();
  return data.attendance;
}

// Custom hooks
export function useStaffShifts(
  staffId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["staff-shifts", staffId, startDate, endDate],
    queryFn: () => fetchStaffShifts(staffId, startDate, endDate),
    enabled: !!staffId && !!startDate && !!endDate,
  });
}

export function useCreateShift(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftData: Parameters<typeof createShift>[1]) =>
      createShift(staffId, shiftData),
    onSuccess: () => {
      // Invalidate and refetch shifts
      queryClient.invalidateQueries({
        queryKey: ["staff-shifts", staffId],
      });
    },
  });
}

export function useUpdateShift(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shiftId,
      updates,
    }: {
      shiftId: string;
      updates: Parameters<typeof updateShift>[2];
    }) => updateShift(staffId, shiftId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["staff-shifts", staffId],
      });
    },
  });
}

export function useDeleteShift(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftId: string) => deleteShift(staffId, shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["staff-shifts", staffId],
      });
    },
  });
}

export function useStartShift(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shiftId,
      actualStartTime,
    }: {
      shiftId: string;
      actualStartTime?: string;
    }) => startShift(staffId, shiftId, actualStartTime),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["staff-shifts", staffId],
      });
    },
  });
}

export function useEndShift(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shiftId,
      actualEndTime,
    }: {
      shiftId: string;
      actualEndTime?: string;
    }) => endShift(staffId, shiftId, actualEndTime),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["staff-shifts", staffId],
      });
    },
  });
}

export function useStaffAttendance(
  staffId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["staff-attendance", staffId, startDate, endDate],
    queryFn: () => fetchStaffAttendance(staffId, startDate, endDate),
    enabled: !!staffId && !!startDate && !!endDate,
  });
}

export function useAttendanceSummary(
  staffId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["attendance-summary", staffId, startDate, endDate],
    queryFn: () => fetchAttendanceSummary(staffId, startDate, endDate),
    enabled: !!staffId && !!startDate && !!endDate,
  });
}

export function useCreateAttendance(staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      attendanceData: Parameters<typeof createAttendanceRecord>[1]
    ) => createAttendanceRecord(staffId, attendanceData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["staff-attendance", staffId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance-summary", staffId],
      });
    },
  });
}
