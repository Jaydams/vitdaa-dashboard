"use client";

import React, { useState, useEffect } from "react";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSignIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon,
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import StaffReportsAnalytics from "./StaffReportsAnalytics";

interface ReportsSummary {
  period: string;
  payroll_summary: {
    total_staff: number;
    total_payroll: number;
    average_salary: number;
    overtime_costs: number;
  } | null;
  attendance_summary: {
    total_staff: number;
    overall_attendance_rate: number;
    overall_punctuality_score: number;
    total_hours_worked: number;
  } | null;
  performance_summary: {
    total_reviews: number;
    average_rating: number;
    performance_distribution: {
      excellent: number;
      good: number;
      satisfactory: number;
      needs_improvement: number;
      poor: number;
    };
  } | null;
  productivity_summary: {
    total_sessions: number;
    average_productivity_score: number;
    total_active_time: number;
  } | null;
  generated_at: string;
}

interface StaffReportsDashboardProps {
  businessId: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function StaffReportsDashboard({
  businessId,
}: StaffReportsDashboardProps) {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "detailed">(
    "dashboard"
  );
  const [timeRange, setTimeRange] = useState("last_month");

  const getDateRange = (range: string) => {
    const today = new Date();
    let startDate = new Date();

    switch (range) {
      case "last_week":
        startDate.setDate(today.getDate() - 7);
        break;
      case "last_month":
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "last_quarter":
        startDate.setMonth(today.getMonth() - 3);
        break;
      case "last_year":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(today.getMonth() - 1);
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    };
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(timeRange);
      const response = await fetch(
        `/api/staff/reports/overview?startDate=${startDate}&endDate=${endDate}&type=summary`
      );

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error("Error fetching reports summary:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [timeRange]);

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  if (viewMode === "detailed") {
    return <StaffReportsAnalytics businessId={businessId} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Staff Reports Dashboard</h2>
          <p className="text-gray-600">
            Overview of staff performance, payroll, and productivity metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setViewMode("detailed")} variant="outline">
            Detailed Reports
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : summary ? (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Staff */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Staff
                    </p>
                    <p className="text-2xl font-bold">
                      {summary.payroll_summary?.total_staff ||
                        summary.attendance_summary?.total_staff ||
                        0}
                    </p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            {/* Total Payroll */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Payroll
                    </p>
                    <p className="text-2xl font-bold">
                      $
                      {summary.payroll_summary?.total_payroll?.toLocaleString() ||
                        "0"}
                    </p>
                    {summary.payroll_summary?.overtime_costs && (
                      <p className="text-xs text-orange-600">
                        +$
                        {summary.payroll_summary.overtime_costs.toLocaleString()}{" "}
                        overtime
                      </p>
                    )}
                  </div>
                  <DollarSignIcon className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            {/* Attendance Rate */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Attendance Rate
                    </p>
                    <p
                      className={`text-2xl font-bold ${getAttendanceColor(
                        summary.attendance_summary?.overall_attendance_rate || 0
                      )}`}
                    >
                      {summary.attendance_summary?.overall_attendance_rate?.toFixed(
                        1
                      ) || "0"}
                      %
                    </p>
                    <p className="text-xs text-gray-500">
                      {summary.attendance_summary?.total_hours_worked?.toLocaleString() ||
                        "0"}{" "}
                      total hours
                    </p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            {/* Performance Rating */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Avg Performance
                    </p>
                    <p
                      className={`text-2xl font-bold ${getPerformanceColor(
                        summary.performance_summary?.average_rating || 0
                      )}`}
                    >
                      {summary.performance_summary?.average_rating?.toFixed(
                        1
                      ) || "0"}
                      /5
                    </p>
                    <p className="text-xs text-gray-500">
                      {summary.performance_summary?.total_reviews || 0} reviews
                    </p>
                  </div>
                  <ActivityIcon className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            {summary.performance_summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Excellent (4.5-5.0)",
                            value:
                              summary.performance_summary
                                .performance_distribution.excellent,
                            color: "#10B981",
                          },
                          {
                            name: "Good (3.5-4.4)",
                            value:
                              summary.performance_summary
                                .performance_distribution.good,
                            color: "#3B82F6",
                          },
                          {
                            name: "Satisfactory (2.5-3.4)",
                            value:
                              summary.performance_summary
                                .performance_distribution.satisfactory,
                            color: "#F59E0B",
                          },
                          {
                            name: "Needs Improvement",
                            value:
                              summary.performance_summary
                                .performance_distribution.needs_improvement,
                            color: "#EF4444",
                          },
                          {
                            name: "Poor (1.0-1.4)",
                            value:
                              summary.performance_summary
                                .performance_distribution.poor,
                            color: "#DC2626",
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) =>
                          value > 0 ? `${name}: ${value}` : ""
                        }
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Productivity Overview */}
            {summary.productivity_summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Productivity Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Total Sessions
                      </span>
                      <Badge variant="outline">
                        {summary.productivity_summary.total_sessions}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Average Productivity
                      </span>
                      <Badge
                        variant={
                          summary.productivity_summary
                            .average_productivity_score >= 70
                            ? "default"
                            : "secondary"
                        }
                      >
                        {
                          summary.productivity_summary
                            .average_productivity_score
                        }
                        %
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Total Active Time
                      </span>
                      <Badge variant="outline">
                        {Math.round(
                          summary.productivity_summary.total_active_time / 60
                        )}
                        h
                      </Badge>
                    </div>

                    {/* Productivity Score Visualization */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Productivity Score</span>
                        <span>
                          {
                            summary.productivity_summary
                              .average_productivity_score
                          }
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            summary.productivity_summary
                              .average_productivity_score >= 80
                              ? "bg-green-500"
                              : summary.productivity_summary
                                  .average_productivity_score >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${summary.productivity_summary.average_productivity_score}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Payroll Insights */}
            {summary.payroll_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payroll Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        Average salary: $
                        {summary.payroll_summary.average_salary?.toLocaleString()}
                      </span>
                    </div>
                    {summary.payroll_summary.overtime_costs > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">
                          $
                          {summary.payroll_summary.overtime_costs.toLocaleString()}{" "}
                          in overtime costs
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance Insights */}
            {summary.attendance_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attendance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {summary.attendance_summary.overall_attendance_rate >=
                      90 ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="text-sm">
                        {summary.attendance_summary.overall_attendance_rate >=
                        90
                          ? "Excellent attendance rate"
                          : "Attendance needs attention"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">
                        Punctuality:{" "}
                        {summary.attendance_summary.overall_punctuality_score?.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Insights */}
            {summary.performance_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {summary.performance_summary.average_rating >= 4 ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : summary.performance_summary.average_rating >= 3 ? (
                        <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">
                        {summary.performance_summary.average_rating >= 4
                          ? "Strong team performance"
                          : summary.performance_summary.average_rating >= 3
                          ? "Average team performance"
                          : "Performance needs improvement"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">
                        {summary.performance_summary.total_reviews} reviews
                        completed
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Report Generation Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Report Period: {summary.period}</span>
                <span>
                  Generated: {new Date(summary.generated_at).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">
              No report data available for the selected period.
            </p>
            <Button onClick={fetchSummary} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
