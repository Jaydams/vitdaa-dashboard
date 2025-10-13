"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Settings,
  Activity,
  Shield,
  Database,
  Users,
  AlertCircle,
} from "lucide-react";
import { useErrorRecoveryContext } from "@/components/providers/ErrorRecoveryProvider";
import {
  ErrorRecoveryPanel,
  ErrorRecoveryIndicator,
} from "@/components/ui/error-recovery-panel";
import { toast } from "sonner";

interface ErrorRecoveryDashboardProps {
  className?: string;
  showInHeader?: boolean;
}

export function ErrorRecoveryDashboard({
  className = "",
  showInHeader = false,
}: ErrorRecoveryDashboardProps) {
  const {
    isOnline,
    isSyncing,
    pendingActions,
    session,
    timeUntilExpiry,
    isSessionValid,
    hasIssues,
    issueCount,
    forceSync,
    extendSession,
  } = useErrorRecoveryContext();

  const [activeTab, setActiveTab] = useState("overview");

  if (showInHeader) {
    return <ErrorRecoveryIndicator />;
  }

  const formatTimeRemaining = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getSessionStatusColor = () => {
    if (!isSessionValid) return "text-red-600";
    if (timeUntilExpiry < 5 * 60 * 1000) return "text-orange-600"; // Less than 5 minutes
    if (timeUntilExpiry < 30 * 60 * 1000) return "text-yellow-600"; // Less than 30 minutes
    return "text-green-600";
  };

  const handleExtendSession = async () => {
    try {
      await extendSession(30);
      toast.success("Session extended by 30 minutes");
    } catch (error) {
      toast.error("Failed to extend session");
    }
  };

  const handleForceSync = async () => {
    try {
      await forceSync();
      toast.success("Sync completed successfully");
    } catch (error) {
      toast.error("Sync failed. Please try again.");
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </div>
            {hasIssues && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {issueCount} Issue{issueCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Network Status */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="font-medium text-sm">Network</p>
                <p
                  className={`text-xs ${
                    isOnline ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isOnline ? "Connected" : "Offline"}
                </p>
              </div>
            </div>

            {/* Session Status */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Users className={`h-5 w-5 ${getSessionStatusColor()}`} />
              <div>
                <p className="font-medium text-sm">Session</p>
                <p className={`text-xs ${getSessionStatusColor()}`}>
                  {isSessionValid
                    ? `${formatTimeRemaining(timeUntilExpiry)} remaining`
                    : "Expired"}
                </p>
              </div>
            </div>

            {/* Sync Status */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {isSyncing ? (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              ) : pendingActions.length > 0 ? (
                <Clock className="h-5 w-5 text-orange-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <div>
                <p className="font-medium text-sm">Sync</p>
                <p className="text-xs text-gray-600">
                  {isSyncing
                    ? "Syncing..."
                    : pendingActions.length > 0
                    ? `${pendingActions.length} pending`
                    : "Up to date"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="offline">Offline</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ErrorRecoveryPanel
            showOfflineStatus={true}
            showPendingActions={true}
            showRecoveryOptions={true}
          />
        </TabsContent>

        <TabsContent value="session" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Session Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-600">Staff ID</p>
                      <p>{session.staffId}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Role</p>
                      <p className="capitalize">{session.role}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Session ID</p>
                      <p className="font-mono text-xs">{session.sessionId}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Device ID</p>
                      <p className="font-mono text-xs">{session.deviceId}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">Session Expiry</p>
                      <Badge
                        variant={isSessionValid ? "default" : "destructive"}
                        className={
                          isSessionValid ? getSessionStatusColor() : ""
                        }
                      >
                        {isSessionValid
                          ? formatTimeRemaining(timeUntilExpiry)
                          : "Expired"}
                      </Badge>
                    </div>

                    {isSessionValid && (
                      <div className="space-y-2">
                        <Progress
                          value={Math.max(
                            0,
                            Math.min(
                              100,
                              (timeUntilExpiry / (2 * 60 * 60 * 1000)) * 100
                            )
                          )}
                          className="h-2"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleExtendSession}
                            size="sm"
                            variant="outline"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Extend 30 min
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active session</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Offline Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <Wifi className="h-5 w-5 text-green-600" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">Connection Status</p>
                    <p className="text-sm text-gray-600">
                      {isOnline
                        ? "Online - All features available"
                        : "Offline - Limited functionality"}
                    </p>
                  </div>
                </div>
              </div>

              {pendingActions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      Pending Actions ({pendingActions.length})
                    </h4>
                    {isOnline && (
                      <Button
                        onClick={handleForceSync}
                        size="sm"
                        variant="outline"
                        disabled={isSyncing}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Sync Now
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pendingActions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {action.status === "pending" && (
                            <Clock className="h-4 w-4 text-blue-600" />
                          )}
                          {action.status === "retrying" && (
                            <RefreshCw className="h-4 w-4 text-orange-600 animate-spin" />
                          )}
                          {action.status === "failed" && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          {action.status === "completed" && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}

                          <div>
                            <p className="font-medium text-sm">
                              {action.type
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(action.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              action.priority === "critical"
                                ? "border-red-200 text-red-700"
                                : action.priority === "high"
                                ? "border-orange-200 text-orange-700"
                                : action.priority === "normal"
                                ? "border-blue-200 text-blue-700"
                                : "border-gray-200 text-gray-700"
                            }
                          >
                            {action.priority}
                          </Badge>
                          {action.currentRetries > 0 && (
                            <span className="text-xs text-gray-500">
                              {action.currentRetries}/{action.maxRetries}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingActions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All actions are synchronized</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recovery Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="justify-start h-auto p-4"
                >
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium">Refresh Page</p>
                      <p className="text-xs text-gray-500">
                        Reload the entire application
                      </p>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  variant="outline"
                  className="justify-start h-auto p-4 text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium">Reset Cache</p>
                      <p className="text-xs text-gray-500">
                        Clear all cached data
                      </p>
                    </div>
                  </div>
                </Button>

                {isOnline && pendingActions.length > 0 && (
                  <Button
                    onClick={handleForceSync}
                    variant="outline"
                    className="justify-start h-auto p-4"
                    disabled={isSyncing}
                  >
                    <div className="flex items-start gap-3">
                      <Upload className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <p className="font-medium">Force Sync</p>
                        <p className="text-xs text-gray-500">
                          Sync all pending actions
                        </p>
                      </div>
                    </div>
                  </Button>
                )}

                {session && isSessionValid && (
                  <Button
                    onClick={handleExtendSession}
                    variant="outline"
                    className="justify-start h-auto p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <p className="font-medium">Extend Session</p>
                        <p className="text-xs text-gray-500">
                          Add 30 minutes to session
                        </p>
                      </div>
                    </div>
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">System Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600">Browser</p>
                    <p>{navigator.userAgent.split(" ")[0]}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Platform</p>
                    <p>{navigator.platform}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Online</p>
                    <p>{navigator.onLine ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Local Time</p>
                    <p>{new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
