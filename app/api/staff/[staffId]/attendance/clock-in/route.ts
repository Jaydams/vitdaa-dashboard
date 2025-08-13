import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  createAttendanceRecord,
  getUpcomingStaffShifts,
} from "@/lib/staff-shifts-data";

/**
 * Clock in a staff member
 * POST /api/staff/[staffId]/attendance/clock-in
 */
export async function POST(
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
    const body = await request.json();
    const { notes } = body;

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

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().split(" ")[0];

    // Check if already clocked in today
    const { data: existingAttendance } = await supabase
      .from("staff_attendance")
      .select("id, clock_out_time")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("attendance_date", currentDate)
      .single();

    if (existingAttendance && !existingAttendance.clock_out_time) {
      return NextResponse.json(
        { error: "Staff member is already clocked in" },
        { status: 400 }
      );
    }

    // Get today's scheduled shift to determine if late
    const upcomingShifts = await getUpcomingStaffShifts(staffId, businessId, 1);
    const todayShift = upcomingShifts.find(
      (shift) => shift.shift_date === currentDate
    );

    let status: "present" | "late" = "present";
    let shiftId: string | undefined;

    if (todayShift) {
      shiftId = todayShift.id;
      const scheduledStart = new Date(
        `${currentDate}T${todayShift.scheduled_start_time}`
      );
      const actualStart = new Date(`${currentDate}T${currentTime}`);

      // Consider late if more than 5 minutes after scheduled start
      if (actualStart.getTime() - scheduledStart.getTime() > 5 * 60 * 1000) {
        status = "late";
      }

      // Update shift status to in_progress
      await supabase
        .from("staff_shifts")
        .update({
          actual_start_time: currentTime,
          status: "in_progress",
          updated_at: now.toISOString(),
        })
        .eq("id", shiftId)
        .eq("business_id", businessId);
    }

    // Create attendance record
    const attendance = await createAttendanceRecord(staffId, businessId, {
      shift_id: shiftId,
      attendance_date: currentDate,
      clock_in_time: currentTime,
      status,
      notes,
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Failed to create attendance record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attendance,
      message: `${staff.first_name} ${staff.last_name} clocked in successfully${
        status === "late" ? " (marked as late)" : ""
      }`,
    });
  } catch (error) {
    console.error("Error clocking in staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
