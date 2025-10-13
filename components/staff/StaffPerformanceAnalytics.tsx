"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  TrendingUp,
  Award,
  Activity,
  DollarSign,
  BarChart3,
  Calendar,
  RefreshCw,
  Star,
  Target,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EnhancedDatePicker } from "@/components/ui/enhanced-date-picker";
import { createClient } from "@/lib/supabase/client";
import { formatAmount } from "@/helpers/formatAmount";

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

interface AnalyticsData {
  date_range: {
    start_date: string;
    end_date: string;
  };
  staff_count: number;
  performance_data: StaffPerformanceMetrics[];
  summary: {
    total_orders: number;
    total_revenue: number;
    average_efficiency: number;
    top_performer: StaffPerformanceMetrics | null;
  };
  generated_at: string;
}

interface StaffPerformanceAnalyticsProps {
  businessId: string;
}

export function StaffPerformanceAnalytics({
  businessId,
}: StaffPerformanceAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [expandedStaff, setExpandedStaff] = useState<string[]>([]);

  const supabase = createClient();

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("business_id", businessId);

      if (startDate) {
        params.append("start_date", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        params.append("end_date", endDate.toISOString().split("T")[0]);
      }

      // Fetch team performance data
      const response = await fetch(
        `/api/staff/performance/team?${params.toString()}`
      );
      const data = await response.json();

      if (response.ok && data.team_performance) {
        // Transform the data to match the expected format
        const transformedData: AnalyticsData = {
          date_range: data.team_performance.date_range,
          staff_count: data.team_performance.staff_count,
          performance_data: data.team_performance.staff_performance.map(
            (staff: any) => ({
              staff_id: staff.staff_info.id,
              staff_name: `${staff.staff_info.first_name} ${staff.staff_info.last_name}`,
              staff_role: staff.staff_info.role,
              date_range: data.team_performance.date_range,
              metrics: {
                orders_processed: staff.performance_summary.orders_processed,
                total_revenue_generated:
                  staff.performance_summary.total_revenue_generated,
                average_order_value:
                  staff.performance_summary.orders_processed > 0
                    ? staff.performance_summary.total_revenue_generated /
                      staff.performance_summary.orders_processed
                    : 0,
                customer_interactions:
                  staff.performance_summary.customer_interactions || 0,
                inventory_requests:
                  staff.performance_summary.inventory_requests || 0,
                activity_count: staff.performance_summary.total_activities || 0,
                efficiency_score: staff.performance_summary.efficiency_score,
                performance_rating: getPerformanceRating(
                  staff.performance_summary.efficiency_score
                ),
              },
              activity_breakdown: staff.activity_breakdown || {},
              daily_performance: Object.entries(staff.daily_trends || {}).map(
                ([date, trend]: [string, any]) => ({
                  date,
                  orders: trend.orders_processed || 0,
                  revenue: trend.revenue_generated || 0,
                  activities: trend.total_activities || 0,
                })
              ),
            })
          ),
          summary: {
            total_orders:
              data.team_performance.team_metrics.total_orders_processed,
            total_revenue:
              data.team_performance.team_metrics.total_revenue_generated,
            average_efficiency:
              data.team_performance.team_metrics.average_efficiency_score,
            top_performer: data.team_performance.top_performers[0]
              ? {
                  staff_id:
                    data.team_performance.top_performers[0].staff_info.id,
                  staff_name: `${data.team_performance.top_performers[0].staff_info.first_name} ${data.team_performance.top_performers[0].staff_info.last_name}`,
                  staff_role:
                    data.team_performance.top_performers[0].staff_info.role,
                  date_range: data.team_performance.date_range,
                  metrics: {
                    orders_processed:
                      data.team_performance.top_performers[0].orders_processed,
                    total_revenue_generated:
                      data.team_performance.top_performers[0].revenue_generated,
                    average_order_value:
                      data.team_performance.top_performers[0].orders_processed >
                      0
                        ? data.team_performance.top_performers[0]
                            .revenue_generated /
                          data.team_performance.top_performers[0]
                            .orders_processed
                        : 0,
                    customer_interactions: 0,
                    inventory_requests: 0,
                    activity_count: 0,
                    efficiency_score:
                      data.team_performance.top_performers[0].efficiency_score,
                    performance_rating: getPerformanceRating(
                      data.team_performance.top_performers[0].efficiency_score
                    ),
                  },
                  activity_breakdown: {},
                  daily_performance: [],
                }
              : null,
          },
          generated_at: data.team_performance.generated_at,
        };

        setAnalyticsData(transformedData);
      } else {
        toast.error(data.error || "Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  }, [businessId, startDate, endDate]);

  // Helper function to get performance rating based on efficiency score
  const getPerformanceRating = (
    score: number
  ): "excellent" | "good" | "average" | "needs_improvement" => {
    if (score >= 90) return "excellent";
    if (score >= 80) return "good";
    if (score >= 70) return "average";
    return "needs_improvement";
  };

  // Get performance rating color
  const getPerformanceRatingColor = (rating: string) => {
    switch (rating) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "needs_improvement":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get performance rating icon
  const getPerformanceRatingIcon = (rating: string) => {
    switch (rating) {
      case "excellent":
        return <Star className="h-4 w-4" />;
      case "good":
        return <Award className="h-4 w-4" />;
      case "average":
        return <Target className="h-4 w-4" />;
      case "needs_improvement":
        return <Clock className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Toggle staff expansion
  const toggleStaffExpansion = (staffId: string) => {
    setExpandedStaff((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff Performance Analytics</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <EnhancedDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <EnhancedDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Select end date"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Staff Member</label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Staff</SelectItem>
                  {analyticsData?.performance_data.map((staff) => (
                    <SelectItem key={staff.staff_id} value={staff.staff_id}>
                      {staff.staff_name} ({staff.staff_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-4" />
          <span>Loading analytics data...</span>
        </div>
      ) : !analyticsData ? (
        <div className="text-center py-12 text-muted-foreground">
          No analytics data available
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Staff
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.staff_count}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active staff members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Orders
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.summary.total_orders}
                </div>
                <p className="text-xs text-muted-foreground">
                  Orders processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAmount(analyticsData.summary.total_revenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Revenue generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Efficiency
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.summary.average_efficiency}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Team efficiency score
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performer */}
          {analyticsData.summary.top_performer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50">
                  <div>
                    <div className="font-semibold text-lg">
                      {analyticsData.summary.top_performer.staff_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {analyticsData.summary.top_performer.staff_role}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span>
                        Orders:{" "}
                        {
                          analyticsData.summary.top_performer.metrics
                            .orders_processed
                        }
                      </span>
                      <span>
                        Revenue:{" "}
                        {formatAmount(
                          analyticsData.summary.top_performer.metrics
                            .total_revenue_generated
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-600">
                      {
                        analyticsData.summary.top_performer.metrics
                          .efficiency_score
                      }
                      %
                    </div>
                    <Badge
                      className={getPerformanceRatingColor(
                        analyticsData.summary.top_performer.metrics
                          .performance_rating
                      )}
                    >
                      {getPerformanceRatingIcon(
                        analyticsData.summary.top_performer.metrics
                          .performance_rating
                      )}
                      <span className="ml-1 capitalize">
                        {analyticsData.summary.top_performer.metrics.performance_rating.replace(
                          "_",
                          " "
                        )}
                      </span>
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual Staff Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.performance_data.map((staff) => (
                  <div key={staff.staff_id} className="border rounded-lg">
                    <button
                      onClick={() => toggleStaffExpansion(staff.staff_id)}
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-medium">
                              {staff.staff_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {staff.staff_role}
                            </div>
                          </div>
                          <Badge
                            className={getPerformanceRatingColor(
                              staff.metrics.performance_rating
                            )}
                          >
                            {getPerformanceRatingIcon(
                              staff.metrics.performance_rating
                            )}
                            <span className="ml-1 capitalize">
                              {staff.metrics.performance_rating.replace(
                                "_",
                                " "
                              )}
                            </span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">
                              {staff.metrics.efficiency_score}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {staff.metrics.orders_processed} orders
                            </div>
                          </div>
                          {expandedStaff.includes(staff.staff_id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedStaff.includes(staff.staff_id) && (
                      <div className="p-4 border-t bg-muted/20">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Key Metrics */}
                          <div>
                            <h4 className="font-medium mb-3">Key Metrics</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Orders Processed:</span>
                                <span className="font-medium">
                                  {staff.metrics.orders_processed}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Revenue Generated:</span>
                                <span className="font-medium">
                                  {formatAmount(
                                    staff.metrics.total_revenue_generated
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg Order Value:</span>
                                <span className="font-medium">
                                  {formatAmount(
                                    staff.metrics.average_order_value
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Inventory Requests:</span>
                                <span className="font-medium">
                                  {staff.metrics.inventory_requests}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Activities:</span>
                                <span className="font-medium">
                                  {staff.metrics.activity_count}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Efficiency Score */}
                          <div>
                            <h4 className="font-medium mb-3">
                              Efficiency Score
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Current Score</span>
                                <span className="font-medium">
                                  {staff.metrics.efficiency_score}%
                                </span>
                              </div>
                              <Progress
                                value={staff.metrics.efficiency_score}
                                className="h-2"
                              />
                              <div className="text-xs text-muted-foreground">
                                Based on orders, revenue, and activity levels
                              </div>
                            </div>
                          </div>

                          {/* Activity Breakdown */}
                          <div>
                            <h4 className="font-medium mb-3">
                              Activity Breakdown
                            </h4>
                            <div className="space-y-2 text-sm">
                              {Object.entries(staff.activity_breakdown).map(
                                ([activity, data]) => (
                                  <div
                                    key={activity}
                                    className="flex justify-between"
                                  >
                                    <span className="capitalize">
                                      {activity.replace("_", " ")}:
                                    </span>
                                    <span className="font-medium">
                                      {data.count} (
                                      {Math.round(data.success_rate * 100)}%
                                      success)
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Daily Performance Chart */}
                        {staff.daily_performance.length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-medium mb-3">
                              Daily Performance
                            </h4>
                            <div className="grid grid-cols-7 gap-2 text-xs">
                              {staff.daily_performance.map((day) => (
                                <div
                                  key={day.date}
                                  className="p-2 border rounded text-center"
                                >
                                  <div className="font-medium">
                                    {new Date(day.date).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                      }
                                    )}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {day.orders} orders
                                  </div>
                                  <div className="text-muted-foreground">
                                    {formatAmount(day.revenue)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
