import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const staffId = params.staffId;

    // Get query parameters
    const businessId = searchParams.get("business_id");
    const activityType = searchParams.get("activity_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Build query for staff activity logs
    let query = supabase
      .from("staff_activity_logs")
      .select(
        `
        *,
        staff:staff(id, first_name, last_name, role),
        staff_session:staff_sessions(id, login_time, logout_time)
      `
      )
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (activityType) {
      query = query.eq("activity_type", activityType);
    }
    if (startDate) {
      query = query.gte("timestamp", startDate);
    }
    if (endDate) {
      query = query.lte("timestamp", endDate);
    }

    const { data: activityLogs, error } = await query;

    if (error) {
      console.error("Error fetching staff activity logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch staff activity logs" },
        { status: 500 }
      );
    }

    // Get activity summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .from("staff_activity_logs")
      .select("activity_type, timestamp, performance_metrics")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .gte(
        "timestamp",
        startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .lte("timestamp", endDate || new Date().toISOString());

    if (summaryError) {
      console.error("Error fetching summary data:", summaryError);
    }

    // Calculate activity summary
    const activitySummary =
      summaryData?.reduce((acc: Record<string, any>, log: any) => {
        const type = log.activity_type;
        if (!acc[type]) {
          acc[type] = {
            count: 0,
            total_response_time: 0,
            average_response_time: 0,
          };
        }
        acc[type].count++;

        const responseTime = log.performance_metrics?.response_time || 0;
        acc[type].total_response_time += responseTime;
        acc[type].average_response_time =
          acc[type].total_response_time / acc[type].count;

        return acc;
      }, {}) || {};

    // Calculate overall performance metrics
    const totalActivities = summaryData?.length || 0;
    const averageResponseTime =
      (summaryData?.reduce((sum: number, log: any) => {
        return sum + (log.performance_metrics?.response_time || 0);
      }, 0) || 0) / Math.max(totalActivities, 1);

    const performanceMetrics = {
      total_activities: totalActivities,
      average_response_time: Math.round(averageResponseTime),
      activity_breakdown: activitySummary,
      date_range: {
        start:
          startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        end: endDate || new Date().toISOString().split("T")[0],
      },
    };

    return NextResponse.json({
      activity_logs: activityLogs,
      performance_metrics: performanceMetrics,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
