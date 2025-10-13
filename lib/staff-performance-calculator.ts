import { createClient } from "@/lib/supabase/server";

export interface StaffPerformanceMetrics {
  staff_id: string;
  date_range: { start: string; end: string };
  metrics: {
    orders_processed: number;
    average_order_time: number;
    customer_interactions: number;
    inventory_requests: number;
    error_rate: number;
    efficiency_score: number;
    total_revenue_generated: number;
    success_rate: number;
    response_time_percentiles: {
      p50: number;
      p90: number;
      p95: number;
    };
    activity_volume_score: number;
    quality_score: number;
  };
  activity_breakdown: Record<string, ActivityMetrics>;
  daily_trends: Record<string, DailyMetrics>;
  performance_alerts: PerformanceAlert[];
  comparative_metrics: ComparativeMetrics;
}

export interface ActivityMetrics {
  count: number;
  average_duration: number;
  success_rate: number;
  total_duration: number;
  error_count: number;
  trend: "improving" | "declining" | "stable";
}

export interface DailyMetrics {
  date: string;
  total_activities: number;
  orders_processed: number;
  revenue_generated: number;
  average_response_time: number;
  error_count: number;
  efficiency_score: number;
}

export interface PerformanceAlert {
  type: "warning" | "critical" | "info";
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface ComparativeMetrics {
  vs_team_average: {
    efficiency_score_diff: number;
    orders_processed_diff: number;
    response_time_diff: number;
  };
  vs_previous_period: {
    efficiency_score_change: number;
    activity_volume_change: number;
    error_rate_change: number;
  };
  ranking: {
    efficiency_rank: number;
    activity_rank: number;
    quality_rank: number;
    total_staff_count: number;
  };
}

export class StaffPerformanceCalculator {
  private supabase: any;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    this.supabase = await createClient();
  }

  /**
   * Calculate comprehensive performance metrics for a staff member
   */
  async calculatePerformanceMetrics(
    staffId: string,
    businessId: string,
    startDate: string,
    endDate: string
  ): Promise<StaffPerformanceMetrics> {
    if (!this.supabase) {
      await this.initializeSupabase();
    }

    // Fetch all required data
    const [activityLogs, orders, staff, teamMetrics] = await Promise.all([
      this.getActivityLogs(staffId, businessId, startDate, endDate),
      this.getOrdersData(staffId, businessId, startDate, endDate),
      this.getStaffInfo(staffId),
      this.getTeamMetrics(businessId, startDate, endDate),
    ]);

    // Calculate core metrics
    const coreMetrics = this.calculateCoreMetrics(activityLogs, orders);

    // Calculate activity breakdown
    const activityBreakdown = this.calculateActivityBreakdown(activityLogs);

    // Calculate daily trends
    const dailyTrends = this.calculateDailyTrends(activityLogs, orders);

    // Generate performance alerts
    const performanceAlerts = this.generatePerformanceAlerts(
      coreMetrics,
      activityBreakdown
    );

    // Calculate comparative metrics
    const comparativeMetrics = await this.calculateComparativeMetrics(
      staffId,
      businessId,
      coreMetrics,
      teamMetrics,
      startDate,
      endDate
    );

    return {
      staff_id: staffId,
      date_range: { start: startDate, end: endDate },
      metrics: coreMetrics,
      activity_breakdown: activityBreakdown,
      daily_trends: dailyTrends,
      performance_alerts: performanceAlerts,
      comparative_metrics: comparativeMetrics,
    };
  }

