import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { generateProductivityAnalyticsReport } from "@/lib/staff-reports-data";

export async function GET(request: NextRequest) {
  try {
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

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const report = await generateProductivityAnalyticsReport(
      businessId,
      startDate,
      endDate
    );

    if (!report) {
      return NextResponse.json(
        { error: "Failed to generate productivity report" },
        { status: 500 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating productivity report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
