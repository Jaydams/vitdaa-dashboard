"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Activity, User, TrendingUp, Eye } from "lucide-react";
import { StaffActivitySummary, StaffActivityLog } from "@/types/staff";
import { formatDistanceToNow, format } from "date-fns";

interface StaffActivitySummaryProps {
  businessId: string;
  onRefresh?: () => void;
}

interface ActivityData {
  summaries: StaffActivitySummary[];
  recentLogs: (StaffActivityLog & {
    staff: { first_name: string; last_name: string; role: string };
  })[];
  loading: boolean;
  error: string | null;
}

export default function StaffActivitySummaryComponent({
  businessId,
  onRefresh,
}: StaffActivitySummaryProps) {
  const [data, setData] = useState<ActivityData>({
    summaries: [],
    recentLogs: [],
    loading: true,
    error: null,
  });

  const [dateFilter, setDateFilter] = useState<string>("7d"); // 7d, 30d, 90d, all
  const [selectedStaff, setSelectedStaff] = useState<string>("all");

  // Calculate date range based on filter
  const getDateRange = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case "7d":
        return {
          from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          to: now.toISOString(),
        };
      case "30d":
        return {
          from: new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          to: now.toISOString(),
        };
      case "90d":
        return {
          from: new Date(
            now.getTime() - 90 * 24 * 60 * 60 * 1000
          ).toISOString(),
          to: now.toISOString(),
        };
      default:
        return { from: undefined, to: undefined };
    }
  };

  // Fetch activity data
  const fetchActivityData = async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { from, to } = getDateRange(dateFilter);

      const [summariesResponse, logsResponse] = await Promise.all([
        fetch(
          `/api/staff/activity/summary?businessId=${businessId}&from=${
            from || ""
          }&to=${to || ""}`
        ),
        fetch(`/api/staff/activity/logs?businessId=${businessId}&limit=50`),
      ]);

      if (!summariesResponse.ok || !logsResponse.ok) {
        throw new Error("Failed to fetch activity data");
      }

      const summaries = await summariesResponse.json();
      const logs = await logsResponse.json();

      setData({
        summaries: summaries.data || [],
        recentLogs: logs.data || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching activity data:", error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load activity data",
      }));
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, [businessId, dateFilter]);

  // Filter summaries by selected staff
  const filteredSummaries =
    selectedStaff === "all"
      ? data.summaries
      : data.summaries.filter((s) => s.staff_id === selectedStaff);

  // Filter logs by selected staff
  const filteredLogs =
    selectedStaff === "all"
      ? data.recentLogs
      : data.recentLogs.filter((log) => log.staff_id === selectedStaff);

  const handleRefresh = () => {
    fetchActivityData();
    onRefresh?.();
  };

  if (data.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Activity Summary</CardTitle>
          <CardDescription>Loading activity data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Activity Summary</CardTitle>
          <CardDescription>Error loading activity data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{data.error}</p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff Activity Summary</CardTitle>
              <CardDescription>
                Monitor staff performance and activity patterns
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex gap-4 mt-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {data.summaries.map((summary) => (
                  <SelectItem key={summary.staff_id} value={summary.staff_id}>
                    {summary.staff_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          <TabsTrigger value="activity-log">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Active Staff
                    </p>
                    <p className="text-2xl font-bold">
                      {filteredSummaries.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Hours
                    </p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        filteredSummaries.reduce(
                          (sum, s) => sum + s.total_session_duration_minutes,
                          0
                        ) / 60
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Actions
                    </p>
                    <p className="text-2xl font-bold">
                      {filteredSummaries.reduce(
                        (sum, s) => sum + s.total_actions,
                        0
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Avg Session
                    </p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        filteredSummaries.reduce(
                          (sum, s) => sum + s.average_session_duration_minutes,
                          0
                        ) / Math.max(filteredSummaries.length, 1)
                      )}
                      m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Performance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSummaries.map((summary) => (
              <Card key={summary.staff_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {summary.staff_name}
                      </CardTitle>
                      <CardDescription>
                        <Badge variant="secondary">{summary.role}</Badge>
                      </CardDescription>
                    </div>
                    {summary.last_activity_at && (
                      <div className="text-sm text-gray-500">
                        Last active:{" "}
                        {formatDistanceToNow(
                          new Date(summary.last_activity_at),
                          { addSuffix: true }
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sessions</span>
                      <span className="font-medium">
                        {summary.total_sessions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Time</span>
                      <span className="font-medium">
                        {Math.round(
                          summary.total_session_duration_minutes / 60
                        )}
                        h {summary.total_session_duration_minutes % 60}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actions</span>
                      <span className="font-medium">
                        {summary.total_actions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Session</span>
                      <span className="font-medium">
                        {summary.average_session_duration_minutes}m
                      </span>
                    </div>

                    {summary.most_common_actions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Top Actions:
                        </p>
                        <div className="space-y-1">
                          {summary.most_common_actions
                            .slice(0, 3)
                            .map((action, index) => (
                              <div
                                key={index}
                                className="flex justify-between text-sm"
                              >
                                <span className="capitalize">
                                  {action.action.replace(/_/g, " ")}
                                </span>
                                <span className="text-gray-500">
                                  {action.count}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Staff Metrics</CardTitle>
              <CardDescription>
                Comprehensive view of staff performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Staff</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Sessions</th>
                      <th className="text-left p-2">Total Time</th>
                      <th className="text-left p-2">Actions</th>
                      <th className="text-left p-2">Avg Session</th>
                      <th className="text-left p-2">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummaries.map((summary) => (
                      <tr
                        key={summary.staff_id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-2 font-medium">
                          {summary.staff_name}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline">{summary.role}</Badge>
                        </td>
                        <td className="p-2">{summary.total_sessions}</td>
                        <td className="p-2">
                          {Math.round(
                            summary.total_session_duration_minutes / 60
                          )}
                          h {summary.total_session_duration_minutes % 60}m
                        </td>
                        <td className="p-2">{summary.total_actions}</td>
                        <td className="p-2">
                          {summary.average_session_duration_minutes}m
                        </td>
                        <td className="p-2 text-sm text-gray-500">
                          {summary.last_activity_at
                            ? formatDistanceToNow(
                                new Date(summary.last_activity_at),
                                { addSuffix: true }
                              )
                            : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Log</CardTitle>
              <CardDescription>
                Latest staff actions and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <Activity className="h-4 w-4 text-gray-400 mt-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {log.staff.first_name} {log.staff.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(log.created_at), "MMM d, HH:mm")}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {log.staff.role}
                        </Badge>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span className="text-xs text-gray-400">
                            {Object.keys(log.details).length} details
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No activity logs found for the selected period.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