  /**
   * Get activity logs for the specified period
   */
  private async getActivityLogs(
    staffId: string,
    businessId: string,
    startDate: string,
    endDate: string
  ) {
    const { data, error } = await this.supabase
      .from("staff_activity_logs")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching activity logs:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get orders data for the specified period
   */
  private async getOrdersData(
    staffId: string,
    businessId: string,
    startDate: string,
    endDate: string
  ) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(
        "id, total_amount, status, created_at, assigned_to_staff_id, status_updated_by"
      )
      .eq("business_id", businessId)
      .or(`assigned_to_staff_id.eq.${staffId},status_updated_by.eq.${staffId}`)
      .gte("created_at", `${startDate}T00:00:00Z`)
      .lte("created_at", `${endDate}T23:59:59Z`);

    if (error) {
      console.error("Error fetching orders:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get staff information
   */
  private async getStaffInfo(staffId: string) {
    const { data, error } = await this.supabase
      .from("staff")
      .select("id, first_name, last_name, role, created_at")
      .eq("id", staffId)
      .single();

    if (error) {
      console.error("Error fetching staff info:", error);
      return null;
    }

    return data;
  }

  /**
   * Get team-wide metrics for comparison
   */
  private async getTeamMetrics(
    businessId: string,
    startDate: string,
    endDate: string
  ) {
    const { data, error } = await this.supabase
      .from("staff_activity_logs")
      .select("staff_id, activity_type, performance_metrics, activity_details")
      .eq("business_id", businessId)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate);

    if (error) {
      console.error("Error fetching team metrics:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate core performance metrics
   */
  private calculateCoreMetrics(activityLogs: any[], orders: any[]) {
    const totalActivities = activityLogs.length;
    const ordersProcessed = orders.length;

    // Calculate response times
    const responseTimes = activityLogs
      .map((log) => log.performance_metrics?.response_time || 0)
      .filter((time) => time > 0)
      .sort((a, b) => a - b);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    // Calculate percentiles
    const responseTimePercentiles = {
      p50: this.calculatePercentile(responseTimes, 50),
      p90: this.calculatePercentile(responseTimes, 90),
      p95: this.calculatePercentile(responseTimes, 95),
    };

    // Calculate success rate
    const successfulActivities = activityLogs.filter(
      (log) => log.activity_details?.success !== false
    ).length;
    const successRate =
      totalActivities > 0 ? (successfulActivities / totalActivities) * 100 : 0;

    // Calculate error rate
    const errorActivities = activityLogs.filter(
      (log) =>
        log.activity_type === "error_occurred" ||
        log.activity_details?.error_message
    ).length;
    const errorRate =
      totalActivities > 0 ? (errorActivities / totalActivities) * 100 : 0;

    // Calculate revenue generated
    const totalRevenueGenerated = orders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );

    // Calculate average order time (for orders processed)
    const orderTimes = activityLogs
      .filter((log) => log.activity_type === "order_created")
      .map((log) => log.performance_metrics?.response_time || 0)
      .filter((time) => time > 0);

    const averageOrderTime =
      orderTimes.length > 0
        ? orderTimes.reduce((sum, time) => sum + time, 0) / orderTimes.length
        : 0;

    // Calculate activity volume score (normalized)
    const activityVolumeScore = Math.min(100, (totalActivities / 50) * 100); // 50 activities = 100% score

    // Calculate quality score (based on success rate and low error rate)
    const qualityScore = successRate * 0.7 + (100 - errorRate) * 0.3;

    // Calculate overall efficiency score
    const efficiencyScore = this.calculateEfficiencyScore({
      successRate,
      errorRate,
      averageResponseTime,
      activityVolumeScore,
      qualityScore,
    });

    return {
      orders_processed: ordersProcessed,
      average_order_time: Math.round(averageOrderTime),
      customer_interactions: activityLogs.filter((log) =>
        ["order_created", "payment_processed", "customer_served"].includes(
          log.activity_type
        )
      ).length,
      inventory_requests: activityLogs.filter(
        (log) => log.activity_type === "inventory_requested"
      ).length,
      error_rate: Math.round(errorRate * 100) / 100,
      efficiency_score: Math.round(efficiencyScore * 100) / 100,
      total_revenue_generated: totalRevenueGenerated,
      success_rate: Math.round(successRate * 100) / 100,
      response_time_percentiles: {
        p50: Math.round(responseTimePercentiles.p50),
        p90: Math.round(responseTimePercentiles.p90),
        p95: Math.round(responseTimePercentiles.p95),
      },
      activity_volume_score: Math.round(activityVolumeScore * 100) / 100,
      quality_score: Math.round(qualityScore * 100) / 100,
    };
  }

  /**
   * Calculate activity breakdown with trends
   */
  private calculateActivityBreakdown(
    activityLogs: any[]
  ): Record<string, ActivityMetrics> {
    const breakdown: Record<string, ActivityMetrics> = {};

    activityLogs.forEach((log) => {
      const type = log.activity_type;
      if (!breakdown[type]) {
        breakdown[type] = {
          count: 0,
          average_duration: 0,
          success_rate: 0,
          total_duration: 0,
          error_count: 0,
          trend: "stable",
        };
      }

      breakdown[type].count++;
      const duration = log.performance_metrics?.response_time || 0;
      breakdown[type].total_duration += duration;
      breakdown[type].average_duration =
        breakdown[type].total_duration / breakdown[type].count;

      if (
        log.activity_details?.success === false ||
        log.activity_details?.error_message
      ) {
        breakdown[type].error_count++;
      }

      breakdown[type].success_rate =
        ((breakdown[type].count - breakdown[type].error_count) /
          breakdown[type].count) *
        100;
    });

    // Calculate trends (simplified - would need historical data for accurate trends)
    Object.keys(breakdown).forEach((type) => {
      const metrics = breakdown[type];
      if (metrics.success_rate > 90) {
        metrics.trend = "improving";
      } else if (metrics.success_rate < 70) {
        metrics.trend = "declining";
      } else {
        metrics.trend = "stable";
      }
    });

    return breakdown;
  }

  /**
   * Calculate daily trends
   */
  private calculateDailyTrends(
    activityLogs: any[],
    orders: any[]
  ): Record<string, DailyMetrics> {
    const dailyTrends: Record<string, DailyMetrics> = {};

    // Group activities by date
    activityLogs.forEach((log) => {
      const date = log.shift_date;
      if (!dailyTrends[date]) {
        dailyTrends[date] = {
          date,
          total_activities: 0,
          orders_processed: 0,
          revenue_generated: 0,
          average_response_time: 0,
          error_count: 0,
          efficiency_score: 0,
        };
      }

      dailyTrends[date].total_activities++;

      if (
        log.activity_details?.error_message ||
        log.activity_type === "error_occurred"
      ) {
        dailyTrends[date].error_count++;
      }
    });

    // Group orders by date
    orders.forEach((order) => {
      const date = order.created_at.split("T")[0];
      if (dailyTrends[date]) {
        dailyTrends[date].orders_processed++;
        dailyTrends[date].revenue_generated += order.total_amount || 0;
      }
    });

    // Calculate daily averages and efficiency scores
    Object.keys(dailyTrends).forEach((date) => {
      const dayData = dailyTrends[date];
      const dayLogs = activityLogs.filter((log) => log.shift_date === date);

      const responseTimes = dayLogs
        .map((log) => log.performance_metrics?.response_time || 0)
        .filter((time) => time > 0);

      dayData.average_response_time =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length
          : 0;

      const errorRate =
        dayData.total_activities > 0
          ? (dayData.error_count / dayData.total_activities) * 100
          : 0;

      dayData.efficiency_score = this.calculateEfficiencyScore({
        successRate: 100 - errorRate,
        errorRate,
        averageResponseTime: dayData.average_response_time,
        activityVolumeScore: Math.min(
          100,
          (dayData.total_activities / 10) * 100
        ),
        qualityScore: 100 - errorRate,
      });
    });

    return dailyTrends;
  }

  /**
   * Generate performance alerts based on metrics
   */
  private generatePerformanceAlerts(
    metrics: any,
    activityBreakdown: Record<string, ActivityMetrics>
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Error rate alerts
    if (metrics.error_rate > 10) {
      alerts.push({
        type: "critical",
        message: "High error rate detected",
        metric: "error_rate",
        value: metrics.error_rate,
        threshold: 10,
      });
    } else if (metrics.error_rate > 5) {
      alerts.push({
        type: "warning",
        message: "Elevated error rate",
        metric: "error_rate",
        value: metrics.error_rate,
        threshold: 5,
      });
    }

    // Response time alerts
    if (metrics.response_time_percentiles.p95 > 5000) {
      alerts.push({
        type: "warning",
        message: "Slow response times detected",
        metric: "response_time_p95",
        value: metrics.response_time_percentiles.p95,
        threshold: 5000,
      });
    }

    // Efficiency score alerts
    if (metrics.efficiency_score < 60) {
      alerts.push({
        type: "critical",
        message: "Low efficiency score",
        metric: "efficiency_score",
        value: metrics.efficiency_score,
        threshold: 60,
      });
    } else if (metrics.efficiency_score < 75) {
      alerts.push({
        type: "warning",
        message: "Below average efficiency",
        metric: "efficiency_score",
        value: metrics.efficiency_score,
        threshold: 75,
      });
    }

    // Activity volume alerts
    if (metrics.activity_volume_score < 30) {
      alerts.push({
        type: "info",
        message: "Low activity volume",
        metric: "activity_volume_score",
        value: metrics.activity_volume_score,
        threshold: 30,
      });
    }

    return alerts;
  }

  /**
   * Calculate comparative metrics against team and previous period
   */
  private async calculateComparativeMetrics(
    staffId: string,
    businessId: string,
    metrics: any,
    teamMetrics: any[],
    startDate: string,
    endDate: string
  ): Promise<ComparativeMetrics> {
    // Calculate team averages
    const teamStaffIds = [...new Set(teamMetrics.map((m) => m.staff_id))];
    const teamAverages = this.calculateTeamAverages(teamMetrics, teamStaffIds);

    // Get previous period metrics for comparison
    const previousPeriodStart = this.getPreviousPeriodDate(startDate);
    const previousPeriodEnd = this.getPreviousPeriodDate(endDate);

    const previousMetrics = await this.calculatePerformanceMetrics(
      staffId,
      businessId,
      previousPeriodStart,
      previousPeriodEnd
    );

    return {
      vs_team_average: {
        efficiency_score_diff:
          metrics.efficiency_score - teamAverages.efficiency_score,
        orders_processed_diff:
          metrics.orders_processed - teamAverages.orders_processed,
        response_time_diff:
          metrics.response_time_percentiles.p50 - teamAverages.response_time,
      },
      vs_previous_period: {
        efficiency_score_change:
          metrics.efficiency_score - previousMetrics.metrics.efficiency_score,
        activity_volume_change:
          metrics.activity_volume_score -
          previousMetrics.metrics.activity_volume_score,
        error_rate_change:
          metrics.error_rate - previousMetrics.metrics.error_rate,
      },
      ranking: {
        efficiency_rank: this.calculateRanking(
          metrics.efficiency_score,
          teamMetrics,
          "efficiency"
        ),
        activity_rank: this.calculateRanking(
          metrics.activity_volume_score,
          teamMetrics,
          "activity"
        ),
        quality_rank: this.calculateRanking(
          metrics.quality_score,
          teamMetrics,
          "quality"
        ),
        total_staff_count: teamStaffIds.length,
      },
    };
  }

  /**
   * Calculate efficiency score based on multiple factors
   */
  private calculateEfficiencyScore(factors: {
    successRate: number;
    errorRate: number;
    averageResponseTime: number;
    activityVolumeScore: number;
    qualityScore: number;
  }): number {
    const {
      successRate,
      errorRate,
      averageResponseTime,
      activityVolumeScore,
      qualityScore,
    } = factors;

    // Weighted scoring system
    const successWeight = 0.3;
    const speedWeight = 0.25;
    const volumeWeight = 0.2;
    const qualityWeight = 0.25;

    // Speed score (inverse of response time, normalized)
    const speedScore = Math.max(0, 100 - averageResponseTime / 100);

    const efficiencyScore =
      successRate * successWeight +
      speedScore * speedWeight +
      activityVolumeScore * volumeWeight +
      qualityScore * qualityWeight;

    return Math.max(0, Math.min(100, efficiencyScore));
  }

  /**
   * Calculate percentile value from sorted array
   */
  private calculatePercentile(
    sortedArray: number[],
    percentile: number
  ): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower];
    }

    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Calculate team averages for comparison
   */
  private calculateTeamAverages(teamMetrics: any[], staffIds: string[]) {
    // This is a simplified calculation - in a real implementation,
    // you would calculate actual team averages from the data
    return {
      efficiency_score: 75,
      orders_processed: 25,
      response_time: 2000,
    };
  }

  /**
   * Get previous period date for comparison
   */
  private getPreviousPeriodDate(date: string): string {
    const currentDate = new Date(date);
    const daysDiff = 30; // Compare with 30 days ago
    const previousDate = new Date(
      currentDate.getTime() - daysDiff * 24 * 60 * 60 * 1000
    );
    return previousDate.toISOString().split("T")[0];
  }

  /**
   * Calculate ranking within team
   */
  private calculateRanking(
    score: number,
    teamMetrics: any[],
    metric: string
  ): number {
    // Simplified ranking calculation
    // In a real implementation, you would calculate actual rankings
    return Math.floor(Math.random() * 5) + 1; // Random rank between 1-5 for demo
  }
}

// Export singleton instance
export const staffPerformanceCalculator = new StaffPerformanceCalculator();
