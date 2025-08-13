"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  CalendarIcon,
  DollarSignIcon,
  ClockIcon,
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
  DownloadIcon,
  RefreshCwIcon,
} from "lucide-react";

interface PayrollSummaryReport {
  period: string;
  total_staff: number;
  total_payroll: number;
  average_salary: number;
  salary_breakdown: {
    hourly_staff: number;
    monthly_staff: number;
    annual_staff: number;
    total_hourly_cost: number;
    total_monthly_cost: number;
    total_annual_cost: number;
  };
  overtime_costs: number;
  commission_costs: number;
  staff_details: Array<{
    staff_id: string;
    name: string;
    role: string;
    salary_type: string;
    base_compensation: number;
    overtime_pay: number;
    commission: number;
    total_compensation: number;
    hours_worked: number;
  }>;
}

interface AttendancePunctualityReport {
  period: string;
  total_staff: number;
  overall_attendance_rate: number;
  overall_punctuality_score: number;
  total_hours_worked: number;
  total_overtime_hours: number;
  staff_details: Array<{
    staff_id: string;
    name: string;
    role: string;
    days_worked: number;
    hours_worked: number;
    overtime_hours: number;
    attendance_rate: number;
    punctuality_score: number;
    late_count: number;
    absence_count: number;
    early_departure_count: number;
  }>;
  trends: {
    daily_attendance: Array<{
      date: string;
      present_count: number;
      absent_count: number;
      late_count: number;
    }>;
    punctuality_trend: Array<{
      week: string;
      average_punctuality: number;
    }>;
  };
}

interface PerformanceTrendReport {
  period: string;
  total_reviews: number;
  average_rating: number;
  staff_performance: Array<{
    staff_id: string;
    name: string;
    role: string;
    current_rating: number;
    trend: "improving" | "stable" | "declining";
    rating_change: number;
    reviews_count: number;
    goals_completed: number;
    achievements_count: number;
    areas_for_improvement: string[];
  }>;
  department_performance: Array<{
    department: string;
    staff_count: number;
    average_rating: number;
    trend: "improving" | "stable" | "declining";
  }>;
  performance_distribution: {
    excellent: number;
    good: number;
    satisfactory: number;
    needs_improvement: number;
    poor: number;
  };
}

interface ProductivityAnalyticsReport {
  period: string;
  total_sessions: number;
  average_productivity_score: number;
  total_active_time: number;
  total_idle_time: number;
  staff_productivity: Array<{
    staff_id: string;
    name: string;
    role: string;
    sessions_count: number;
    average_productivity: number;
    total_active_time: number;
    total_idle_time: number;
    task_completion_rate: number;
    most_used_features: string[];
    productivity_trend: "improving" | "stable" | "declining";
  }>;
  productivity_trends: Array<{
    date: string;
    average_productivity: number;
    active_sessions: number;
  }>;
  feature_usage: Array<{
    feature: string;
    usage_count: number;
    average_time_spent: number;
  }>;
}

