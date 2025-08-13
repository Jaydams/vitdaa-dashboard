import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getStaffPerformanceTrend,
  getBusinessPerformanceStatistics,
  getStaffRecentAchievements,
} from "@/lib/staff-performance-data";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const type = searchParams.get("type");

    if (staffId) {
      // Get analytics for specific staff member
      switch (type) {
        case "trend":
          const trend = await getStaffPerformanceTrend(staffId, businessId);
          return NextResponse.json({ trend });

        case "achievements":
          const achievements = await getStaffRecentAchievements(
            staffId,
            businessId
          );
          return NextResponse.json({ achievements });

        default:
          // Get comprehensive staff analytics
          const [performanceTrend, recentAchievements] = await Promise.all([
            getStaffPerformanceTrend(staffId, businessId),
            getStaffRecentAchievements(staffId, businessId),
          ]);

          return NextResponse.json({
            trend: performanceTrend,
            achievements: recentAchievements,
          });
      }
    } else {
      // Get business-wide analytics
      const statistics = await getBusinessPerformanceStatistics(businessId);
      return NextResponse.json({ statistics });
    }
  } catch (error) {
    console.error("Error fetching performance analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance analytics" },
      { status: 500 }
    );
  }
}
