import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  updateStaffShift,
  deleteStaffShift,
  startShift,
  endShift,
} from "@/lib/staff-shifts-data";
import { ShiftStatus } from "@/types/staff";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shiftId } = await params;

    // Validate shiftId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(shiftId)) {
      return NextResponse.json(
        { error: "Invalid shift ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, ...updates } = body;

    // Handle special actions
    if (action === "start") {
      const updatedShift = await startShift(
        shiftId,
        businessOwnerId,
        body.actual_start_time
      );

      if (!updatedShift) {
        return NextResponse.json(
          { error: "Failed to start shift" },
          { status: 500 }
        );
      }

      return NextResponse.json(updatedShift);
    }

    if (action === "end") {
      const updatedShift = await endShift(
        shiftId,
        businessOwnerId,
        body.actual_end_time
      );

      if (!updatedShift) {
        return NextResponse.json(
          { error: "Failed to end shift" },
          { status: 500 }
        );
      }

      return NextResponse.json(updatedShift);
    }

    // Validate date format if provided
    if (updates.shift_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updates.shift_date)) {
        return NextResponse.json(
          { error: "Invalid shift_date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
    }

    // Validate time formats if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (
      updates.scheduled_start_time &&
      !timeRegex.test(updates.scheduled_start_time)
    ) {
      return NextResponse.json(
        { error: "Invalid scheduled_start_time format. Use HH:MM or HH:MM:SS" },
        { status: 400 }
      );
    }
    if (
      updates.scheduled_end_time &&
      !timeRegex.test(updates.scheduled_end_time)
    ) {
      return NextResponse.json(
        { error: "Invalid scheduled_end_time format. Use HH:MM or HH:MM:SS" },
        { status: 400 }
      );
    }
    if (
      updates.actual_start_time &&
      !timeRegex.test(updates.actual_start_time)
    ) {
      return NextResponse.json(
        { error: "Invalid actual_start_time format. Use HH:MM or HH:MM:SS" },
        { status: 400 }
      );
    }
    if (updates.actual_end_time && !timeRegex.test(updates.actual_end_time)) {
      return NextResponse.json(
        { error: "Invalid actual_end_time format. Use HH:MM or HH:MM:SS" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (updates.status) {
      const validStatuses: ShiftStatus[] = [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json(
          {
            error:
              "Invalid status. Must be: scheduled, in_progress, completed, or cancelled",
          },
          { status: 400 }
        );
      }
    }

    // Ensure times are properly formatted
    if (updates.scheduled_start_time) {
      updates.scheduled_start_time = updates.scheduled_start_time.padEnd(
        8,
        ":00"
      );
    }
    if (updates.scheduled_end_time) {
      updates.scheduled_end_time = updates.scheduled_end_time.padEnd(8, ":00");
    }
    if (updates.actual_start_time) {
      updates.actual_start_time = updates.actual_start_time.padEnd(8, ":00");
    }
    if (updates.actual_end_time) {
      updates.actual_end_time = updates.actual_end_time.padEnd(8, ":00");
    }

    const updatedShift = await updateStaffShift(
      shiftId,
      businessOwnerId,
      updates
    );

    if (!updatedShift) {
      return NextResponse.json(
        {
          error:
            "Failed to update shift. This may be due to a scheduling conflict.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(updatedShift);
  } catch (error) {
    console.error("Error in PUT /api/staff/shifts/[shiftId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shiftId } = await params;

    // Validate shiftId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(shiftId)) {
      return NextResponse.json(
        { error: "Invalid shift ID format" },
        { status: 400 }
      );
    }

    const success = await deleteStaffShift(shiftId, businessOwnerId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete shift" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Shift deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/staff/shifts/[shiftId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
