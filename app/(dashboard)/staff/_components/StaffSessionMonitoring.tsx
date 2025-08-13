"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Clock,
  Monitor,
  TrendingUp,
  Eye,
  Calendar,
  BarChart3,
  Timer,
  MousePointer,
  Smartphone,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Staff, StaffSessionActivity } from "@/types/staff";
import {
  fetchStaffSessionActivity,
  fetchActiveStaffSessions,
} from "@/data/staff";

interface StaffSessionMonitoringProps {
  staffId: string;
  staff: Staff;
}

export default function StaffSessionMonitoring({
  staffId,
  staff,
}: StaffSessionMonitoringProps) {
  const [timeRange, setTimeRange] = useState("today");

  // Fetch session activity
  const {
    data: sessionActivity,
    isLoading: activityLoading,
  } = useQuery({
    queryKey: ["staff-session-activity", staffId, timeRange],
    queryFn: () => fetchStaffSessionActivity(staffId, 50),
    retry: 1,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active sessions
  const { data: activeSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["staff-active-sessions", staffId],
    queryFn: () => fetchActiveStaffSessions(staffId),
    retry: 1,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const calculateProductivityScore = (activity: StaffSessionActivity[]) => {
    if (!activity || activity.length === 0) return 0;

    const totalSessions = activity.length;
    const activeSessions = activity.filter(
      (s) => s.active_time_minutes > 0
    ).length;
    const avgActiveTime =
      activity.reduce((sum, s) => sum + s.active_time_minutes, 0) /
      totalSessions;

    // Simple productivity calculation based on active time and task completion
    const baseScore = (activeSessions / totalSessions) * 50;
    const timeScore = Math.min((avgActiveTime / 480) * 30, 30); // Max 8 hours = 30 points
    const taskScore =
      (activity.reduce((sum, s) => sum + (s.tasks_completed?.length || 0), 0) /
        totalSessions) *
      20;

    return Math.round(baseScore + timeScore + taskScore);
  };

  const getTodayActivity = () => {
    if (!sessionActivity) return null;

    const today = new Date().toISOString().split("T")[0];
    return sessionActivity.filter((activity) =>
      activity.created_at.startsWith(today)
    );
  };

  const todayActivity = getTodayActivity();

  if (activityLoading || sessionsLoading) {
    return <SessionMonitoringSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <Badge variant="secondary">
            {activeSessions?.length || 0} active
          </Badge>
        </CardHeader>
        <CardContent>
          {activeSessions && activeSessions.length > 0 ? (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-green-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">
                        {staff.first_name} {staff.last_name}
                      </span>
                      <Badge variant="default" className="bg-green-600">
                        Live
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Started:{" "}
                        {new Date(session.signed_in_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">
                      {formatDuration(
                        Math.floor(
                          (new Date().getTime() -
                            new Date(session.signed_in_at).getTime()) /
                            (1000 * 60)
                        )
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Session Duration
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Active Sessions
              </h3>
              <p className="text-gray-600">
                {staff.first_name} is currently offline
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Activity Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Today&apos;s Activity Summary
          </CardTitle>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {todayActivity && todayActivity.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {todayActivity.reduce(
                    (sum, activity) => sum + activity.active_time_minutes,
                    0
                  )}
                </div>
                <div className="text-sm text-gray-600">Active Minutes</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {todayActivity.reduce(
                    (sum, activity) =>
                      sum + (activity.tasks_completed?.length || 0),
                    0
                  )}
                </div>
                <div className="text-sm text-gray-600">Tasks Completed</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {todayActivity.reduce(
                    (sum, activity) =>
                      sum + (activity.screens_accessed?.length || 0),
                    0
                  )}
                </div>
                <div className="text-sm text-gray-600">Screens Accessed</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {calculateProductivityScore(todayActivity)}%
                </div>
                <div className="text-sm text-gray-600">Productivity Score</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Activity Today
              </h3>
              <p className="text-gray-600">
                No session activity recorded for today
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {sessionActivity && sessionActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessionActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {new Date(
                            activity.created_at
                          ).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(
                            activity.created_at
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      {activity.productivity_score && (
                        <div className="flex items-center gap-2 mt-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-sm text-gray-600">
                            Productivity: {activity.productivity_score}%
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary">
                      Completed
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700 mb-1">
                        Active Time
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        {formatDuration(activity.active_time_minutes)}
                      </div>
                    </div>

                    {activity.break_time_minutes > 0 && (
                      <div>
                        <div className="font-medium text-gray-700 mb-1">
                          Break Time
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="h-3 w-3 text-orange-500" />
                          {formatDuration(activity.break_time_minutes)}
                        </div>
                      </div>
                    )}

                    {activity.tasks_completed &&
                      activity.tasks_completed.length > 0 && (
                        <div>
                          <div className="font-medium text-gray-700 mb-1">
                            Tasks Completed
                          </div>
                          <div className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3 text-green-500" />
                            {activity.tasks_completed.length} tasks
                          </div>
                        </div>
                      )}
                  </div>

                  {activity.screens_accessed &&
                    activity.screens_accessed.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium text-gray-700 mb-2">
                          Screens Accessed
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {activity.screens_accessed.map(
                            (screen, screenIndex) => (
                              <Badge
                                key={screenIndex}
                                variant="outline"
                                className="text-xs"
                              >
                                {screen.screen_name}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {activity.tasks_completed &&
                    activity.tasks_completed.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium text-gray-700 mb-2">
                          Completed Tasks
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {activity.tasks_completed.map(
                            (task, taskIndex) => (
                              <Badge
                                key={taskIndex}
                                variant={task.success ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {task.task_name}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productivity Insights */}
      {sessionActivity && sessionActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Productivity Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Most Active Hours
                </h4>
                <div className="space-y-2">
                  {/* This would typically show a chart, but for now we'll show text */}
                  <div className="text-sm text-gray-600">
                    Peak activity typically occurs between 9 AM - 11 AM and 2 PM
                    - 4 PM
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Frequently Used Features
                </h4>
                <div className="space-y-2">
                  {sessionActivity
                    .flatMap((activity) => activity.screens_accessed || [])
                    .reduce((acc: Record<string, number>, screen) => {
                      acc[screen.screen_name] = (acc[screen.screen_name] || 0) + 1;
                      return acc;
                    }, {}) &&
                    Object.entries(
                      sessionActivity
                        .flatMap((activity) => activity.screens_accessed || [])
                        .reduce((acc: Record<string, number>, screen) => {
                          acc[screen.screen_name] = (acc[screen.screen_name] || 0) + 1;
                          return acc;
                        }, {})
                    )
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([screen, count]) => (
                        <div
                          key={screen}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-gray-700">
                            {screen}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {count} times
                          </Badge>
                        </div>
                      ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SessionMonitoringSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
