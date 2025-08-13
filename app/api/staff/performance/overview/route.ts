import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getBusinessPerformanceReviews,
  getBusinessPerformanceStatistics,
} from "@/lib/staff-performance-data";
import { ReviewStatus } from "@/types/staff";

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as ReviewStatus;
    const includeStatistics = searchParams.get("includeStatistics") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Validate status if provided
    if (status) {
      const validStatuses: ReviewStatus[] = ["draft", "completed", "approved"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be: draft, completed, or approved" },
          { status: 400 }
        );
      }
    }

    const reviews = await getBusinessPerformanceReviews(
      businessOwnerId,
      status,
      limit
    );

    if (includeStatistics) {
      const statistics = await getBusinessPerformanceStatistics(
        businessOwnerId
      );
      return NextResponse.json({
        reviews,
        statistics,
      });
    } else {
      return NextResponse.json({
        reviews,
      });
    }
  } catch (error) {
    console.error("Error in GET /api/staff/performance/overview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
