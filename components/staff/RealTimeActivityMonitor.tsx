"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Eye,
  RefreshCw,
  Zap,
} from "lucide-react";
import { getRealTimeActivityMonitoring } from "@/lib/staff-activity-tracking";
import { ActiveStaffSessionWithActivity } from "@/types/staff";

interface RealTimeActivityMonitorProps {
  businessId: string;
  refreshInterval?: number; // in seconds, default 30
}

interface MonitoringData {
  activeSessions: ActiveStaffSessionWithActivity[];
  totalActiveStaff: number;
  averageProductivity: number;
  alertsCount: number;
  alerts: Array<{
    type: "idle" | "low_productivity" | "long_session";
    staffId: string;
    staffName: string;
    message: string;
    severity: "low" | "medium" | "high";
  }>;
}

export default function RealTimeActivityMonitor({
  businessId,
  refreshInterval = 30,
}: RealTimeActivityMonitorProps) {
  const [monitoringData, setMonitoringData] = useState<MonitoringData>({
    activeSessions: [],
    totalActiveStaff: 0,
    averageProductivity: 0,
    alertsCount: 0,
    alerts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      const data = await getRealTimeActivityMonitoring(businessId);
      setMonitoringData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, [businessId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMonitoringData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, businessId]);

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 bg-red-50";
      case "medium":
        return "border-yellow-500 bg-yellow-50";
      default:
        return "border-blue-500 bg-blue-50";
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatLastActivity = (timestamp: string) => {
    const now = new Date();
    const lastActivity = new Date(timestamp);
    const diffMinutes = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ${diffMinutes % 60}m ago`;
  };

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
      {/* Header with controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Activity Monitor</h2>
          <p className="text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
            />
            Auto Refresh: {autoRefresh ? "On" : "Off"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMonitoringData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Staff
                </p>
                <p className="text-3xl font-bold">
                  {monitoringData.totalActiveStaff}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
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
                    monitoringData.averageProductivity
                  )}`}
                >
                  {monitoringData.averageProductivity}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Alerts
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {monitoringData.alertsCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monitoring</p>
                <p className="text-3xl font-bold text-green-600">Live</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts{" "}
            {monitoringData.alertsCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {monitoringData.alertsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          {monitoringData.activeSessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active staff sessions</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {monitoringData.activeSessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {session.staff.first_name} {session.staff.last_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 capitalize">
                          {session.staff.role}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={getProductivityBadgeVariant(
                            session.activity.productivity_score || 0
                          )}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {session.activity.productivity_score || 0}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Session Duration</p>
                        <p className="font-medium">
                          {formatDuration(
                            session.activity.total_session_duration_minutes
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Last Activity</p>
                        <p className="font-medium">
                          {formatLastActivity(
                            session.activity.last_activity_at
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Active Time</span>
                        <span>
                          {formatDuration(session.activity.active_time_minutes)}
                        </span>
                      </div>
                      <Progress
                        value={
                          (session.activity.active_time_minutes /
                            session.activity.total_session_duration_minutes) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <p className="font-medium">
                          {session.activity.page_visits}
                        </p>
                        <p className="text-gray-600">Page Visits</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="font-medium">
                          {session.activity.actions_performed}
                        </p>
                        <p className="text-gray-600">Actions</p>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded">
                        <p className="font-medium">
                          {formatDuration(session.activity.idle_time_minutes)}
                        </p>
                        <p className="text-gray-600">Idle Time</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {monitoringData.alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active alerts</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {monitoringData.alerts.map((alert, index) => (
                <Alert key={index} className={getSeverityColor(alert.severity)}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{alert.staffName}</p>
                        <p className="text-sm">{alert.message}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {alert.type.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant={
                            alert.severity === "high"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
