import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics, DateFilter } from "@/actions/dashboard-actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filter parameters from URL
    const filterType = searchParams.get("type") as DateFilter["type"] | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let filter: DateFilter | undefined;

    if (filterType) {
      filter = { type: filterType };

      if (filterType === "custom" && startDate && endDate) {
        filter.startDate = new Date(startDate);
        filter.endDate = new Date(endDate);
      }
    }

    // Get all dashboard metrics
    const metrics = await getDashboardMetrics(filter);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filter: DateFilter | undefined = body.filter;

    // Get all dashboard metrics with the provided filter
    const metrics = await getDashboardMetrics(filter);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
