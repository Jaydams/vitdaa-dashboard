import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface StaffPerformanceMetrics {
  staff_id: string;
  staff_name: string;
  staff_role: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  metrics: {
    orders_processed: number;
    total_revenue_generated: number;
    average_order_value: number;
    customer_interactions: number;
    inventory_requests: number;
    activity_count: number;
    efficiency_score: number;
    performance_rating: "excellent" | "good" | "average" | "needs_improvement";
  };
  activity_breakdown: {
    [activity_type: string]: {
      count: number;
      average_duration?: number;
      success_rate: number;
    };
  };
  daily_performance: Array<{
    date: string;
    orders: number;
    revenue: number;
    activities: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const startDate =
      searchParams.get("start_date") ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate =
      searchParams.get("end_date") || new Date().toISOString().split("T")[0];
    const staffId = searchParams.get("staff_id");

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build base query for staff in the business
    let staffQuery = supabase
      .from("staff")
      .select("id, name, role")
      .eq("business_id", user.id);

    if (staffId) {
      staffQuery = staffQuery.eq("id", staffId);
    }

    const { data: staffMembers, error: staffError } = await staffQuery;

    if (staffError) {
      console.error("Error fetching staff:", staffError);
      return NextResponse.json(
        { error: "Failed to fetch staff data" },
        { status: 500 }
      );
    }

    const performanceData: StaffPerformanceMetrics[] = [];

    for (const staff of staffMembers) {
      // Get staff activity logs
      const { data: activityLogs, error: activityError } = await supabase
        .from("staff_activity_logs")
        .select("*")
        .eq("staff_id", staff.id)
        .gte("timestamp", startDate + "T00:00:00.000Z")
        .lte("timestamp", endDate + "T23:59:59.999Z");

      if (activityError) {
        console.error("Error fetching activity logs:", activityError);
        continue;
      }

      // Get orders processed by this staff member
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, created_at, status")
        .eq("business_id", user.id)
        .gte("created_at", startDate + "T00:00:00.000Z")
        .lte("created_at", endDate + "T23:59:59.999Z");

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        continue;
      }

      // Get inventory requests by this staff member
      const { data: inventoryRequests, error: inventoryError } = await supabase
        .from("inventory_requests")
        .select("id, status, created_at")
        .eq("requested_by_staff_id", staff.id)
        .gte("created_at", startDate + "T00:00:00.000Z")
        .lte("created_at", endDate + "T23:59:59.999Z");

      if (inventoryError) {
        console.error("Error fetching inventory requests:", inventoryError);
        continue;
      }

      // Calculate metrics
      const completedOrders = orders.filter(
        (o) => o.status === "completed" || o.status === "delivered"
      );
      const totalRevenue = completedOrders.reduce(
        (sum, order) => sum + order.total,
        0
      );
      const averageOrderValue =
        completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

      // Activity breakdown
      const activityBreakdown: {
        [key: string]: {
          count: number;
          average_duration?: number;
          success_rate: number;
        };
      } = {};

      activityLogs.forEach((log: any) => {
        const activityType = log.activity_type;
        if (!activityBreakdown[activityType]) {
          activityBreakdown[activityType] = {
            count: 0,
            success_rate: 0,
          };
        }
        activityBreakdown[activityType].count++;

        // Calculate success rate based on activity details
        const success = log.activity_details?.success !== false;
        activityBreakdown[activityType].success_rate =
          (activityBreakdown[activityType].success_rate *
            (activityBreakdown[activityType].count - 1) +
            (success ? 1 : 0)) /
          activityBreakdown[activityType].count;
      });

      // Daily performance breakdown
      const dailyPerformance: {
        [date: string]: { orders: number; revenue: number; activities: number };
      } = {};

      completedOrders.forEach((order) => {
        const date = order.created_at.split("T")[0];
        if (!dailyPerformance[date]) {
          dailyPerformance[date] = { orders: 0, revenue: 0, activities: 0 };
        }
        dailyPerformance[date].orders++;
        dailyPerformance[date].revenue += order.total;
      });

      activityLogs.forEach((log: any) => {
        const date = log.timestamp.split("T")[0];
        if (!dailyPerformance[date]) {
          dailyPerformance[date] = { orders: 0, revenue: 0, activities: 0 };
        }
        dailyPerformance[date].activities++;
      });

      // Calculate efficiency score (0-100)
      const baseScore = 50;
      const orderBonus = Math.min(completedOrders.length * 2, 30);
      const revenueBonus = Math.min((totalRevenue / 10000) * 10, 15);
      const activityBonus = Math.min(activityLogs.length * 0.5, 5);
      const efficiencyScore = Math.min(
        baseScore + orderBonus + revenueBonus + activityBonus,
        100
      );

      // Determine performance rating
      let performanceRating:
        | "excellent"
        | "good"
        | "average"
        | "needs_improvement";
      if (efficiencyScore >= 85) performanceRating = "excellent";
      else if (efficiencyScore >= 70) performanceRating = "good";
      else if (efficiencyScore >= 50) performanceRating = "average";
      else performanceRating = "needs_improvement";

      performanceData.push({
        staff_id: staff.id,
        staff_name: staff.name,
        staff_role: staff.role,
        date_range: {
          start_date: startDate,
          end_date: endDate,
        },
        metrics: {
          orders_processed: completedOrders.length,
          total_revenue_generated: totalRevenue,
          average_order_value: averageOrderValue,
          customer_interactions: completedOrders.length, // Approximation
          inventory_requests: inventoryRequests.length,
          activity_count: activityLogs.length,
          efficiency_score: Math.round(efficiencyScore),
          performance_rating: performanceRating,
        },
        activity_breakdown: activityBreakdown,
        daily_performance: Object.entries(dailyPerformance)
          .map(([date, data]) => ({
            date,
            orders: data.orders,
            revenue: data.revenue,
            activities: data.activities,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      });
    }

    return NextResponse.json({
      date_range: {
        start_date: startDate,
        end_date: endDate,
      },
      staff_count: staffMembers.length,
      performance_data: performanceData,
      summary: {
        total_orders: performanceData.reduce(
          (sum, staff) => sum + staff.metrics.orders_processed,
          0
        ),
        total_revenue: performanceData.reduce(
          (sum, staff) => sum + staff.metrics.total_revenue_generated,
          0
        ),
        average_efficiency:
          performanceData.length > 0
            ? Math.round(
                performanceData.reduce(
                  (sum, staff) => sum + staff.metrics.efficiency_score,
                  0
                ) / performanceData.length
              )
            : 0,
        top_performer:
          performanceData.length > 0
            ? performanceData.reduce((top, current) =>
                current.metrics.efficiency_score > top.metrics.efficiency_score
                  ? current
                  : top
              )
            : null,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in staff analytics API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
