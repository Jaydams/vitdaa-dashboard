import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { getBusinessShifts } from "@/lib/staff-shifts-data";

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
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

    const shifts = await getBusinessShifts(businessOwnerId, startDate, endDate);

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error("Error in GET /api/staff/shifts/overview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
