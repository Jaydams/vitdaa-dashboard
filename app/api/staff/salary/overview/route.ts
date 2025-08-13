import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getBusinessCurrentSalaries,
  getBusinessSalaryStatistics,
} from "@/lib/staff-salary-data";

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeStatistics = searchParams.get("includeStatistics") === "true";

    const currentSalaries = await getBusinessCurrentSalaries(businessOwnerId);

    if (includeStatistics) {
      const statistics = await getBusinessSalaryStatistics(businessOwnerId);
      return NextResponse.json({
        current_salaries: currentSalaries,
        statistics,
      });
    } else {
      return NextResponse.json({
        current_salaries: currentSalaries,
      });
    }
  } catch (error) {
    console.error("Error in GET /api/staff/salary/overview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
