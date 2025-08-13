"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Clock,
  Activity,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Monitor,
  UserX,
  Eye,
} from "lucide-react";
import { ActiveStaffSessionWithActivity } from "@/types/staff";
import { formatDistanceToNow, format, differenceInMinutes } from "date-fns";

interface SessionManagementDashboardProps {
  businessId: string;
  onRefresh?: () => void;
}

interface SessionData {
  activeSessions: ActiveStaffSessionWithActivity[];
  loading: boolean;
  error: string | null;
}

export default function SessionManagementDashboard({
  businessId,
  onRefresh,
}: SessionManagementDashboardProps) {
  const [data, setData] = useState<SessionData>({
    activeSessions: [],
    loading: true,
    error: null,
  });

  const [signOutLoading, setSignOutLoading] = useState<Set<string>>(new Set());
  const [bulkSignOutLoading, setBulkSignOutLoading] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set()
  );

  // Auto-refresh interval (30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessionData();
    }, 30000);

    return () => clearInterval(interval);
  }, [businessId]);

  // Fetch session data
  const fetchSessionData = async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `/api/staff/sessions/active?businessId=${businessId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch session data");
      }

      const result = await response.json();

      setData({
        activeSessions: result.data || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching session data:", error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load session data",
      }));
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessionData();
  }, [businessId]);

  // Sign out individual staff member
  const handleSignOutStaff = async (sessionId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to sign out ${staffName}?`)) {
      return;
    }

    setSignOutLoading((prev) => new Set(prev).add(sessionId));

    try {
      const response = await fetch("/api/staff/sessions/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          businessId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sign out staff member");
      }

      // Refresh data
      await fetchSessionData();

      // Remove from selected sessions if it was selected
      setSelectedSessions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    } catch (error) {
      console.error("Error signing out staff:", error);
      alert("Failed to sign out staff member. Please try again.");
    } finally {
      setSignOutLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  // Bulk sign out selected staff
  const handleBulkSignOut = async () => {
    if (selectedSessions.size === 0) {
      alert("Please select staff members to sign out.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to sign out ${selectedSessions.size} staff member(s)?`
      )
    ) {
      return;
    }

    setBulkSignOutLoading(true);

    try {
      const response = await fetch("/api/staff/sessions/bulk-signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionIds: Array.from(selectedSessions),
          businessId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sign out staff members");
      }

      // Refresh data and clear selections
      await fetchSessionData();
      setSelectedSessions(new Set());
    } catch (error) {
      console.error("Error bulk signing out staff:", error);
      alert("Failed to sign out staff members. Please try again.");
    } finally {
      setBulkSignOutLoading(false);
    }
  };

  // Sign out all staff
  const handleSignOutAll = async () => {
    if (data.activeSessions.length === 0) {
      return;
    }

    if (
      !confirm(
        `Are you sure you want to sign out ALL ${data.activeSessions.length} staff member(s)?`
      )
    ) {
      return;
    }

    setBulkSignOutLoading(true);

    try {
      const response = await fetch("/api/staff/sessions/signout-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sign out all staff");
      }

      // Refresh data and clear selections
      await fetchSessionData();
      setSelectedSessions(new Set());
    } catch (error) {
      console.error("Error signing out all staff:", error);
      alert("Failed to sign out all staff. Please try again.");
    } finally {
      setBulkSignOutLoading(false);
    }
  };

  // Toggle session selection
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // Select all sessions
  const selectAllSessions = () => {
    setSelectedSessions(new Set(data.activeSessions.map((s) => s.id)));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedSessions(new Set());
  };

  // Calculate session metrics
  const sessionMetrics = {
    totalSessions: data.activeSessions.length,
    totalActiveTime: data.activeSessions.reduce((sum, session) => {
      const sessionStart = new Date(session.signed_in_at);
      const now = new Date();
      return sum + differenceInMinutes(now, sessionStart);
    }, 0),
    averageSessionTime:
      data.activeSessions.length > 0
        ? Math.round(
            data.activeSessions.reduce((sum, session) => {
              const sessionStart = new Date(session.signed_in_at);
              const now = new Date();
              return sum + differenceInMinutes(now, sessionStart);
            }, 0) / data.activeSessions.length
          )
        : 0,
    idleSessions: data.activeSessions.filter((session) => {
      const lastActivity = new Date(session.activity.last_activity_at);
      const now = new Date();
      return differenceInMinutes(now, lastActivity) > 30; // 30 minutes idle
    }).length,
  };

  const handleRefresh = () => {
    fetchSessionData();
    onRefresh?.();
  };

  if (data.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
          <CardDescription>Loading active sessions...</CardDescription>
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
          <CardTitle>Session Management</CardTitle>
          <CardDescription>Error loading session data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{data.error}</AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Session Management Dashboard</CardTitle>
              <CardDescription>
                Monitor and manage active staff sessions
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">
                  {sessionMetrics.totalSessions}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Active Time</p>
                <p className="text-2xl font-bold">
                  {Math.round(sessionMetrics.totalActiveTime / 60)}h
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Session Time</p>
                <p className="text-2xl font-bold">
                  {sessionMetrics.averageSessionTime}m
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Idle Sessions</p>
                <p className="text-2xl font-bold">
                  {sessionMetrics.idleSessions}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {data.activeSessions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={
                      selectedSessions.size === data.activeSessions.length &&
                      data.activeSessions.length > 0
                    }
                    onChange={(e) =>
                      e.target.checked
                        ? selectAllSessions()
                        : clearAllSelections()
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedSessions.size > 0
                      ? `${selectedSessions.size} selected`
                      : "Select all"}
                  </span>
                </div>

                {selectedSessions.size > 0 && (
                  <Button
                    onClick={handleBulkSignOut}
                    disabled={bulkSignOutLoading}
                    variant="outline"
                    size="sm"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Sign Out Selected ({selectedSessions.size})
                  </Button>
                )}
              </div>

              <Button
                onClick={handleSignOutAll}
                disabled={
                  bulkSignOutLoading || data.activeSessions.length === 0
                }
                variant="destructive"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active-sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active-sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="session-details">Session Details</TabsTrigger>
        </TabsList>

        <TabsContent value="active-sessions" className="space-y-4">
          {data.activeSessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Active Sessions
                  </h3>
                  <p className="text-gray-500">
                    No staff members are currently signed in.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.activeSessions.map((session) => {
                const sessionStart = new Date(session.signed_in_at);
                const lastActivity = new Date(
                  session.activity.last_activity_at
                );
                const now = new Date();
                const sessionDuration = differenceInMinutes(now, sessionStart);
                const idleTime = differenceInMinutes(now, lastActivity);
                const isIdle = idleTime > 30;
                const isSelected = selectedSessions.has(session.id);
                const isSigningOut = signOutLoading.has(session.id);

                return (
                  <Card
                    key={session.id}
                    className={`${isSelected ? "ring-2 ring-blue-500" : ""}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSessionSelection(session.id)}
                            className="rounded"
                          />
                          <div>
                            <CardTitle className="text-lg">
                              {session.staff.first_name}{" "}
                              {session.staff.last_name}
                            </CardTitle>
                            <CardDescription>
                              <Badge variant="secondary">
                                {session.staff.role}
                              </Badge>
                              {isIdle && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-orange-600"
                                >
                                  Idle {idleTime}m
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                        </div>

                        <Button
                          onClick={() =>
                            handleSignOutStaff(
                              session.id,
                              `${session.staff.first_name} ${session.staff.last_name}`
                            )
                          }
                          disabled={isSigningOut}
                          variant="outline"
                          size="sm"
                        >
                          {isSigningOut ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Session Duration
                          </span>
                          <span className="font-medium">
                            {Math.floor(sessionDuration / 60)}h{" "}
                            {sessionDuration % 60}m
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Signed In</span>
                          <span className="font-medium">
                            {format(sessionStart, "MMM d, HH:mm")}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Last Activity</span>
                          <span className="font-medium">
                            {formatDistanceToNow(lastActivity, {
                              addSuffix: true,
                            })}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Actions Performed
                          </span>
                          <span className="font-medium">
                            {session.activity.actions_performed}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Page Visits</span>
                          <span className="font-medium">
                            {session.activity.page_visits}
                          </span>
                        </div>

                        {session.activity.idle_time_minutes > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Total Idle Time
                            </span>
                            <span className="font-medium text-orange-600">
                              {session.activity.idle_time_minutes}m
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="session-details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>
                Detailed view of all active sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Staff</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Duration</th>
                      <th className="text-left p-2">Actions</th>
                      <th className="text-left p-2">Page Visits</th>
                      <th className="text-left p-2">Last Activity</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activeSessions.map((session) => {
                      const sessionStart = new Date(session.signed_in_at);
                      const lastActivity = new Date(
                        session.activity.last_activity_at
                      );
                      const now = new Date();
                      const sessionDuration = differenceInMinutes(
                        now,
                        sessionStart
                      );
                      const idleTime = differenceInMinutes(now, lastActivity);
                      const isIdle = idleTime > 30;
                      const isSigningOut = signOutLoading.has(session.id);

                      return (
                        <tr
                          key={session.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-2 font-medium">
                            {session.staff.first_name} {session.staff.last_name}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">
                              {session.staff.role}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {Math.floor(sessionDuration / 60)}h{" "}
                            {sessionDuration % 60}m
                          </td>
                          <td className="p-2">
                            {session.activity.actions_performed}
                          </td>
                          <td className="p-2">
                            {session.activity.page_visits}
                          </td>
                          <td className="p-2 text-sm">
                            {formatDistanceToNow(lastActivity, {
                              addSuffix: true,
                            })}
                          </td>
                          <td className="p-2">
                            {isIdle ? (
                              <Badge
                                variant="outline"
                                className="text-orange-600"
                              >
                                Idle {idleTime}m
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-green-600"
                              >
                                Active
                              </Badge>
                            )}
                          </td>
                          <td className="p-2">
                            <Button
                              onClick={() =>
                                handleSignOutStaff(
                                  session.id,
                                  `${session.staff.first_name} ${session.staff.last_name}`
                                )
                              }
                              disabled={isSigningOut}
                              variant="outline"
                              size="sm"
                            >
                              {isSigningOut ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <LogOut className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
