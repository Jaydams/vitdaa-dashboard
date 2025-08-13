import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { updateAttendanceRecord } from "@/lib/staff-shifts-data";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string; attendanceId: string }> }
) {
  try {
    const { attendanceId } = await params;
    const businessId = await getServerBusinessOwnerId();

    if (!businessId) {
      return NextResponse.json(
        { error: "Unauthorized - Business owner access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clock_in_time, clock_out_time, status, notes } = body;

    // Validate time format if provided (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (clock_in_time && !timeRegex.test(clock_in_time)) {
      return NextResponse.json(
        { error: "Invalid clock in time format. Use HH:MM format" },
        { status: 400 }
      );
    }
    if (clock_out_time && !timeRegex.test(clock_out_time)) {
      return NextResponse.json(
        { error: "Invalid clock out time format. Use HH:MM format" },
        { status: 400 }
      );
    }

    const attendance = await updateAttendanceRecord(attendanceId, businessId, {
      clock_in_time,
      clock_out_time,
      status,
      notes,
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Failed to update attendance record" },
        { status: 404 }
      );
    }

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record" },
      { status: 500 }
    );
  }
}
