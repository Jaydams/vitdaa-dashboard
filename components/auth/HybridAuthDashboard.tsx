"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Users,
  Clock,
  Activity,
  LogOut,
  Settings,
  AlertTriangle,
  CheckCircle,
  Monitor,
} from "lucide-react";
import HybridShiftManager from "./HybridShiftManager";

interface HybridAuthDashboardProps {
  adminSession: {
    token: string;
    admin_id: string;
    business_id: string;
  };
  business: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    email: string;
  };
  onLogout: () => void;
}

interface SessionSummary {
  total_admin_sessions: number;
  total_staff_sessions: number;
  total_sessions: number;
}

interface AdminSession {
  id: string;
  admin_email: string;
  created_at: string;
  last_activity: string;
  ip_address?: string;
}

interface StaffSession {
  id: string;
  staff_name: string;
  staff_role: string;
  shift_name: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  ip_address?: string;
}

export default function HybridAuthDashboard({
  adminSession,
  business,
  user,
  onLogout,
}: HybridAuthDashboardProps) {
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(
    null
  );
  const [adminSessions, setAdminSessions] = useState<AdminSession[]>([]);
  const [staffSessions, setStaffSessions] = useState<StaffSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessionData();

    // Refresh session data every 30 seconds
    const interval = setInterval(fetchSessionData, 30000);
    return () => clearInterval(interval);
  }, [adminSession.token]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(
        `/api/auth/hybrid/sessions/active?sessionToken=${adminSession.token}&businessId=${adminSession.business_id}`
      );
      const data = await response.json();

      if (data.success) {
        setSessionSummary(data.summary);
        setAdminSessions(data.sessions.admin_sessions || []);
        setStaffSessions(data.sessions.staff_sessions || []);
      }
    } catch (err) {
      console.error("Error fetching session data:", err);
      setError("Failed to fetch session data");
    }
  };

  const handleLogout = async (cascadeToStaff: boolean = true) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/hybrid/admin/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken: adminSession.token,
          cascadeToStaff,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear local storage
        localStorage.removeItem("hybrid_admin_session");
        onLogout();
      } else {
        throw new Error(data.error || "Logout failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Hybrid Auth Dashboard
                </h1>
                <p className="text-sm text-gray-600">{business.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.email}
                </div>
                <div className="text-xs text-gray-500">Administrator</div>
              </div>
              <Button
                onClick={() => handleLogout(true)}
                variant="outline"
                disabled={loading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Sessions
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sessionSummary?.total_sessions || 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Admin Sessions
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sessionSummary?.total_admin_sessions || 0}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Staff Sessions
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sessionSummary?.total_staff_sessions || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    System Status
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">
                      Active
                    </span>
                  </div>
                </div>
                <Monitor className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="shifts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shifts">Shift Management</TabsTrigger>
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
            <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="shifts">
            <HybridShiftManager
              adminSessionToken={adminSession.token}
              businessId={adminSession.business_id}
              businessName={business.name}
              onShiftChange={(shiftStatus) => {
                // Handle shift status changes
                console.log("Shift status changed:", shiftStatus);
              }}
            />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            {/* Admin Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Sessions ({adminSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {adminSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No admin sessions found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adminSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {session.admin_email}
                          </div>
                          <div className="text-sm text-gray-600">
                            Started: {formatDate(session.created_at)} • Last
                            active: {formatTime(session.last_activity)}
                          </div>
                          {session.ip_address && (
                            <div className="text-xs text-gray-500">
                              IP: {session.ip_address}
                            </div>
                          )}
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staff Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff Sessions ({staffSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {staffSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No staff currently logged in</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staffSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">
                                {session.staff_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {session.staff_role}
                              </div>
                            </div>
                            <Badge variant="outline">
                              {session.shift_name}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Started: {formatTime(session.created_at)} • Last
                            active: {formatTime(session.last_activity)} •
                            Expires: {formatTime(session.expires_at)}
                          </div>
                          {session.ip_address && (
                            <div className="text-xs text-gray-500">
                              IP: {session.ip_address}
                            </div>
                          )}
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Authentication System
                      </span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">
                          Operational
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Session Management
                      </span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">
                          Operational
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Shift Control</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">
                          Operational
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Database Connection
                      </span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">
                          Connected
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Security Gates
                      </span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">
                          All Active
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Audit Logging</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">
                          Recording
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Four-Layer Security
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Layer 1: Admin Authentication (Supabase Auth)</li>
                      <li>• Layer 2: Shift Control (Time-bound access)</li>
                      <li>• Layer 3: Staff PIN Authentication</li>
                      <li>• Layer 4: Session Management & Monitoring</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">
                      Security Features Active
                    </h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• PIN lockout after failed attempts</li>
                      <li>• Session expiration and cleanup</li>
                      <li>• IP address tracking</li>
                      <li>• Comprehensive audit logging</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
