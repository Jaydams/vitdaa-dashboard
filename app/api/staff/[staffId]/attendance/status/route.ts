import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

/**
 * Get current attendance status for a staff member
 * GET /api/staff/[staffId]/attendance/status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json(
        { error: "Unauthorized - Business owner not found" },
        { status: 401 }
      );
    }

    const { staffId } = params;
    const supabase = await createClient();

    // Verify staff belongs to this business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name")
      .eq("id", staffId)
      .eq("business_id", businessId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    const currentDate = new Date().toISOString().split("T")[0];

    // Get today's attendance record
    const { data: attendanceRecord } = await supabase
      .from("staff_attendance")
      .select(
        `
        id,
        clock_in_time,
        clock_out_time,
        status,
        total_hours_worked,
        overtime_hours,
        shift_id,
        notes
      `
      )
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("attendance_date", currentDate)
      .single();

    // Get today's scheduled shift
    const { data: todayShift } = await supabase
      .from("staff_shifts")
      .select(
        `
        id,
        scheduled_start_time,
        scheduled_end_time,
        actual_start_time,
        actual_end_time,
        status,
        break_duration_minutes
      `
      )
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("shift_date", currentDate)
      .single();

    const isClockedIn =
      attendanceRecord &&
      attendanceRecord.clock_in_time &&
      !attendanceRecord.clock_out_time;

    // Calculate current session duration if clocked in
    let currentSessionDuration = 0;
    if (isClockedIn && attendanceRecord.clock_in_time) {
      const clockInTime = new Date(attendanceRecord.clock_in_time);
      const now = new Date();
      currentSessionDuration = Math.floor(
        (now.getTime() - clockInTime.getTime()) / (1000 * 60)
      ); // in minutes
    }

    return NextResponse.json({
      staff: {
        id: staff.id,
        name: `${staff.first_name} ${staff.last_name}`,
      },
      attendance: {
        is_clocked_in: isClockedIn,
        clock_in_time: attendanceRecord?.clock_in_time,
        clock_out_time: attendanceRecord?.clock_out_time,
        status: attendanceRecord?.status,
        total_hours_worked: attendanceRecord?.total_hours_worked,
        overtime_hours: attendanceRecord?.overtime_hours,
        current_session_duration_minutes: currentSessionDuration,
        notes: attendanceRecord?.notes,
      },
      shift: todayShift
        ? {
            id: todayShift.id,
            scheduled_start_time: todayShift.scheduled_start_time,
            scheduled_end_time: todayShift.scheduled_end_time,
            actual_start_time: todayShift.actual_start_time,
            actual_end_time: todayShift.actual_end_time,
            status: todayShift.status,
            break_duration_minutes: todayShift.break_duration_minutes,
          }
        : null,
    });
  } catch (error) {
    console.error("Error getting attendance status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
