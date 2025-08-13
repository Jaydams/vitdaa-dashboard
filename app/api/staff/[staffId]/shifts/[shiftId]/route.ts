import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  updateStaffShift,
  deleteStaffShift,
  startShift,
  endShift,
} from "@/lib/staff-shifts-data";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string; shiftId: string }> }
) {
  try {
    const { shiftId } = await params;
    const businessId = await getServerBusinessOwnerId();

    if (!businessId) {
      return NextResponse.json(
        { error: "Unauthorized - Business owner access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...updates } = body;

    let shift;

    if (action === "start") {
      shift = await startShift(shiftId, businessId, updates.actual_start_time);
    } else if (action === "end") {
      shift = await endShift(shiftId, businessId, updates.actual_end_time);
    } else {
      // Regular update
      shift = await updateStaffShift(shiftId, businessId, updates);
    }

    if (!shift) {
      return NextResponse.json(
        { error: "Failed to update shift. Possible scheduling conflict." },
        { status: 409 }
      );
    }

    return NextResponse.json({ shift });
  } catch (error) {
    console.error("Error updating staff shift:", error);
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string; shiftId: string }> }
) {
  try {
    const { shiftId } = await params;
    const businessId = await getServerBusinessOwnerId();

    if (!businessId) {
      return NextResponse.json(
        { error: "Unauthorized - Business owner access required" },
        { status: 401 }
      );
    }

    const success = await deleteStaffShift(shiftId, businessId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete shift" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Shift deleted successfully" });
  } catch (error) {
    console.error("Error deleting staff shift:", error);
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
