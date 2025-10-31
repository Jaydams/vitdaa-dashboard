"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  Clock,
  Database,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { PerformanceMetrics } from "@/lib/audit-logger";

interface SystemHealthMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  networkStatus: {
    isOnline: boolean;
    latency?: number;
    lastCheck: Date;
  };
  stateManagement: {
    operationsPerSecond: number;
    averageOperationTime: number;
    errorRate: number;
    queueSize: number;
  };
  realTimeSync: {
    isConnected: boolean;
    lastSync: Date;
    syncErrors: number;
    pendingOperations: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
  timestamp: Date;
  resolved: boolean;
}

interface PerformanceMonitoringDashboardProps {
  businessId: string;
  performanceMetrics: PerformanceMetrics[];
  onClearMetrics: () => void;
  onRefreshMetrics: () => void;
}

export function PerformanceMonitoringDashboard({
  businessId,
  performanceMetrics,
  onClearMetrics,
  onRefreshMetrics,
}: PerformanceMonitoringDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics>({
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    networkStatus: { isOnline: navigator.onLine, lastCheck: new Date() },
    stateManagement: {
      operationsPerSecond: 0,
      averageOperationTime: 0,
      errorRate: 0,
      queueSize: 0,
    },
    realTimeSync: {
      isConnected: false,
      lastSync: new Date(),
      syncErrors: 0,
      pendingOperations: 0,
    },
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Calculate performance statistics
  const performanceStats = React.useMemo(() => {
    if (performanceMetrics.length === 0) {
      return {
        averageDuration: 0,
        totalOperations: 0,
        errorRate: 0,
        slowestOperation: null,
        fastestOperation: null,
        operationTypes: {},
      };
    }

    const totalDuration = performanceMetrics.reduce(
      (sum, metric) => sum + metric.duration,
      0
    );
    const totalErrors = performanceMetrics.reduce(
      (sum, metric) => sum + (metric.errorCount || 0),
      0
    );
    const averageDuration = totalDuration / performanceMetrics.length;
    const errorRate = (totalErrors / performanceMetrics.length) * 100;

    const sortedByDuration = [...performanceMetrics].sort(
      (a, b) => a.duration - b.duration
    );
    const slowestOperation = sortedByDuration[sortedByDuration.length - 1];
    const fastestOperation = sortedByDuration[0];

    const operationTypes = performanceMetrics.reduce((acc, metric) => {
      acc[metric.operationType] = (acc[metric.operationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      averageDuration,
      totalOperations: performanceMetrics.length,
      errorRate,
      slowestOperation,
      fastestOperation,
      operationTypes,
    };
  }, [performanceMetrics]);

  // Monitor system health
  const updateSystemHealth = useCallback(async () => {
    try {
      // Memory usage
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo
        ? {
            used: memoryInfo.usedJSHeapSize,
            total: memoryInfo.totalJSHeapSize,
            percentage:
              (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100,
          }
        : { used: 0, total: 0, percentage: 0 };

      // Network status
      const networkStatus = {
        isOnline: navigator.onLine,
        lastCheck: new Date(),
        latency: await measureNetworkLatency(),
      };

      // State management metrics (from recent performance data)
      const recentMetrics = performanceMetrics.slice(-10);
      const stateManagement = {
        operationsPerSecond:
          recentMetrics.length > 0 ? recentMetrics.length / 10 : 0,
        averageOperationTime:
          recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
              recentMetrics.length
            : 0,
        errorRate:
          recentMetrics.length > 0
            ? (recentMetrics.reduce((sum, m) => sum + (m.errorCount || 0), 0) /
                recentMetrics.length) *
              100
            : 0,
        queueSize: 0, // This would come from the order store
      };

      // Real-time sync status
      const realTimeSync = {
        isConnected: networkStatus.isOnline,
        lastSync: new Date(),
        syncErrors: 0,
        pendingOperations: 0,
      };

      setSystemHealth({
        memoryUsage,
        networkStatus,
        stateManagement,
        realTimeSync,
      });

      // Generate alerts based on thresholds
      generatePerformanceAlerts(memoryUsage, stateManagement, networkStatus);
    } catch (error) {
      console.error("Error updating system health:", error);
    }
  }, [performanceMetrics]);

  // Measure network latency
  const measureNetworkLatency = async (): Promise<number> => {
    try {
      const start = performance.now();
      await fetch("/api/health", { method: "HEAD" });
      const end = performance.now();
      return end - start;
    } catch {
      return -1; // Network error
    }
  };

  // Generate performance alerts
  const generatePerformanceAlerts = (
    memory: SystemHealthMetrics["memoryUsage"],
    stateManagement: SystemHealthMetrics["stateManagement"],
    network: SystemHealthMetrics["networkStatus"]
  ) => {
    const newAlerts: PerformanceAlert[] = [];

    // Memory usage alerts
    if (memory.percentage > 90) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: "error",
        message: `High memory usage: ${memory.percentage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
      });
    } else if (memory.percentage > 75) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: "warning",
        message: `Elevated memory usage: ${memory.percentage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Performance alerts
    if (stateManagement.averageOperationTime > 1000) {
      newAlerts.push({
        id: `performance-${Date.now()}`,
        type: "warning",
        message: `Slow operations detected: ${stateManagement.averageOperationTime.toFixed(
          0
        )}ms average`,
        timestamp: new Date(),
        resolved: false,
      });
    }

    if (stateManagement.errorRate > 10) {
      newAlerts.push({
        id: `errors-${Date.now()}`,
        type: "error",
        message: `High error rate: ${stateManagement.errorRate.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Network alerts
    if (!network.isOnline) {
      newAlerts.push({
        id: `network-${Date.now()}`,
        type: "error",
        message: "Network connection lost",
        timestamp: new Date(),
        resolved: false,
      });
    } else if (network.latency && network.latency > 2000) {
      newAlerts.push({
        id: `latency-${Date.now()}`,
        type: "warning",
        message: `High network latency: ${network.latency.toFixed(0)}ms`,
        timestamp: new Date(),
        resolved: false,
      });
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...prev.slice(-10), ...newAlerts]); // Keep last 10 alerts
    }
  };

  // Start/stop monitoring
  useEffect(() => {
    if (isMonitoring) {
      updateSystemHealth();
      const interval = setInterval(updateSystemHealth, 5000); // Update every 5 seconds
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [isMonitoring, updateSystemHealth]);

  const resolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const getHealthStatus = () => {
    const { memoryUsage, networkStatus, stateManagement } = systemHealth;

    if (
      !networkStatus.isOnline ||
      memoryUsage.percentage > 90 ||
      stateManagement.errorRate > 10
    ) {
      return { status: "error", color: "text-red-500" };
    }

    if (
      memoryUsage.percentage > 75 ||
      stateManagement.averageOperationTime > 1000
    ) {
      return { status: "warning", color: "text-yellow-500" };
    }

    return { status: "healthy", color: "text-green-500" };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              healthStatus.status === "healthy" ? "default" : "destructive"
            }
          >
            {healthStatus.status === "healthy" && (
              <CheckCircle className="w-3 h-3 mr-1" />
            )}
            {healthStatus.status === "warning" && (
              <AlertTriangle className="w-3 h-3 mr-1" />
            )}
            {healthStatus.status === "error" && (
              <AlertTriangle className="w-3 h-3 mr-1" />
            )}
            {healthStatus.status.toUpperCase()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm" onClick={onRefreshMetrics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.filter((alert) => !alert.resolved).length > 0 && (
        <div className="space-y-2">
          {alerts
            .filter((alert) => !alert.resolved)
            .slice(-3)
            .map((alert) => (
              <Alert
                key={alert.id}
                variant={alert.type === "error" ? "destructive" : "default"}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          {alerts.filter((alert) => !alert.resolved).length > 3 && (
            <Button variant="outline" size="sm" onClick={clearAllAlerts}>
              Clear All Alerts
            </Button>
          )}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Memory Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Memory Usage
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth.memoryUsage.percentage.toFixed(1)}%
                </div>
                <Progress
                  value={systemHealth.memoryUsage.percentage}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(systemHealth.memoryUsage.used / 1024 / 1024).toFixed(1)}MB
                  used
                </p>
              </CardContent>
            </Card>

            {/* Network Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network</CardTitle>
                {systemHealth.networkStatus.isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth.networkStatus.isOnline ? "Online" : "Offline"}
                </div>
                {systemHealth.networkStatus.latency && (
                  <p className="text-xs text-muted-foreground">
                    Latency: {systemHealth.networkStatus.latency.toFixed(0)}ms
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Operations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Operations
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceStats.totalOperations}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {performanceStats.averageDuration.toFixed(0)}ms
                </p>
              </CardContent>
            </Card>

            {/* Error Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Error Rate
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceStats.errorRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {performanceStats.totalOperations > 0
                    ? "Last 100 operations"
                    : "No data"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Operation Performance</CardTitle>
                <CardDescription>
                  Average duration by operation type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(performanceStats.operationTypes).map(
                    ([type, count]) => {
                      const typeMetrics = performanceMetrics.filter(
                        (m) => m.operationType === type
                      );
                      const avgDuration =
                        typeMetrics.reduce((sum, m) => sum + m.duration, 0) /
                        typeMetrics.length;

                      return (
                        <div
                          key={type}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium">{type}</span>
                          <div className="text-right">
                            <div className="text-sm">
                              {avgDuration.toFixed(0)}ms
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {count} ops
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Recent performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fastest Operation</span>
                    <div className="text-right">
                      {performanceStats.fastestOperation ? (
                        <>
                          <div className="text-sm font-medium">
                            {performanceStats.fastestOperation.duration.toFixed(
                              0
                            )}
                            ms
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {performanceStats.fastestOperation.operationType}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No data
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Slowest Operation</span>
                    <div className="text-right">
                      {performanceStats.slowestOperation ? (
                        <>
                          <div className="text-sm font-medium">
                            {performanceStats.slowestOperation.duration.toFixed(
                              0
                            )}
                            ms
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {performanceStats.slowestOperation.operationType}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No data
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Operations/sec</span>
                    <div className="text-sm font-medium">
                      {systemHealth.stateManagement.operationsPerSecond.toFixed(
                        1
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>
                  Current system resource utilization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>
                      {systemHealth.memoryUsage.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={systemHealth.memoryUsage.percentage} />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Error Rate</span>
                    <span>
                      {systemHealth.stateManagement.errorRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      systemHealth.stateManagement.errorRate,
                      100
                    )}
                    className={
                      systemHealth.stateManagement.errorRate > 10
                        ? "bg-red-100"
                        : ""
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-time Sync</CardTitle>
                <CardDescription>
                  Synchronization status and metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection Status</span>
                  <Badge
                    variant={
                      systemHealth.realTimeSync.isConnected
                        ? "default"
                        : "destructive"
                    }
                  >
                    {systemHealth.realTimeSync.isConnected
                      ? "Connected"
                      : "Disconnected"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Sync</span>
                  <span className="text-sm text-muted-foreground">
                    {systemHealth.realTimeSync.lastSync.toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Operations</span>
                  <span className="text-sm font-medium">
                    {systemHealth.realTimeSync.pendingOperations}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Operations</CardTitle>
                <CardDescription>
                  Last {performanceMetrics.length} operations with performance
                  data
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={onClearMetrics}>
                Clear Data
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {performanceMetrics
                  .slice(-20)
                  .reverse()
                  .map((metric, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <span className="text-sm font-medium">
                          {metric.operationType}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {metric.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {metric.duration.toFixed(0)}ms
                        </span>
                        {metric.errorCount && metric.errorCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {metric.errorCount} errors
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                {performanceMetrics.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No performance data available
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
