import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  createAttendanceRecord,
  getStaffAttendance,
  getStaffAttendanceSummary,
} from "@/lib/staff-shifts-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const businessId = await getServerBusinessOwnerId();

    if (!businessId) {
      return NextResponse.json(
        { error: "Unauthorized - Business owner access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const summary = searchParams.get("summary") === "true";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    if (summary) {
      const attendanceSummary = await getStaffAttendanceSummary(
        staffId,
        businessId,
        startDate,
        endDate
      );
      return NextResponse.json({ summary: attendanceSummary });
    }

    const attendance = await getStaffAttendance(
      staffId,
      businessId,
      startDate,
      endDate
    );

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error("Error fetching staff attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const businessId = await getServerBusinessOwnerId();

    if (!businessId) {
      return NextResponse.json(
        { error: "Unauthorized - Business owner access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      shift_id,
      attendance_date,
      clock_in_time,
      clock_out_time,
      status,
      notes,
    } = body;

    // Validate required fields
    if (!attendance_date || !status) {
      return NextResponse.json(
        { error: "Attendance date and status are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(attendance_date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD format" },
        { status: 400 }
      );
    }

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

    const attendance = await createAttendanceRecord(staffId, businessId, {
      shift_id,
      attendance_date,
      clock_in_time,
      clock_out_time,
      status,
      notes,
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Failed to create attendance record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance record:", error);
    return NextResponse.json(
      { error: "Failed to create attendance record" },
      { status: 500 }
    );
  }
}
