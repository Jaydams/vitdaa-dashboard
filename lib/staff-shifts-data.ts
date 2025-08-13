import { createClient } from "@/lib/supabase/server";
import {
  StaffShift,
  StaffAttendance,
  ShiftStatus,
  AttendanceStatus,
} from "@/types/staff";

/**
 * Creates a new shift for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param shiftData - The shift information
 * @returns The created shift record or null if failed
 */
export async function createStaffShift(
  staffId: string,
  businessId: string,
  shiftData: {
    shift_date: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    break_duration_minutes?: number;
    notes?: string;
  }
): Promise<StaffShift | null> {
  try {
    const supabase = await createClient();

    // Check for scheduling conflicts
    const hasConflict = await checkShiftConflict(
      staffId,
      businessId,
      shiftData.shift_date,
      shiftData.scheduled_start_time,
      shiftData.scheduled_end_time
    );

    if (hasConflict) {
      console.error("Shift conflict detected");
      return null;
    }

    const { data: shift, error } = await supabase
      .from("staff_shifts")
      .insert({
        staff_id: staffId,
        business_id: businessId,
        shift_date: shiftData.shift_date,
        scheduled_start_time: shiftData.scheduled_start_time,
        scheduled_end_time: shiftData.scheduled_end_time,
        break_duration_minutes: shiftData.break_duration_minutes || 0,
        notes: shiftData.notes,
        status: "scheduled" as ShiftStatus,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating staff shift:", error);
      return null;
    }

    return shift as StaffShift;
  } catch (error) {
    console.error("Error creating staff shift:", error);
    return null;
  }
}

/**
 * Checks for shift scheduling conflicts
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param shiftDate - The shift date
 * @param startTime - The start time
 * @param endTime - The end time
 * @param excludeShiftId - Optional shift ID to exclude from conflict check
 * @returns True if there's a conflict, false otherwise
 */
export async function checkShiftConflict(
  staffId: string,
  businessId: string,
  shiftDate: string,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("staff_shifts")
      .select("id")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("shift_date", shiftDate)
      .neq("status", "cancelled")
      .or(
        `and(scheduled_start_time.lte.${startTime},scheduled_end_time.gt.${startTime}),` +
          `and(scheduled_start_time.lt.${endTime},scheduled_end_time.gte.${endTime}),` +
          `and(scheduled_start_time.gte.${startTime},scheduled_end_time.lte.${endTime})`
      );

    if (excludeShiftId) {
      query = query.neq("id", excludeShiftId);
    }

    const { data: conflicts, error } = await query;

    if (error) {
      console.error("Error checking shift conflict:", error);
      return false; // Assume no conflict if we can't check
    }

    return (conflicts?.length || 0) > 0;
  } catch (error) {
    console.error("Error checking shift conflict:", error);
    return false;
  }
}

/**
 * Gets shifts for a staff member within a date range
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of shifts
 */
export async function getStaffShifts(
  staffId: string,
  businessId: string,
  startDate: string,
  endDate: string
): Promise<StaffShift[]> {
  try {
    const supabase = await createClient();

    const { data: shifts, error } = await supabase
      .from("staff_shifts")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("shift_date", { ascending: true })
      .order("scheduled_start_time", { ascending: true });

    if (error) {
      console.error("Error getting staff shifts:", error);
      return [];
    }

    return shifts || [];
  } catch (error) {
    console.error("Error getting staff shifts:", error);
    return [];
  }
}

/**
 * Gets upcoming shifts for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param limit - Maximum number of shifts to return (default: 10)
 * @returns Array of upcoming shifts
 */
export async function getUpcomingStaffShifts(
  staffId: string,
  businessId: string,
  limit: number = 10
): Promise<StaffShift[]> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: shifts, error } = await supabase
      .from("staff_shifts")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .gte("shift_date", today)
      .in("status", ["scheduled", "in_progress"])
      .order("shift_date", { ascending: true })
      .order("scheduled_start_time", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error getting upcoming staff shifts:", error);
      return [];
    }

    return shifts || [];
  } catch (error) {
    console.error("Error getting upcoming staff shifts:", error);
    return [];
  }
}

/**
 * Updates a shift
 * @param shiftId - The shift ID
 * @param businessId - The business ID
 * @param updates - The fields to update
 * @returns Updated shift record or null if failed
 */
export async function updateStaffShift(
  shiftId: string,
  businessId: string,
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
): Promise<StaffShift | null> {
  try {
    const supabase = await createClient();

    // If updating schedule times, check for conflicts
    if (
      updates.shift_date ||
      updates.scheduled_start_time ||
      updates.scheduled_end_time
    ) {
      const { data: currentShift } = await supabase
        .from("staff_shifts")
        .select(
          "staff_id, shift_date, scheduled_start_time, scheduled_end_time"
        )
        .eq("id", shiftId)
        .eq("business_id", businessId)
        .single();

      if (currentShift) {
        const hasConflict = await checkShiftConflict(
          currentShift.staff_id,
          businessId,
          updates.shift_date || currentShift.shift_date,
          updates.scheduled_start_time || currentShift.scheduled_start_time,
          updates.scheduled_end_time || currentShift.scheduled_end_time,
          shiftId
        );

        if (hasConflict) {
          console.error("Shift update would create conflict");
          return null;
        }
      }
    }

    const { data: shift, error } = await supabase
      .from("staff_shifts")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shiftId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      console.error("Error updating staff shift:", error);
      return null;
    }

    return shift as StaffShift;
  } catch (error) {
    console.error("Error updating staff shift:", error);
    return null;
  }
}

