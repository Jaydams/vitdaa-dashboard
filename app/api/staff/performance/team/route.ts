import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { staffPerformanceCalculator } from "@/lib/staff-performance-calculator";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const businessId = searchParams.get("business_id");
    const startDate =
      searchParams.get("start_date") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate =
      searchParams.get("end_date") || new Date().toISOString().split("T")[0];
    const role = searchParams.get("role"); // Optional filter by role
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Get all staff members for the business
    let staffQuery = supabase
      .from("staff")
      .select("id, first_name, last_name, role, created_at")
      .eq("business_id", businessId)
      .limit(limit);

    if (role) {
      staffQuery = staffQuery.eq("role", role);
    }

    const { data: staffMembers, error: staffError } = await staffQuery;

    if (staffError) {
      console.error("Error fetching staff members:", staffError);
      return NextResponse.json(
        { error: "Failed to fetch staff members" },
        { status: 500 }
      );
    }

    if (!staffMembers || staffMembers.length === 0) {
      return NextResponse.json({
        team_performance: {
          business_id: businessId,
          date_range: { start: startDate, end: endDate },
          staff_count: 0,
          team_metrics: {},
          staff_performance: [],
          top_performers: [],
          performance_distribution: {},
        },
      });
    }

    // Calculate performance metrics for each staff member
    const staffPerformancePromises = staffMembers.map(async (staff) => {
      try {
        const metrics =
          await staffPerformanceCalculator.calculatePerformanceMetrics(
            staff.id,
            businessId,
            startDate,
            endDate
          );

        return {
          staff_info: staff,
          performance_summary: {
            efficiency_score: metrics.metrics.efficiency_score,
            orders_processed: metrics.metrics.orders_processed,
            error_rate: metrics.metrics.error_rate,
            activity_volume_score: metrics.metrics.activity_volume_score,
            total_revenue_generated: metrics.metrics.total_revenue_generated,
          },
          alerts_count: metrics.performance_alerts.length,
          trend: calculateTrend(metrics.daily_trends),
        };
      } catch (error) {
        console.error(
          `Error calculating metrics for staff ${staff.id}:`,
          error
        );
        return {
          staff_info: staff,
          performance_summary: {
            efficiency_score: 0,
            orders_processed: 0,
            error_rate: 0,
            activity_volume_score: 0,
            total_revenue_generated: 0,
          },
          alerts_count: 0,
          trend: "stable",
          error: "Failed to calculate metrics",
        };
      }
    });

    const staffPerformanceResults = await Promise.all(staffPerformancePromises);

    // Calculate team-wide metrics
    const teamMetrics = calculateTeamMetrics(staffPerformanceResults);

    // Identify top performers
    const topPerformers = staffPerformanceResults
      .filter((staff) => !staff.error)
      .sort(
        (a, b) =>
          b.performance_summary.efficiency_score -
          a.performance_summary.efficiency_score
      )
      .slice(0, 5)
      .map((staff) => ({
        staff_info: staff.staff_info,
        efficiency_score: staff.performance_summary.efficiency_score,
        orders_processed: staff.performance_summary.orders_processed,
        revenue_generated: staff.performance_summary.total_revenue_generated,
      }));

    // Calculate performance distribution
    const performanceDistribution = calculatePerformanceDistribution(
      staffPerformanceResults
    );

    // Get team activity trends
    const teamActivityTrends = await getTeamActivityTrends(
      supabase,
      businessId,
      startDate,
      endDate
    );

    const teamPerformance = {
      business_id: businessId,
      date_range: { start: startDate, end: endDate },
      staff_count: staffMembers.length,
      team_metrics: teamMetrics,
      staff_performance: staffPerformanceResults,
      top_performers: topPerformers,
      performance_distribution: performanceDistribution,
      activity_trends: teamActivityTrends,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json({ team_performance: teamPerformance });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Calculate trend based on daily performance data
 */
function calculateTrend(
  dailyTrends: Record<string, any>
): "improving" | "declining" | "stable" {
  const dates = Object.keys(dailyTrends).sort();
  if (dates.length < 2) return "stable";

  const firstHalf = dates.slice(0, Math.floor(dates.length / 2));
  const secondHalf = dates.slice(Math.floor(dates.length / 2));

  const firstHalfAvg =
    firstHalf.reduce(
      (sum, date) => sum + dailyTrends[date].efficiency_score,
      0
    ) / firstHalf.length;

  const secondHalfAvg =
    secondHalf.reduce(
      (sum, date) => sum + dailyTrends[date].efficiency_score,
      0
    ) / secondHalf.length;

  const difference = secondHalfAvg - firstHalfAvg;

  if (difference > 5) return "improving";
  if (difference < -5) return "declining";
  return "stable";
}

/**
 * Calculate team-wide aggregated metrics
 */
function calculateTeamMetrics(staffResults: any[]) {
  const validResults = staffResults.filter((staff) => !staff.error);

  if (validResults.length === 0) {
    return {
      average_efficiency_score: 0,
      total_orders_processed: 0,
      total_revenue_generated: 0,
      average_error_rate: 0,
      team_activity_volume: 0,
      high_performers_count: 0,
      low_performers_count: 0,
    };
  }

  const totalEfficiency = validResults.reduce(
    (sum, staff) => sum + staff.performance_summary.efficiency_score,
    0
  );
  const totalOrders = validResults.reduce(
    (sum, staff) => sum + staff.performance_summary.orders_processed,
    0
  );
  const totalRevenue = validResults.reduce(
    (sum, staff) => sum + staff.performance_summary.total_revenue_generated,
    0
  );
  const totalErrorRate = validResults.reduce(
    (sum, staff) => sum + staff.performance_summary.error_rate,
    0
  );
  const totalActivityVolume = validResults.reduce(
    (sum, staff) => sum + staff.performance_summary.activity_volume_score,
    0
  );

  const highPerformersCount = validResults.filter(
    (staff) => staff.performance_summary.efficiency_score >= 80
  ).length;
  const lowPerformersCount = validResults.filter(
    (staff) => staff.performance_summary.efficiency_score < 60
  ).length;

  return {
    average_efficiency_score:
      Math.round((totalEfficiency / validResults.length) * 100) / 100,
    total_orders_processed: totalOrders,
    total_revenue_generated: totalRevenue,
    average_error_rate:
      Math.round((totalErrorRate / validResults.length) * 100) / 100,
    team_activity_volume:
      Math.round((totalActivityVolume / validResults.length) * 100) / 100,
    high_performers_count: highPerformersCount,
    low_performers_count: lowPerformersCount,
  };
}

/**
 * Calculate performance distribution across the team
 */
function calculatePerformanceDistribution(staffResults: any[]) {
  const validResults = staffResults.filter((staff) => !staff.error);

  const distribution = {
    excellent: 0, // 90-100
    good: 0, // 80-89
    average: 0, // 70-79
    below_average: 0, // 60-69
    needs_improvement: 0, // 0-59
  };

  validResults.forEach((staff) => {
    const score = staff.performance_summary.efficiency_score;
    if (score >= 90) distribution.excellent++;
    else if (score >= 80) distribution.good++;
    else if (score >= 70) distribution.average++;
    else if (score >= 60) distribution.below_average++;
    else distribution.needs_improvement++;
  });

  return distribution;
}

/**
 * Get team activity trends over time
 */
async function getTeamActivityTrends(
  supabase: any,
  businessId: string,
  startDate: string,
  endDate: string
) {
  try {
    const { data: activityLogs, error } = await supabase
      .from("staff_activity_logs")
      .select("shift_date, activity_type, performance_metrics")
      .eq("business_id", businessId)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate);

    if (error) {
      console.error("Error fetching team activity trends:", error);
      return {};
    }

    // Group by date and calculate daily metrics
    const dailyTrends = activityLogs.reduce((acc: any, log: any) => {
      const date = log.shift_date;
      if (!acc[date]) {
        acc[date] = {
          total_activities: 0,
          average_response_time: 0,
          response_times: [],
        };
      }

      acc[date].total_activities++;
      const responseTime = log.performance_metrics?.response_time || 0;
      if (responseTime > 0) {
        acc[date].response_times.push(responseTime);
      }

      return acc;
    }, {});

    // Calculate averages
    Object.keys(dailyTrends).forEach((date) => {
      const dayData = dailyTrends[date];
      if (dayData.response_times.length > 0) {
        dayData.average_response_time =
          dayData.response_times.reduce(
            (sum: number, time: number) => sum + time,
            0
          ) / dayData.response_times.length;
      }
      delete dayData.response_times; // Remove raw data
    });

    return dailyTrends;
  } catch (error) {
    console.error("Error calculating team activity trends:", error);
    return {};
  }
}
