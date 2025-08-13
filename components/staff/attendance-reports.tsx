"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface AttendanceSummary {
  total_days_worked: number;
  total_hours_worked: number;
  total_overtime_hours: number;
  punctuality_score: number;
  absence_count: number;
  late_count: number;
  early_departure_count: number;
}

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  total_hours_worked?: number;
  overtime_hours: number;
  status: string;
  notes?: string;
  shift?: {
    id: string;
    shift_date: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
  };
}

interface AttendanceReportData {
  staff: {
    id: string;
    name: string;
    role: string;
    employment_start_date?: string;
  };
  period: {
    start_date: string;
    end_date: string;
  };
  summary?: AttendanceSummary;
  metrics?: {
    total_days: number;
    working_days: number;
    late_days: number;
    absent_days: number;
    early_departures: number;
    total_hours: number;
    total_overtime: number;
    average_hours_per_day: number;
    punctuality_rate: number;
  };
  records?: AttendanceRecord[];
}

interface AttendanceReportsProps {
  staffId: string;
}

export function AttendanceReports({ staffId }: AttendanceReportsProps) {
  const [reportData, setReportData] = useState<AttendanceReportData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<"summary" | "detailed">(
    "summary"
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
  }, []);

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/staff/${staffId}/attendance/reports?startDate=${startDate}&endDate=${endDate}&type=${reportType}`
      );

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch report");
      }
    } catch (error) {
      toast.error("Error fetching attendance report");
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <Badge variant="default" className="bg-green-500">
            Present
          </Badge>
        );
      case "late":
        return <Badge variant="destructive">Late</Badge>;
      case "early_departure":
        return <Badge variant="secondary">Early Departure</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvContent =
      reportType === "summary"
        ? generateSummaryCSV(reportData)
        : generateDetailedCSV(reportData);

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${reportData.staff.name}-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const generateSummaryCSV = (data: AttendanceReportData) => {
    const summary = data.summary!;
    return `Staff Attendance Summary Report
Staff Name,${data.staff.name}
Role,${data.staff.role}
Period,${data.period.start_date} to ${data.period.end_date}

Metric,Value
Total Days Worked,${summary.total_days_worked}
Total Hours Worked,${summary.total_hours_worked}
Total Overtime Hours,${summary.total_overtime_hours}
Punctuality Score,${summary.punctuality_score}%
Absence Count,${summary.absence_count}
Late Count,${summary.late_count}
Early Departure Count,${summary.early_departure_count}`;
  };

  const generateDetailedCSV = (data: AttendanceReportData) => {
    const records = data.records || [];
    let csv = `Staff Attendance Detailed Report
Staff Name,${data.staff.name}
Role,${data.staff.role}
Period,${data.period.start_date} to ${data.period.end_date}

Date,Clock In,Clock Out,Hours Worked,Overtime,Status,Scheduled Start,Scheduled End,Notes\n`;

    records.forEach((record) => {
      csv += `${formatDate(record.attendance_date)},`;
      csv += `${formatTime(record.clock_in_time)},`;
      csv += `${formatTime(record.clock_out_time)},`;
      csv += `${record.total_hours_worked?.toFixed(2) || "0"},`;
      csv += `${record.overtime_hours.toFixed(2)},`;
      csv += `${record.status},`;
      csv += `${
        record.shift ? formatTime(record.shift.scheduled_start_time) : "N/A"
      },`;
      csv += `${
        record.shift ? formatTime(record.shift.scheduled_end_time) : "N/A"
      },`;
      csv += `"${record.notes || ""}"\n`;
    });

    return csv;
  };

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Attendance Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                value={reportType}
                onValueChange={(value: "summary" | "detailed") =>
                  setReportType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={fetchReport}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Generating..." : "Generate Report"}
              </Button>
              {reportData && (
                <Button onClick={exportReport} variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Staff Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {reportData.staff.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {reportData.staff.role} •{" "}
                    {formatDate(reportData.period.start_date)} -{" "}
                    {formatDate(reportData.period.end_date)}
                  </p>
                </div>
                <Badge variant="outline">
                  {reportType === "summary"
                    ? "Summary Report"
                    : "Detailed Report"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Summary Report */}
          {reportType === "summary" && reportData.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {reportData.summary.total_days_worked}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Days Worked
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {reportData.summary.total_hours_worked.toFixed(1)}h
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {reportData.summary.punctuality_score.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Punctuality
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {reportData.summary.absence_count}
                      </p>
                      <p className="text-sm text-muted-foreground">Absences</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {reportData.summary.total_overtime_hours > 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Overtime Hours
                        </span>
                        <span className="font-medium">
                          {reportData.summary.total_overtime_hours.toFixed(1)}h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Late Arrivals
                        </span>
                        <span className="font-medium">
                          {reportData.summary.late_count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Early Departures
                        </span>
                        <span className="font-medium">
                          {reportData.summary.early_departure_count}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Detailed Report */}
          {reportType === "detailed" && reportData.records && (
            <>
              {/* Metrics Overview */}
              {reportData.metrics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Period Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData.metrics.working_days}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Working Days
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {reportData.metrics.total_hours.toFixed(1)}h
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Hours
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {reportData.metrics.average_hours_per_day.toFixed(1)}h
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Avg Hours/Day
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {reportData.metrics.punctuality_rate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Punctuality Rate
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Records Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Attendance Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.records.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {formatDate(record.attendance_date)}
                            </TableCell>
                            <TableCell>
                              {formatTime(record.clock_in_time)}
                            </TableCell>
                            <TableCell>
                              {formatTime(record.clock_out_time)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">
                                  {record.total_hours_worked?.toFixed(2) ||
                                    "0.00"}
                                  h
                                </span>
                                {record.overtime_hours > 0 && (
                                  <span className="text-xs text-orange-600 ml-1">
                                    (+{record.overtime_hours.toFixed(2)}h OT)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(record.status)}
                            </TableCell>
                            <TableCell>
                              {record.shift ? (
                                <div className="text-xs text-muted-foreground">
                                  {formatTime(
                                    record.shift.scheduled_start_time
                                  )}{" "}
                                  -{" "}
                                  {formatTime(record.shift.scheduled_end_time)}
                                </div>
                              ) : (
                                "No shift"
                              )}
                            </TableCell>
                            <TableCell>
                              {record.notes && (
                                <div className="text-xs text-muted-foreground max-w-32 truncate">
                                  {record.notes}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Generating report...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
