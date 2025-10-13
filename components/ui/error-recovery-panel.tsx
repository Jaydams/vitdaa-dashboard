"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useOfflineManager } from "@/lib/offline-manager";
import { useErrorRecovery } from "@/lib/error-recovery-service";
import { toast } from "sonner";

interface ErrorRecoveryPanelProps {
  className?: string;
  showOfflineStatus?: boolean;
  showPendingActions?: boolean;
  showRecoveryOptions?: boolean;
}

export function ErrorRecoveryPanel({
  className = "",
  showOfflineStatus = true,
  showPendingActions = true,
  showRecoveryOptions = true,
}: ErrorRecoveryPanelProps) {
  const { isOnline, isSyncing, pendingActions, forceSync, clearQueue } =
    useOfflineManager();

  const { getStatus } = useErrorRecovery();
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    if (isSyncing) {
      // Simulate sync progress
      const interval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      return () => clearInterval(interval);
    } else {
      setSyncProgress(0);
    }
  }, [isSyncing]);

  const handleForceSync = async () => {
    try {
      await forceSync();
      toast.success("Sync completed successfully!");
    } catch (error) {
      toast.error("Sync failed. Please try again.");
    }
  };

  const handleClearQueue = () => {
    clearQueue();
    toast.info("Pending actions cleared.");
  };

  const handleExportPendingActions = () => {
    if (pendingActions.length === 0) {
      toast.warning("No pending actions to export.");
      return;
    }

    const data = JSON.stringify(pendingActions, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pending_actions_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Pending actions exported successfully.");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "retrying":
        return <RefreshCw className="h-4 w-4 text-orange-600 animate-spin" />;
      case "pending":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Network Status */}
      {showOfflineStatus && (
        <Card
          className={`${
            isOnline
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-red-800">Offline</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <p
                className={`text-sm ${
                  isOnline ? "text-green-700" : "text-red-700"
                }`}
              >
                {isOnline
                  ? "Connected to server. All features available."
                  : "Working offline. Actions will sync when connection is restored."}
              </p>
              {!isOnline && pendingActions.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {pendingActions.length} pending
                </Badge>
              )}
            </div>

            {isSyncing && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700">Syncing...</span>
                  <span className="text-blue-600">
                    {Math.round(syncProgress)}%
                  </span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Actions */}
      {showPendingActions && pendingActions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Pending Actions ({pendingActions.length})</span>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportPendingActions}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
                {isOnline && (
                  <Button
                    onClick={handleForceSync}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={isSyncing}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Sync
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingActions.slice(0, 10).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(action.status)}
                    <span className="text-sm font-medium truncate">
                      {action.type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(action.priority)}`}
                    >
                      {action.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {action.currentRetries > 0 && (
                      <span>
                        Retry {action.currentRetries}/{action.maxRetries}
                      </span>
                    )}
                    <span>
                      {new Date(action.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {pendingActions.length > 10 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  ... and {pendingActions.length - 10} more actions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovery Options */}
      {showRecoveryOptions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4" />
              Recovery Options
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>

              {pendingActions.length > 0 && (
                <Button
                  onClick={handleClearQueue}
                  variant="outline"
                  size="sm"
                  className="justify-start text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear Queue
                </Button>
              )}

              {isOnline && pendingActions.length > 0 && (
                <Button
                  onClick={handleForceSync}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  disabled={isSyncing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Force Sync
                </Button>
              )}

              <Button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                variant="outline"
                size="sm"
                className="justify-start text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reset Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Compact version for dashboard headers
 */
export function ErrorRecoveryIndicator() {
  const { isOnline, pendingActions, isSyncing } = useOfflineManager();

  if (isOnline && pendingActions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200"
        >
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )}

      {pendingActions.length > 0 && (
        <Badge
          variant="outline"
          className="bg-orange-50 text-orange-700 border-orange-200"
        >
          <Clock className="h-3 w-3 mr-1" />
          {pendingActions.length} pending
        </Badge>
      )}

      {isSyncing && (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Syncing
        </Badge>
      )}
    </div>
  );
}

/**
 * Hook for error recovery status
 */
export function useErrorRecoveryStatus() {
  const { isOnline, pendingActions, isSyncing } = useOfflineManager();

  return {
    isOnline,
    hasPendingActions: pendingActions.length > 0,
    pendingCount: pendingActions.length,
    isSyncing,
    hasIssues: !isOnline || pendingActions.length > 0,
  };
}
