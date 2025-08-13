import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { updateAttendanceRecord } from "@/lib/staff-shifts-data";

/**
 * Clock out a staff member
 * POST /api/staff/[staffId]/attendance/clock-out
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

    // Find today's attendance record that hasn't been clocked out
    const { data: attendanceRecord, error: attendanceError } = await supabase
      .from("staff_attendance")
      .select("id, shift_id, clock_in_time, status")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("attendance_date", currentDate)
      .is("clock_out_time", null)
      .single();

    if (attendanceError || !attendanceRecord) {
      return NextResponse.json(
        { error: "No active clock-in found for today" },
        { status: 400 }
      );
    }

    // Check if clocking out early from scheduled shift
    let updatedStatus = attendanceRecord.status;

    if (attendanceRecord.shift_id) {
      const { data: shift } = await supabase
        .from("staff_shifts")
        .select("scheduled_end_time")
        .eq("id", attendanceRecord.shift_id)
        .single();

      if (shift) {
        const scheduledEnd = new Date(
          `${currentDate}T${shift.scheduled_end_time}`
        );
        const actualEnd = new Date(`${currentDate}T${currentTime}`);

        // Consider early departure if more than 15 minutes before scheduled end
        if (scheduledEnd.getTime() - actualEnd.getTime() > 15 * 60 * 1000) {
          updatedStatus = "early_departure";
        }

        // Update shift status to completed
        await supabase
          .from("staff_shifts")
          .update({
            actual_end_time: currentTime,
            status: "completed",
            updated_at: now.toISOString(),
          })
          .eq("id", attendanceRecord.shift_id)
          .eq("business_id", businessId);
      }
    }

    // Update attendance record with clock out time
    const updatedAttendance = await updateAttendanceRecord(
      attendanceRecord.id,
      businessId,
      {
        clock_out_time: currentTime,
        status: updatedStatus,
        notes: notes || undefined,
      }
    );

    if (!updatedAttendance) {
      return NextResponse.json(
        { error: "Failed to update attendance record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attendance: updatedAttendance,
      message: `${staff.first_name} ${
        staff.last_name
      } clocked out successfully${
        updatedStatus === "early_departure"
          ? " (marked as early departure)"
          : ""
      }`,
    });
  } catch (error) {
    console.error("Error clocking out staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
