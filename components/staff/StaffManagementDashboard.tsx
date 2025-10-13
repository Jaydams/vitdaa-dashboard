"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  TrendingUp,
  Award,
  Activity,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Star,
  Target,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  Download,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { formatAmount } from "@/helpers/formatAmount";

interface StaffPerformanceData {
  staff_id: string;
  staff_info: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    email: string;
    created_at: string;
  };
  performance_summary: {
    efficiency_score: number;
    orders_processed: number;
    error_rate: number;
    activity_volume_score: number;
    total_revenue_generated: number;
    success_rate: number;
    response_time_percentiles: {
      p50: number;
      p90: number;
      p95: number;
    };
  };
  alerts_count: number;
  trend: "improving" | "declining" | "stable";
  performance_alerts: Array<{
    type: "warning" | "critical" | "info";
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }>;
  activity_breakdown: Record<
    string,
    {
      count: number;
      average_duration: number;
      success_rate: number;
      trend: "improving" | "declining" | "stable";
    }
  >;
  daily_trends: Record<
    string,
    {
      date: string;
      total_activities: number;
      orders_processed: number;
      revenue_generated: number;
      average_response_time: number;
      error_count: number;
      efficiency_score: number;
    }
  >;
}

interface TeamPerformanceData {
  business_id: string;
  date_range: { start: string; end: string };
  staff_count: number;
  team_metrics: {
    average_efficiency_score: number;
    total_orders_processed: number;
    total_revenue_generated: number;
    average_error_rate: number;
    team_activity_volume: number;
    high_performers_count: number;
    low_performers_count: number;
  };
  staff_performance: StaffPerformanceData[];
  top_performers: Array<{
    staff_info: any;
    efficiency_score: number;
    orders_processed: number;
    revenue_generated: number;
  }>;
  performance_distribution: {
    excellent: number;
    good: number;
    average: number;
    below_average: number;
    needs_improvement: number;
  };
}

interface StaffManagementDashboardProps {
  businessId: string;
}