interface StaffReportsAnalyticsProps {
  businessId: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function StaffReportsAnalytics({
  businessId,
}: StaffReportsAnalyticsProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [reportPeriod, setReportPeriod] = useState("last_month");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [payrollReport, setPayrollReport] =
    useState<PayrollSummaryReport | null>(null);
  const [attendanceReport, setAttendanceReport] =
    useState<AttendancePunctualityReport | null>(null);
  const [performanceReport, setPerformanceReport] =
    useState<PerformanceTrendReport | null>(null);
  const [productivityReport, setProductivityReport] =
    useState<ProductivityAnalyticsReport | null>(null);

  // Handle preset date ranges
  const handlePeriodChange = (period: string) => {
    setReportPeriod(period);
    const today = new Date();
    let start = new Date();

    switch (period) {
      case "last_week":
        start.setDate(today.getDate() - 7);
        break;
      case "last_month":
        start.setMonth(today.getMonth() - 1);
        break;
      case "last_quarter":
        start.setMonth(today.getMonth() - 3);
        break;
      case "last_year":
        start.setFullYear(today.getFullYear() - 1);
        break;
      case "custom":
        return; // Don't update dates for custom
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  // Fetch all reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const [payrollRes, attendanceRes, performanceRes, productivityRes] =
        await Promise.all([
          fetch(
            `/api/staff/reports/payroll?startDate=${startDate}&endDate=${endDate}`
          ),
          fetch(
            `/api/staff/reports/attendance?startDate=${startDate}&endDate=${endDate}`
          ),
          fetch(
            `/api/staff/reports/performance?startDate=${startDate}&endDate=${endDate}`
          ),
          fetch(
            `/api/staff/reports/productivity?startDate=${startDate}&endDate=${endDate}`
          ),
        ]);

      if (payrollRes.ok) {
        const payrollData = await payrollRes.json();
        setPayrollReport(payrollData);
      }

      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        setAttendanceReport(attendanceData);
      }

      if (performanceRes.ok) {
        const performanceData = await performanceRes.json();
        setPerformanceReport(performanceData);
      }

      if (productivityRes.ok) {
        const productivityData = await productivityRes.json();
        setProductivityReport(productivityData);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Export report data
  const exportReport = (reportType: string) => {
    let data: any = null;
    let filename = "";

    switch (reportType) {
      case "payroll":
        data = payrollReport;
        filename = `payroll-report-${startDate}-to-${endDate}.json`;
        break;
      case "attendance":
        data = attendanceReport;
        filename = `attendance-report-${startDate}-to-${endDate}.json`;
        break;
      case "performance":
        data = performanceReport;
        filename = `performance-report-${startDate}-to-${endDate}.json`;
        break;
      case "productivity":
        data = productivityReport;
        filename = `productivity-report-${startDate}-to-${endDate}.json`;
        break;
    }

    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const getTrendIcon = (trend: "improving" | "stable" | "declining") => {
    switch (trend) {
      case "improving":
        return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingUpIcon className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <TrendingUpIcon className="h-4 w-4 text-gray-500 rotate-90" />;
    }
  };

  const getTrendColor = (trend: "improving" | "stable" | "declining") => {
    switch (trend) {
      case "improving":
        return "text-green-600 bg-green-50";
      case "declining":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Staff Reports & Analytics</h2>
          <p className="text-gray-600">
            Comprehensive insights into staff performance, payroll, and
            productivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchReports}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCwIcon
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="period-select">Quick Select</Label>
              <Select value={reportPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Key Metrics Cards */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Staff
                    </p>
                    <p className="text-2xl font-bold">
                      {payrollReport?.total_staff ||
                        attendanceReport?.total_staff ||
                        0}
                    </p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Payroll
                    </p>
                    <p className="text-2xl font-bold">
                      ${payrollReport?.total_payroll?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <DollarSignIcon className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Attendance Rate
                    </p>
                    <p className="text-2xl font-bold">
                      {attendanceReport?.overall_attendance_rate?.toFixed(1) ||
                        "0"}
                      %
                    </p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Avg Performance
                    </p>
                    <p className="text-2xl font-bold">
                      {performanceReport?.average_rating?.toFixed(1) || "0"}/5
                    </p>
                  </div>
                  <ActivityIcon className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            {performanceReport && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Excellent",
                            value:
                              performanceReport.performance_distribution
                                .excellent,
                          },
                          {
                            name: "Good",
                            value:
                              performanceReport.performance_distribution.good,
                          },
                          {
                            name: "Satisfactory",
                            value:
                              performanceReport.performance_distribution
                                .satisfactory,
                          },
                          {
                            name: "Needs Improvement",
                            value:
                              performanceReport.performance_distribution
                                .needs_improvement,
                          },
                          {
                            name: "Poor",
                            value:
                              performanceReport.performance_distribution.poor,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
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

            {/* Salary Breakdown */}
            {payrollReport && (
              <Card>
                <CardHeader>
                  <CardTitle>Salary Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        {
                          type: "Hourly",
                          count: payrollReport.salary_breakdown.hourly_staff,
                        },
                        {
                          type: "Monthly",
                          count: payrollReport.salary_breakdown.monthly_staff,
                        },
                        {
                          type: "Annual",
                          count: payrollReport.salary_breakdown.annual_staff,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-6">
          {payrollReport && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Payroll Summary Report
                </h3>
                <Button
                  onClick={() => exportReport("payroll")}
                  variant="outline"
                  size="sm"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Total Payroll
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        ${payrollReport.total_payroll.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Overtime Costs
                      </p>
                      <p className="text-3xl font-bold text-orange-600">
                        ${payrollReport.overtime_costs.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Commission Costs
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        ${payrollReport.commission_costs.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Staff Compensation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Staff Member</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-left p-2">Salary Type</th>
                          <th className="text-right p-2">Base Pay</th>
                          <th className="text-right p-2">Overtime</th>
                          <th className="text-right p-2">Commission</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollReport.staff_details.map((staff) => (
                          <tr key={staff.staff_id} className="border-b">
                            <td className="p-2 font-medium">{staff.name}</td>
                            <td className="p-2">{staff.role}</td>
                            <td className="p-2">
                              <Badge variant="outline">
                                {staff.salary_type}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">
                              ${staff.base_compensation.toFixed(2)}
                            </td>
                            <td className="p-2 text-right">
                              ${staff.overtime_pay.toFixed(2)}
                            </td>
                            <td className="p-2 text-right">
                              ${staff.commission.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-semibold">
                              ${staff.total_compensation.toFixed(2)}
                            </td>
                            <td className="p-2 text-right">
                              {staff.hours_worked.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          {attendanceReport && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Attendance & Punctuality Report
                </h3>
                <Button
                  onClick={() => exportReport("attendance")}
                  variant="outline"
                  size="sm"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Attendance Rate
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {attendanceReport.overall_attendance_rate.toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Punctuality Score
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {attendanceReport.overall_punctuality_score.toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Total Hours
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {attendanceReport.total_hours_worked.toFixed(0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Overtime Hours
                      </p>
                      <p className="text-3xl font-bold text-orange-600">
                        {attendanceReport.total_overtime_hours.toFixed(0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Staff Attendance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Staff Member</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-right p-2">Days Worked</th>
                          <th className="text-right p-2">Hours</th>
                          <th className="text-right p-2">Attendance %</th>
                          <th className="text-right p-2">Punctuality %</th>
                          <th className="text-right p-2">Late Count</th>
                          <th className="text-right p-2">Absences</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceReport.staff_details.map((staff) => (
                          <tr key={staff.staff_id} className="border-b">
                            <td className="p-2 font-medium">{staff.name}</td>
                            <td className="p-2">{staff.role}</td>
                            <td className="p-2 text-right">
                              {staff.days_worked}
                            </td>
                            <td className="p-2 text-right">
                              {staff.hours_worked.toFixed(1)}
                            </td>
                            <td className="p-2 text-right">
                              <Badge
                                variant={
                                  staff.attendance_rate >= 90
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {staff.attendance_rate.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="p-2 text-right">
                              <Badge
                                variant={
                                  staff.punctuality_score >= 90
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {staff.punctuality_score.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="p-2 text-right">
                              {staff.late_count}
                            </td>
                            <td className="p-2 text-right">
                              {staff.absence_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performanceReport && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Performance Trend Report
                </h3>
                <Button
                  onClick={() => exportReport("performance")}
                  variant="outline"
                  size="sm"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Total Reviews
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {performanceReport.total_reviews}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Average Rating
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {performanceReport.average_rating.toFixed(1)}/5
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Staff Reviewed
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {performanceReport.staff_performance.length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Staff Performance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Staff Member</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-right p-2">Current Rating</th>
                          <th className="text-center p-2">Trend</th>
                          <th className="text-right p-2">Rating Change</th>
                          <th className="text-right p-2">Goals Completed</th>
                          <th className="text-right p-2">Achievements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceReport.staff_performance.map((staff) => (
                          <tr key={staff.staff_id} className="border-b">
                            <td className="p-2 font-medium">{staff.name}</td>
                            <td className="p-2">{staff.role}</td>
                            <td className="p-2 text-right">
                              <Badge
                                variant={
                                  staff.current_rating >= 4
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {staff.current_rating.toFixed(1)}/5
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getTrendIcon(staff.trend)}
                                <span
                                  className={`text-xs px-2 py-1 rounded ${getTrendColor(
                                    staff.trend
                                  )}`}
                                >
                                  {staff.trend}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              <span
                                className={
                                  staff.rating_change > 0
                                    ? "text-green-600"
                                    : staff.rating_change < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }
                              >
                                {staff.rating_change > 0 ? "+" : ""}
                                {staff.rating_change.toFixed(1)}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              {staff.goals_completed}
                            </td>
                            <td className="p-2 text-right">
                              {staff.achievements_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Department Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {performanceReport.department_performance.map((dept) => (
                      <Card key={dept.department}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{dept.department}</h4>
                            {getTrendIcon(dept.trend)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Staff Count:</span>
                              <span>{dept.staff_count}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Avg Rating:</span>
                              <span>{dept.average_rating.toFixed(1)}/5</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Trend:</span>
                              <Badge
                                variant="outline"
                                className={getTrendColor(dept.trend)}
                              >
                                {dept.trend}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          {productivityReport && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Productivity Analytics Report
                </h3>
                <Button
                  onClick={() => exportReport("productivity")}
                  variant="outline"
                  size="sm"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Total Sessions
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {productivityReport.total_sessions}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Avg Productivity
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {productivityReport.average_productivity_score}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Active Time
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {Math.round(productivityReport.total_active_time / 60)}h
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Idle Time
                      </p>
                      <p className="text-3xl font-bold text-orange-600">
                        {Math.round(productivityReport.total_idle_time / 60)}h
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Staff Productivity Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Staff Member</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-right p-2">Sessions</th>
                          <th className="text-right p-2">Avg Productivity</th>
                          <th className="text-right p-2">Active Time</th>
                          <th className="text-right p-2">Task Completion</th>
                          <th className="text-center p-2">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productivityReport.staff_productivity.map((staff) => (
                          <tr key={staff.staff_id} className="border-b">
                            <td className="p-2 font-medium">{staff.name}</td>
                            <td className="p-2">{staff.role}</td>
                            <td className="p-2 text-right">
                              {staff.sessions_count}
                            </td>
                            <td className="p-2 text-right">
                              <Badge
                                variant={
                                  staff.average_productivity >= 70
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {staff.average_productivity}%
                              </Badge>
                            </td>
                            <td className="p-2 text-right">
                              {Math.round(staff.total_active_time / 60)}h
                            </td>
                            <td className="p-2 text-right">
                              {staff.task_completion_rate.toFixed(1)}%
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getTrendIcon(staff.productivity_trend)}
                                <span
                                  className={`text-xs px-2 py-1 rounded ${getTrendColor(
                                    staff.productivity_trend
                                  )}`}
                                >
                                  {staff.productivity_trend}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
