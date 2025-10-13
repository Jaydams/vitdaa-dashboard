"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Clock,
  Shield,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Monitor,
  Save,
  Download,
  Upload,
} from "lucide-react";
import { useErrorRecoveryContext } from "@/components/providers/ErrorRecoveryProvider";
import { useSessionState } from "@/lib/session-state-manager";
import { useAutoReauth } from "@/lib/auto-reauth-service";
import { SessionExpiryWarning } from "@/components/ui/session-expiry-warning";
import {
  SessionConflictDialog,
  useSessionConflictDialog,
} from "@/components/ui/session-conflict-dialog";
import { toast } from "sonner";

interface SessionManagementDashboardProps {
  className?: string;
}

export function SessionManagementDashboard({
  className = "",
}: SessionManagementDashboardProps) {
  const {
    session,
    timeUntilExpiry,
    isSessionValid,
    extendSession,
    isReauthenticating,
    saveComponentWork,
    getComponentWork,
    createStateSnapshot,
    restoreStateSnapshot,
  } = useErrorRecoveryContext();

  const { workInProgress, snapshot } = useSessionState();
  const { reauthHistory, lastAttempt } = useAutoReauth();
  const { conflict, isOpen, showConflict, hideConflict } =
    useSessionConflictDialog();

  const [activeTab, setActiveTab] = useState("overview");
  const [isExtending, setIsExtending] = useState(false);

  const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
  const hoursUntilExpiry = Math.floor(minutesUntilExpiry / 60);

  const handleExtendSession = async (minutes: number) => {
    setIsExtending(true);
    try {
      await extendSession(minutes);
      toast.success(`Session extended by ${minutes} minutes`);
    } catch (error) {
      toast.error("Failed to extend session");
    } finally {
      setIsExtending(false);
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      const snapshot = createStateSnapshot();
      if (snapshot) {
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session_snapshot_${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Session snapshot saved");
      }
    } catch (error) {
      toast.error("Failed to save session snapshot");
    }
  };

  const handleRestoreSnapshot = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      await restoreStateSnapshot(snapshot);
      toast.success("Session snapshot restored");
    } catch (error) {
      toast.error("Failed to restore session snapshot");
    }
  };

  const getSessionStatusColor = () => {
    if (!isSessionValid) return "text-red-600";
    if (minutesUntilExpiry < 5) return "text-red-600";
    if (minutesUntilExpiry < 15) return "text-orange-600";
    if (minutesUntilExpiry < 60) return "text-yellow-600";
    return "text-green-600";
  };

  const getSessionStatusBadge = () => {
    if (!isSessionValid)
      return { variant: "destructive" as const, text: "Expired" };
    if (minutesUntilExpiry < 5)
      return { variant: "destructive" as const, text: "Critical" };
    if (minutesUntilExpiry < 15)
      return { variant: "secondary" as const, text: "Warning" };
    return { variant: "default" as const, text: "Active" };
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (!session) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-gray-500">No active session</p>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = getSessionStatusBadge();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Session Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Session Management
            </div>
            <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Session Info */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Staff Details</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">ID:</span> {session.staffId}
                </p>
                <p>
                  <span className="font-medium">Role:</span>{" "}
                  <span className="capitalize">{session.role}</span>
                </p>
                <p>
                  <span className="font-medium">Business:</span>{" "}
                  {session.businessId}
                </p>
              </div>
            </div>

            {/* Session Status */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">
                Session Status
              </p>
              <div className="space-y-1 text-sm">
                <p className={`font-medium ${getSessionStatusColor()}`}>
                  {isSessionValid
                    ? `${formatDuration(timeUntilExpiry)} remaining`
                    : "Expired"}
                </p>
                <p>
                  <span className="font-medium">Expires:</span>{" "}
                  {new Date(session.expiresAt).toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Device:</span>{" "}
                  {session.deviceId.split("_")[0]}
                </p>
              </div>
            </div>

            {/* Re-auth Status */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">
                Authentication
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {isReauthenticating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-blue-600">
                        Re-authenticating...
                      </span>
                    </>
                  ) : lastAttempt?.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Auto-renewed</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 text-gray-600" />
                      <span>Active</span>
                    </>
                  )}
                </div>
                {lastAttempt && (
                  <p className="text-xs text-gray-500">
                    Last attempt:{" "}
                    {new Date(lastAttempt.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Session Progress */}
          {isSessionValid && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Session Progress</p>
                <p className="text-sm text-gray-600">
                  {Math.round((timeUntilExpiry / (2 * 60 * 60 * 1000)) * 100)}%
                  remaining
                </p>
              </div>
              <Progress
                value={Math.max(
                  0,
                  Math.min(100, (timeUntilExpiry / (2 * 60 * 60 * 1000)) * 100)
                )}
                className="h-2"
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleExtendSession(30)}
              size="sm"
              disabled={isExtending || !isSessionValid}
            >
              {isExtending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Extend 30min
            </Button>

            <Button
              onClick={() => handleExtendSession(60)}
              size="sm"
              variant="outline"
              disabled={isExtending || !isSessionValid}
            >
              Extend 1hr
            </Button>

            <Button onClick={handleSaveSnapshot} size="sm" variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save State
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Expiry Warning */}
      {isSessionValid && minutesUntilExpiry <= 10 && <SessionExpiryWarning />}

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="work">Work Progress</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="state">State Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Session ID</p>
                  <p className="font-mono text-xs break-all">
                    {session.sessionId}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Created</p>
                  <p>{new Date(session.lastActivity).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Last Activity</p>
                  <p>{new Date(session.lastActivity).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Device ID</p>
                  <p className="font-mono text-xs break-all">
                    {session.deviceId}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Work in Progress ({workInProgress.length})
                <Button
                  onClick={() => {
                    const testWork = saveComponentWork("test_component", {
                      test: "data",
                    });
                    toast.success(`Test work saved: ${testWork}`);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Test Save
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workInProgress.length > 0 ? (
                <div className="space-y-3">
                  {workInProgress.map((work) => (
                    <div
                      key={work.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{work.component}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(work.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            work.priority === "critical"
                              ? "border-red-200 text-red-700"
                              : work.priority === "high"
                              ? "border-orange-200 text-orange-700"
                              : work.priority === "normal"
                              ? "border-blue-200 text-blue-700"
                              : "border-gray-200 text-gray-700"
                          }
                        >
                          {work.priority}
                        </Badge>
                        {work.autoSave && (
                          <Badge variant="outline" className="text-xs">
                            Auto-save
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Save className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No work in progress</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication History</CardTitle>
            </CardHeader>
            <CardContent>
              {reauthHistory.length > 0 ? (
                <div className="space-y-3">
                  {reauthHistory.slice(-10).map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {attempt.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium text-sm capitalize">
                            {attempt.method.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(attempt.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p
                          className={
                            attempt.success ? "text-green-600" : "text-red-600"
                          }
                        >
                          {attempt.success ? "Success" : "Failed"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attempt.duration}ms
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No authentication attempts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="state" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>State Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={handleSaveSnapshot}
                  variant="outline"
                  className="justify-start h-auto p-4"
                >
                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium">Export Snapshot</p>
                      <p className="text-xs text-gray-500">
                        Save current session state
                      </p>
                    </div>
                  </div>
                </Button>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreSnapshot}
                    className="hidden"
                  />
                  <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50">
                    <Upload className="h-5 w-5 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium">Import Snapshot</p>
                      <p className="text-xs text-gray-500">
                        Restore session state
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {snapshot && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm mb-2">Current Snapshot</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-600">Timestamp</p>
                      <p>{new Date(snapshot.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Work Items</p>
                      <p>{snapshot.workInProgress.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Session Conflict Dialog */}
      <SessionConflictDialog
        conflict={conflict}
        isOpen={isOpen}
        onResolve={async (resolution) => {
          // Handle conflict resolution
          console.log("Resolving conflict:", resolution);
        }}
        onClose={hideConflict}
      />
    </div>
  );
}
