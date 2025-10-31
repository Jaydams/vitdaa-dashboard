"use client";

import React from "react";
import {
  MonitoringProvider,
  useMonitoring,
  useComponentMonitoring,
} from "@/components/monitoring/MonitoringProvider";
import { PerformanceMonitoringDashboard } from "@/components/monitoring/PerformanceMonitoringDashboard";
import { EnhancedReceptionDashboard } from "@/components/staff/EnhancedReceptionDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, CheckCircle } from "lucide-react";

interface MonitoredReceptionDashboardProps {
  businessId: string;
  staffId?: string;
  staffName?: string;
  staffRole?: string;
  sessionId?: string;
}

/**
 * Example component showing how to integrate audit logging and performance monitoring
 * with the reception dashboard
 */
function ReceptionDashboardWithMonitoring({
  businessId,
  staffId,
  staffName,
  staffRole,
  sessionId,
}: MonitoredReceptionDashboardProps) {
  const {
    auditLogging,
    performanceMetrics,
    systemHealth,
    clearPerformanceMetrics,
    refreshMetrics,
    isMonitoringEnabled,
    setMonitoringEnabled,
  } = useMonitoring();

  const { measureOperation, measureSyncOperation } =
    useComponentMonitoring("ReceptionDashboard");

  // Example of logging a custom action
  const handleCustomAction = async () => {
    await measureOperation("custom_action", async () => {
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Log the action
      await auditLogging.logSystemError(
        "custom_dashboard_action",
        "Staff performed a custom action on the dashboard",
        "user_interaction"
      );
    });
  };

  // Example of measuring a synchronous operation
  const handleSyncAction = () => {
    measureSyncOperation("sync_action", () => {
      // Simulate synchronous work
      const result = Array.from({ length: 1000 }, (_, i) => i * 2);
      return result.length;
    });
  };

  return (
    <div className="space-y-6">
      {/* System Health Status Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">System Status</CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  systemHealth.isHealthy
                    ? "default"
                    : systemHealth.hasCriticalIssues
                    ? "destructive"
                    : "secondary"
                }
                className="flex items-center gap-1"
              >
                {systemHealth.isHealthy && <CheckCircle className="w-3 h-3" />}
                {systemHealth.hasWarnings && (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {systemHealth.hasCriticalIssues && (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {systemHealth.isHealthy
                  ? "Healthy"
                  : systemHealth.hasCriticalIssues
                  ? "Critical"
                  : "Warning"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonitoringEnabled(!isMonitoringEnabled)}
              >
                <Activity className="w-4 h-4 mr-1" />
                {isMonitoringEnabled ? "Disable" : "Enable"} Monitoring
              </Button>
            </div>
          </div>
        </CardHeader>
        {systemHealth.alerts.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-1">
              {systemHealth.alerts.slice(0, 3).map((alert, index) => (
                <div
                  key={index}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {alert}
                </div>
              ))}
              {systemHealth.alerts.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{systemHealth.alerts.length - 3} more alerts
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Dashboard with Monitoring Tab */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Reception Dashboard</TabsTrigger>
          <TabsTrigger value="monitoring">Performance Monitoring</TabsTrigger>
          <TabsTrigger value="examples">Example Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <EnhancedReceptionDashboard
            businessId={businessId}
            staffId={staffId}
            staffName={staffName}
            staffRole={staffRole}
          />
        </TabsContent>

        <TabsContent value="monitoring">
          <PerformanceMonitoringDashboard
            businessId={businessId}
            performanceMetrics={performanceMetrics}
            onClearMetrics={clearPerformanceMetrics}
            onRefreshMetrics={refreshMetrics}
          />
        </TabsContent>

        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <CardTitle>Example Monitored Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={handleCustomAction} className="w-full">
                  Perform Async Action (Monitored)
                </Button>
                <Button
                  onClick={handleSyncAction}
                  variant="outline"
                  className="w-full"
                >
                  Perform Sync Action (Monitored)
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  These buttons demonstrate how to use the monitoring system:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Actions are automatically timed and logged</li>
                  <li>Performance metrics are collected and stored</li>
                  <li>Audit logs are created for all activities</li>
                  <li>System health is continuously monitored</li>
                </ul>
              </div>

              <div className="border rounded p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Recent Performance Metrics</h4>
                <div className="text-sm space-y-1">
                  <div>Total Operations: {performanceMetrics.length}</div>
                  <div>
                    Average Duration:{" "}
                    {performanceMetrics.length > 0
                      ? (
                          performanceMetrics.reduce(
                            (sum, m) => sum + m.duration,
                            0
                          ) / performanceMetrics.length
                        ).toFixed(2)
                      : 0}
                    ms
                  </div>
                  <div>
                    Error Rate:{" "}
                    {performanceMetrics.length > 0
                      ? (
                          (performanceMetrics.reduce(
                            (sum, m) => sum + (m.errorCount || 0),
                            0
                          ) /
                            performanceMetrics.length) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
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

/**
 * Main component that wraps the dashboard with monitoring provider
 */
export function MonitoredReceptionDashboard(
  props: MonitoredReceptionDashboardProps
) {
  return (
    <MonitoringProvider
      businessId={props.businessId}
      staffId={props.staffId}
      staffName={props.staffName}
      staffRole={props.staffRole}
      sessionId={props.sessionId}
      enablePerformanceMonitoring={true}
    >
      <ReceptionDashboardWithMonitoring {...props} />
    </MonitoringProvider>
  );
}

export default MonitoredReceptionDashboard;
