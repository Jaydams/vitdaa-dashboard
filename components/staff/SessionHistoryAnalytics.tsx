"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Clock,
  TrendingUp,
  Activity,
  Target,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import { getStaffSessionAnalytics } from "@/lib/staff-activity-tracking";

interface SessionHistoryAnalyticsProps {
  businessId: string;
  staffId: string;
  staffName: string;
}

interface AnalyticsData {
  totalSessions: number;
  averageSessionDuration: number;
  averageProductivityScore: number;
  totalActiveTime: number;
  totalIdleTime: number;
  totalBreakTime: number;
  mostAccessedScreens: Array<{
    screen: string;
    count: number;
    totalTime: number;
  }>;
  taskCompletionRate: number;
  activityTrend: Array<{
    date: string;
    productivity: number;
    duration: number;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function SessionHistoryAnalytics({
  businessId,
  staffId,
  staffName,
}: SessionHistoryAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalSessions: 0,
    averageSessionDuration: 0,
    averageProductivityScore: 0,
    totalActiveTime: 0,
    totalIdleTime: 0,
    totalBreakTime: 0,
    mostAccessedScreens: [],
    taskCompletionRate: 0,
    activityTrend: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30"); // days

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(dateRange));

      const data = await getStaffSessionAnalytics(
        businessId,
        staffId,
        dateFrom.toISOString(),
        new Date().toISOString()
      );
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [businessId, staffId, dateRange]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProductivityBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  // Prepare chart data
  const timeDistributionData = [
    {
      name: "Active Time",
      value: analyticsData.totalActiveTime,
      color: "#00C49F",
    },
    { name: "Idle Time", value: analyticsData.totalIdleTime, color: "#FF8042" },
    {
      name: "Break Time",
      value: analyticsData.totalBreakTime,
      color: "#FFBB28",
    },
  ].filter((item) => item.value > 0);

  const screenAccessData = analyticsData.mostAccessedScreens
    .slice(0, 8)
    .map((screen) => ({
      screen:
        screen.screen.length > 15
          ? screen.screen.substring(0, 15) + "..."
          : screen.screen,
      count: screen.count,
      totalTime: screen.totalTime,
    }));

  const productivityTrendData = analyticsData.activityTrend
    .slice(-14)
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      productivity: item.productivity,
      duration: Math.round(item.duration / 60), // Convert to hours
    }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            Session Analytics - {staffName}
          </h2>
          <p className="text-gray-600">
            Detailed activity and productivity insights
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Sessions
                </p>
                <p className="text-3xl font-bold">
                  {analyticsData.totalSessions}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Session</p>
                <p className="text-3xl font-bold">
                  {formatDuration(analyticsData.averageSessionDuration)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Productivity
                </p>
                <p
                  className={`text-3xl font-bold ${getProductivityColor(
                    analyticsData.averageProductivityScore
                  )}`}
                >
                  {analyticsData.averageProductivityScore}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Task Success
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {analyticsData.taskCompletionRate}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">
            <BarChart3 className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Time Distribution
          </TabsTrigger>
          <TabsTrigger value="screens">
            <Activity className="h-4 w-4 mr-2" />
            Screen Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productivity & Session Duration Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {productivityTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productivityTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="productivity"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Productivity %"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="duration"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Duration (hours)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-gray-500">
                  No trend data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {timeDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={timeDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {timeDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatDuration(value as number)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-250 flex items-center justify-center text-gray-500">
                    No time distribution data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Active Time</span>
                      <span>
                        {formatDuration(analyticsData.totalActiveTime)}
                      </span>
                    </div>
                    <Progress
                      value={
                        (analyticsData.totalActiveTime /
                          (analyticsData.totalActiveTime +
                            analyticsData.totalIdleTime +
                            analyticsData.totalBreakTime)) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Idle Time</span>
                      <span>{formatDuration(analyticsData.totalIdleTime)}</span>
                    </div>
                    <Progress
                      value={
                        (analyticsData.totalIdleTime /
                          (analyticsData.totalActiveTime +
                            analyticsData.totalIdleTime +
                            analyticsData.totalBreakTime)) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Break Time</span>
                      <span>
                        {formatDuration(analyticsData.totalBreakTime)}
                      </span>
                    </div>
                    <Progress
                      value={
                        (analyticsData.totalBreakTime /
                          (analyticsData.totalActiveTime +
                            analyticsData.totalIdleTime +
                            analyticsData.totalBreakTime)) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="screens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Accessed Screens</CardTitle>
            </CardHeader>
            <CardContent>
              {screenAccessData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={screenAccessData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="screen" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Access Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-gray-500">
                  No screen access data available
                </div>
              )}
            </CardContent>
          </Card>

          {screenAccessData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Screen Usage Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.mostAccessedScreens
                    .slice(0, 10)
                    .map((screen, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded"
                      >
                        <div>
                          <p className="font-medium">{screen.screen}</p>
                          <p className="text-sm text-gray-600">
                            {screen.count} visits •{" "}
                            {formatDuration(screen.totalTime)} total
                          </p>
                        </div>
                        <Badge variant="outline">
                          {formatDuration(
                            Math.round(screen.totalTime / screen.count)
                          )}{" "}
                          avg
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