/**
 * Starts a shift (clock in)
 * @param shiftId - The shift ID
 * @param businessId - The business ID
 * @param actualStartTime - The actual start time
 * @returns Updated shift record or null if failed
 */
export async function startShift(
  shiftId: string,
  businessId: string,
  actualStartTime?: string
): Promise<StaffShift | null> {
  const startTime = actualStartTime || new Date().toTimeString().split(" ")[0];

  return updateStaffShift(shiftId, businessId, {
    actual_start_time: startTime,
    status: "in_progress",
  });
}

/**
 * Ends a shift (clock out)
 * @param shiftId - The shift ID
 * @param businessId - The business ID
 * @param actualEndTime - The actual end time
 * @returns Updated shift record or null if failed
 */
export async function endShift(
  shiftId: string,
  businessId: string,
  actualEndTime?: string
): Promise<StaffShift | null> {
  const endTime = actualEndTime || new Date().toTimeString().split(" ")[0];

  return updateStaffShift(shiftId, businessId, {
    actual_end_time: endTime,
    status: "completed",
  });
}

/**
 * Gets all shifts for a business within a date range
 * @param businessId - The business ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of shifts with staff information
 */
export async function getBusinessShifts(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<
  (StaffShift & {
    staff: { first_name: string; last_name: string; role: string };
  })[]
> {
  try {
    const supabase = await createClient();

    const { data: shifts, error } = await supabase
      .from("staff_shifts")
      .select(
        `
        *,
        staff:staff_id (
          first_name,
          last_name,
          role
        )
      `
      )
      .eq("business_id", businessId)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("shift_date", { ascending: true })
      .order("scheduled_start_time", { ascending: true });

    if (error) {
      console.error("Error getting business shifts:", error);
      return [];
    }

    return shifts || [];
  } catch (error) {
    console.error("Error getting business shifts:", error);
    return [];
  }
}

/**
 * Creates an attendance record
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param attendanceData - The attendance information
 * @returns The created attendance record or null if failed
 */
export async function createAttendanceRecord(
  staffId: string,
  businessId: string,
  attendanceData: {
    shift_id?: string;
    attendance_date: string;
    clock_in_time?: string;
    clock_out_time?: string;
    status: AttendanceStatus;
    notes?: string;
  }
): Promise<StaffAttendance | null> {
  try {
    const supabase = await createClient();

    // Calculate hours worked if both clock in and out times are provided
    let totalHoursWorked: number | undefined;
    let overtimeHours = 0;

    if (attendanceData.clock_in_time && attendanceData.clock_out_time) {
      const clockIn = new Date(
        `${attendanceData.attendance_date}T${attendanceData.clock_in_time}`
      );
      const clockOut = new Date(
        `${attendanceData.attendance_date}T${attendanceData.clock_out_time}`
      );

      // Handle shifts that cross midnight
      if (clockOut < clockIn) {
        clockOut.setDate(clockOut.getDate() + 1);
      }

      const diffMs = clockOut.getTime() - clockIn.getTime();
      totalHoursWorked = diffMs / (1000 * 60 * 60); // Convert to hours

      // Calculate overtime (assuming 8 hours is standard)
      if (totalHoursWorked > 8) {
        overtimeHours = totalHoursWorked - 8;
      }
    }

    const { data: attendance, error } = await supabase
      .from("staff_attendance")
      .insert({
        staff_id: staffId,
        business_id: businessId,
        shift_id: attendanceData.shift_id,
        attendance_date: attendanceData.attendance_date,
        clock_in_time: attendanceData.clock_in_time
          ? `${attendanceData.attendance_date}T${attendanceData.clock_in_time}:00Z`
          : null,
        clock_out_time: attendanceData.clock_out_time
          ? `${attendanceData.attendance_date}T${attendanceData.clock_out_time}:00Z`
          : null,
        total_hours_worked: totalHoursWorked,
        overtime_hours: overtimeHours,
        status: attendanceData.status,
        notes: attendanceData.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating attendance record:", error);
      return null;
    }

    return attendance as StaffAttendance;
  } catch (error) {
    console.error("Error creating attendance record:", error);
    return null;
  }
}

/**
 * Updates an attendance record
 * @param attendanceId - The attendance record ID
 * @param businessId - The business ID
 * @param updates - The fields to update
 * @returns Updated attendance record or null if failed
 */
export async function updateAttendanceRecord(
  attendanceId: string,
  businessId: string,
  updates: Partial<{
    clock_in_time: string;
    clock_out_time: string;
    status: AttendanceStatus;
    notes: string;
  }>
): Promise<StaffAttendance | null> {
  try {
    const supabase = await createClient();

    // Get current record to recalculate hours if times are updated
    const { data: currentRecord } = await supabase
      .from("staff_attendance")
      .select("attendance_date, clock_in_time, clock_out_time")
      .eq("id", attendanceId)
      .eq("business_id", businessId)
      .single();

    let updateData: any = { ...updates, updated_at: new Date().toISOString() };

    // Recalculate hours if times are being updated
    if ((updates.clock_in_time || updates.clock_out_time) && currentRecord) {
      const clockInTime =
        updates.clock_in_time ||
        (currentRecord.clock_in_time
          ? new Date(currentRecord.clock_in_time).toTimeString().split(" ")[0]
          : null);
      const clockOutTime =
        updates.clock_out_time ||
        (currentRecord.clock_out_time
          ? new Date(currentRecord.clock_out_time).toTimeString().split(" ")[0]
          : null);

      if (clockInTime && clockOutTime) {
        const attendanceDate = currentRecord.attendance_date;
        const clockIn = new Date(`${attendanceDate}T${clockInTime}`);
        const clockOut = new Date(`${attendanceDate}T${clockOutTime}`);

        if (clockOut < clockIn) {
          clockOut.setDate(clockOut.getDate() + 1);
        }

        const diffMs = clockOut.getTime() - clockIn.getTime();
        const totalHoursWorked = diffMs / (1000 * 60 * 60);
        const overtimeHours = totalHoursWorked > 8 ? totalHoursWorked - 8 : 0;

        updateData.total_hours_worked = totalHoursWorked;
        updateData.overtime_hours = overtimeHours;
      }

      // Format times for database
      if (updates.clock_in_time) {
        updateData.clock_in_time = `${currentRecord.attendance_date}T${updates.clock_in_time}:00Z`;
      }
      if (updates.clock_out_time) {
        updateData.clock_out_time = `${currentRecord.attendance_date}T${updates.clock_out_time}:00Z`;
      }
    }

    const { data: attendance, error } = await supabase
      .from("staff_attendance")
      .update(updateData)
      .eq("id", attendanceId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      console.error("Error updating attendance record:", error);
      return null;
    }

    return attendance as StaffAttendance;
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return null;
  }
}

/**
 * Gets attendance records for a staff member within a date range
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of attendance records
 */
export async function getStaffAttendance(
  staffId: string,
  businessId: string,
  startDate: string,
  endDate: string
): Promise<StaffAttendance[]> {
  try {
    const supabase = await createClient();

    const { data: attendance, error } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)
      .order("attendance_date", { ascending: false });

    if (error) {
      console.error("Error getting staff attendance:", error);
      return [];
    }

    return attendance || [];
  } catch (error) {
    console.error("Error getting staff attendance:", error);
    return [];
  }
}

/**
 * Gets attendance summary for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Attendance summary
 */
export async function getStaffAttendanceSummary(
  staffId: string,
  businessId: string,
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
} | null> {
  try {
    const attendance = await getStaffAttendance(
      staffId,
      businessId,
      startDate,
      endDate
    );

    if (attendance.length === 0) {
      return {
        total_days_worked: 0,
        total_hours_worked: 0,
        total_overtime_hours: 0,
        punctuality_score: 100,
        absence_count: 0,
        late_count: 0,
        early_departure_count: 0,
      };
    }

    const totalDaysWorked = attendance.filter(
      (a) => a.status === "present"
    ).length;
    const totalHoursWorked = attendance.reduce(
      (sum, a) => sum + (a.total_hours_worked || 0),
      0
    );
    const totalOvertimeHours = attendance.reduce(
      (sum, a) => sum + (a.overtime_hours || 0),
      0
    );
    const absenceCount = attendance.filter((a) => a.status === "absent").length;
    const lateCount = attendance.filter((a) => a.status === "late").length;
    const earlyDepartureCount = attendance.filter(
      (a) => a.status === "early_departure"
    ).length;

    // Calculate punctuality score (percentage of on-time attendance)
    const totalAttendanceDays = attendance.length;
    const onTimeAttendance =
      totalAttendanceDays - lateCount - earlyDepartureCount;
    const punctualityScore =
      totalAttendanceDays > 0
        ? (onTimeAttendance / totalAttendanceDays) * 100
        : 100;

    return {
      total_days_worked: totalDaysWorked,
      total_hours_worked: Math.round(totalHoursWorked * 100) / 100,
      total_overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
      punctuality_score: Math.round(punctualityScore * 100) / 100,
      absence_count: absenceCount,
      late_count: lateCount,
      early_departure_count: earlyDepartureCount,
    };
  } catch (error) {
    console.error("Error getting staff attendance summary:", error);
    return null;
  }
}

/**
 * Deletes a shift
 * @param shiftId - The shift ID
 * @param businessId - The business ID
 * @returns True if successful, false otherwise
 */
export async function deleteStaffShift(
  shiftId: string,
  businessId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("staff_shifts")
      .delete()
      .eq("id", shiftId)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error deleting staff shift:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting staff shift:", error);
    return false;
  }
}
