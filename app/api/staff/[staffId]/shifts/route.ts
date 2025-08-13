import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getStaffShifts,
  createStaffShift,
  getUpcomingStaffShifts,
} from "@/lib/staff-shifts-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const upcoming = searchParams.get("upcoming") === "true";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (upcoming) {
      const upcomingShifts = await getUpcomingStaffShifts(
        staffId,
        businessOwnerId,
        limit
      );
      return NextResponse.json({ shifts: upcomingShifts });
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error:
            "startDate and endDate are required when not requesting upcoming shifts",
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const shifts = await getStaffShifts(
      staffId,
      businessOwnerId,
      startDate,
      endDate
    );

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error("Error in GET /api/staff/[staffId]/shifts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.shift_date ||
      !body.scheduled_start_time ||
      !body.scheduled_end_time
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: shift_date, scheduled_start_time, scheduled_end_time",
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.shift_date)) {
      return NextResponse.json(
        { error: "Invalid shift_date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM:SS or HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (
      !timeRegex.test(body.scheduled_start_time) ||
      !timeRegex.test(body.scheduled_end_time)
    ) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM or HH:MM:SS" },
        { status: 400 }
      );
    }

    // Ensure start time is before end time
    const startTime = body.scheduled_start_time.padEnd(8, ":00");
    const endTime = body.scheduled_end_time.padEnd(8, ":00");

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "scheduled_start_time must be before scheduled_end_time" },
        { status: 400 }
      );
    }

    const shiftData = {
      shift_date: body.shift_date,
      scheduled_start_time: startTime,
      scheduled_end_time: endTime,
      break_duration_minutes: body.break_duration_minutes,
      notes: body.notes,
    };

    const newShift = await createStaffShift(
      staffId,
      businessOwnerId,
      shiftData
    );

    if (!newShift) {
      return NextResponse.json(
        {
          error:
            "Failed to create shift. This may be due to a scheduling conflict.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(newShift, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/staff/[staffId]/shifts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