export function StaffManagementDashboard({
  businessId,
}: StaffManagementDashboardProps) {
  const [teamData, setTeamData] = useState<TeamPerformanceData | null>(null);
  const [selectedStaff, setSelectedStaff] =
    useState<StaffPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [performanceFilter, setPerformanceFilter] = useState<string>("");
  const [expandedStaff, setExpandedStaff] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const supabase = createClient();

  // Fetch team performance data
  const fetchTeamData = useCallback(async () => {
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
      if (roleFilter) {
        params.append("role", roleFilter);
      }

      const response = await fetch(
        `/api/staff/performance/team?${params.toString()}`
      );
      const data = await response.json();

      if (response.ok && data.team_performance) {
        setTeamData(data.team_performance);
      } else {
        toast.error(data.error || "Failed to fetch team performance data");
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to fetch team performance data");
    } finally {
      setLoading(false);
    }
  }, [businessId, startDate, endDate, roleFilter]);

  // Fetch individual staff performance
  const fetchStaffPerformance = async (staffId: string) => {
    try {
      const params = new URLSearchParams();
      params.append("business_id", businessId);

      if (startDate) {
        params.append("start_date", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        params.append("end_date", endDate.toISOString().split("T")[0]);
      }
      params.append("include_comparative", "true");
      params.append("include_alerts", "true");

      const response = await fetch(
        `/api/staff/performance/${staffId}?${params.toString()}`
      );
      const data = await response.json();

      if (response.ok && data.performance_metrics) {
        setSelectedStaff({
          staff_id: staffId,
          staff_info: data.performance_metrics.staff_info,
          performance_summary: data.performance_metrics.metrics,
          alerts_count:
            data.performance_metrics.performance_alerts?.length || 0,
          trend: "stable", // Would be calculated from comparative metrics
          performance_alerts: data.performance_metrics.performance_alerts || [],
          activity_breakdown: data.performance_metrics.activity_breakdown || {},
          daily_trends: data.performance_metrics.daily_trends || {},
        });
      } else {
        toast.error(data.error || "Failed to fetch staff performance");
      }
    } catch (error) {
      console.error("Error fetching staff performance:", error);
      toast.error("Failed to fetch staff performance");
    }
  };

  // Get performance level and color
  const getPerformanceLevel = (score: number) => {
    if (score >= 90)
      return { level: "Excellent", color: "bg-green-100 text-green-800" };
    if (score >= 80)
      return { level: "Good", color: "bg-blue-100 text-blue-800" };
    if (score >= 70)
      return { level: "Average", color: "bg-yellow-100 text-yellow-800" };
    if (score >= 60)
      return { level: "Below Average", color: "bg-orange-100 text-orange-800" };
    return { level: "Needs Improvement", color: "bg-red-100 text-red-800" };
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get alert icon
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "info":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  // Filter staff based on performance level
  const getFilteredStaff = () => {
    if (!teamData) return [];

    let filtered = teamData.staff_performance;

    if (performanceFilter) {
      filtered = filtered.filter((staff) => {
        const level = getPerformanceLevel(
          staff.performance_summary.efficiency_score
        ).level;
        return level.toLowerCase().replace(" ", "_") === performanceFilter;
      });
    }

    return filtered;
  };

  // Export performance data
  const exportPerformanceData = () => {
    if (!teamData) return;

    const csvData = teamData.staff_performance.map((staff) => ({
      Name: `${staff.staff_info.first_name} ${staff.staff_info.last_name}`,
      Role: staff.staff_info.role,
      "Efficiency Score": staff.performance_summary.efficiency_score,
      "Orders Processed": staff.performance_summary.orders_processed,
      "Revenue Generated": staff.performance_summary.total_revenue_generated,
      "Error Rate": staff.performance_summary.error_rate,
      "Success Rate": staff.performance_summary.success_rate,
      "Alerts Count": staff.alerts_count,
      Trend: staff.trend,
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-performance-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff Performance Management</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportPerformanceData}
                disabled={!teamData}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTeamData}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <label className="text-sm font-medium">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Roles</SelectItem>
                  <SelectItem value="reception">Reception</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Performance</label>
              <Select
                value={performanceFilter}
                onValueChange={setPerformanceFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Levels</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="below_average">Below Average</SelectItem>
                  <SelectItem value="needs_improvement">
                    Needs Improvement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-4" />
          <span>Loading performance data...</span>
        </div>
      ) : !teamData ? (
        <div className="text-center py-12 text-muted-foreground">
          No performance data available
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Team Metrics */}
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
                    {teamData.staff_count}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {teamData.team_metrics.high_performers_count} high
                    performers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Efficiency
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamData.team_metrics.average_efficiency_score}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Team efficiency score
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Orders
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamData.team_metrics.total_orders_processed}
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
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAmount(
                      teamData.team_metrics.total_revenue_generated
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Revenue generated
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(teamData.performance_distribution).map(
                    ([level, count]) => (
                      <div key={level} className="text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {level.replace("_", " ")}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamData.top_performers
                    .slice(0, 3)
                    .map((performer, index) => (
                      <div
                        key={performer.staff_info.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold">
                              {performer.staff_info.first_name}{" "}
                              {performer.staff_info.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {performer.staff_info.role}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {performer.efficiency_score}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {performer.orders_processed} orders
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Individual Staff Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Staff Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getFilteredStaff().map((staff) => {
                    const performanceLevel = getPerformanceLevel(
                      staff.performance_summary.efficiency_score
                    );

                    return (
                      <div key={staff.staff_id} className="border rounded-lg">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="font-medium">
                                {staff.staff_info.first_name}{" "}
                                {staff.staff_info.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {staff.staff_info.role}
                              </div>
                            </div>
                            <Badge className={performanceLevel.color}>
                              {performanceLevel.level}
                            </Badge>
                            {staff.alerts_count > 0 && (
                              <Badge variant="destructive">
                                <Bell className="h-3 w-3 mr-1" />
                                {staff.alerts_count}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-semibold">
                                {staff.performance_summary.efficiency_score}%
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {staff.performance_summary.orders_processed}{" "}
                                orders
                              </div>
                            </div>
                            {getTrendIcon(staff.trend)}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    fetchStaffPerformance(staff.staff_id)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Performance Details -{" "}
                                    {staff.staff_info.first_name}{" "}
                                    {staff.staff_info.last_name}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Detailed performance metrics and activity
                                    breakdown
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedStaff &&
                                  selectedStaff.staff_id === staff.staff_id && (
                                    <div className="space-y-6">
                                      {/* Performance Metrics */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-4 border rounded">
                                          <div className="text-2xl font-bold">
                                            {
                                              selectedStaff.performance_summary
                                                .efficiency_score
                                            }
                                            %
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            Efficiency Score
                                          </div>
                                        </div>
                                        <div className="text-center p-4 border rounded">
                                          <div className="text-2xl font-bold">
                                            {
                                              selectedStaff.performance_summary
                                                .success_rate
                                            }
                                            %
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            Success Rate
                                          </div>
                                        </div>
                                        <div className="text-center p-4 border rounded">
                                          <div className="text-2xl font-bold">
                                            {
                                              selectedStaff.performance_summary
                                                .error_rate
                                            }
                                            %
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            Error Rate
                                          </div>
                                        </div>
                                        <div className="text-center p-4 border rounded">
                                          <div className="text-2xl font-bold">
                                            {
                                              selectedStaff.performance_summary
                                                .response_time_percentiles.p50
                                            }
                                            ms
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            Avg Response Time
                                          </div>
                                        </div>
                                      </div>

                                      {/* Performance Alerts */}
                                      {selectedStaff.performance_alerts.length >
                                        0 && (
                                        <div>
                                          <h4 className="font-medium mb-3">
                                            Performance Alerts
                                          </h4>
                                          <div className="space-y-2">
                                            {selectedStaff.performance_alerts.map(
                                              (alert, index) => (
                                                <Alert
                                                  key={index}
                                                  className={
                                                    alert.type === "critical"
                                                      ? "border-red-200 bg-red-50"
                                                      : alert.type === "warning"
                                                      ? "border-yellow-200 bg-yellow-50"
                                                      : "border-blue-200 bg-blue-50"
                                                  }
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {getAlertIcon(alert.type)}
                                                    <AlertDescription>
                                                      <strong>
                                                        {alert.message}
                                                      </strong>{" "}
                                                      - {alert.metric}:{" "}
                                                      {alert.value}
                                                      (threshold:{" "}
                                                      {alert.threshold})
                                                    </AlertDescription>
                                                  </div>
                                                </Alert>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Activity Breakdown */}
                                      <div>
                                        <h4 className="font-medium mb-3">
                                          Activity Breakdown
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {Object.entries(
                                            selectedStaff.activity_breakdown
                                          ).map(([activity, data]) => (
                                            <div
                                              key={activity}
                                              className="p-4 border rounded"
                                            >
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium capitalize">
                                                  {activity.replace("_", " ")}
                                                </span>
                                                {getTrendIcon(data.trend)}
                                              </div>
                                              <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                  <span>Count:</span>
                                                  <span>{data.count}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>Success Rate:</span>
                                                  <span>
                                                    {data.success_rate.toFixed(
                                                      1
                                                    )}
                                                    %
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>Avg Duration:</span>
                                                  <span>
                                                    {data.average_duration.toFixed(
                                                      0
                                                    )}
                                                    ms
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            {/* Performance Alerts Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Performance Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamData.staff_performance
                    .filter((staff) => staff.alerts_count > 0)
                    .map((staff) => (
                      <div
                        key={staff.staff_id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">
                            {staff.staff_info.first_name}{" "}
                            {staff.staff_info.last_name}
                          </div>
                          <Badge variant="destructive">
                            {staff.alerts_count} alerts
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {staff.staff_info.role} • Efficiency:{" "}
                          {staff.performance_summary.efficiency_score}%
                        </div>
                      </div>
                    ))}
                  {teamData.staff_performance.filter(
                    (staff) => staff.alerts_count > 0
                  ).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      No performance alerts at this time
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Performance trend charts would be implemented here with a
                  charting library
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
