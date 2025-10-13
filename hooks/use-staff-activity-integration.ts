import React, { useEffect, useCallback } from "react";
import { useActivityLogging } from "./use-activity-logging";
import {
  createDashboardActivityService,
  DashboardActionTemplates,
} from "@/lib/dashboard-activity-service";

interface StaffActivityIntegrationProps {
  staff_id: string;
  staff_session_id?: string;
  business_id: string;
  dashboard_type: "reception" | "kitchen" | "bar" | "accountant" | "admin";
}

/**
 * Hook to integrate activity logging into existing dashboard components
 */
export function useStaffActivityIntegration({
  staff_id,
  staff_session_id,
  business_id,
  dashboard_type,
}: StaffActivityIntegrationProps) {
  const activityLogger = useActivityLogging({
    staff_id,
    staff_session_id,
    business_id,
  });

  const dashboardService = createDashboardActivityService({
    staff_id,
    staff_session_id,
    business_id,
    dashboard_type,
  });

  // Log dashboard access on mount
  useEffect(() => {
    activityLogger.logDashboardAccess(dashboard_type, {
      access_time: new Date().toISOString(),
      user_agent: navigator.userAgent,
    });
  }, [activityLogger, dashboard_type]);

  // Enhanced logging functions for specific dashboard actions
  const logOrderAction = useCallback(
    async (
      action: "create" | "update" | "status_change",
      orderId: string,
      orderData?: any
    ) => {
      try {
        const actionName =
          action === "create"
            ? "create_order"
            : action === "update"
            ? "update_order"
            : "change_order_status";

        await dashboardService.logAction({
          action_name: actionName,
          resource_id: orderId,
          resource_type: "order",
          action_data: orderData,
          success: true,
        });
      } catch (error) {
        console.error("Failed to log order action:", error);
      }
    },
    [dashboardService]
  );

  const logPaymentAction = useCallback(
    async (
      action: "process" | "refund",
      paymentId: string,
      paymentData?: any
    ) => {
      try {
        const actionName =
          action === "process" ? "process_payment" : "refund_payment";

        await dashboardService.logAction({
          action_name: actionName,
          resource_id: paymentId,
          resource_type: "payment",
          action_data: paymentData,
          success: true,
        });
      } catch (error) {
        console.error("Failed to log payment action:", error);
      }
    },
    [dashboardService]
  );

  const logInventoryAction = useCallback(
    async (
      action: "request" | "approve" | "deny" | "update",
      inventoryId: string,
      inventoryData?: any
    ) => {
      try {
        const actionName =
          action === "request"
            ? "request_inventory"
            : action === "approve"
            ? "approve_inventory_request"
            : action === "deny"
            ? "deny_inventory_request"
            : "update_inventory";

        await dashboardService.logAction({
          action_name: actionName,
          resource_id: inventoryId,
          resource_type:
            action === "request" ? "inventory_request" : "inventory_item",
          action_data: inventoryData,
          success: true,
        });
      } catch (error) {
        console.error("Failed to log inventory action:", error);
      }
    },
    [dashboardService]
  );

  const logTableAction = useCallback(
    async (action: "assign" | "release", tableId: string, tableData?: any) => {
      try {
        const actionName =
          action === "assign" ? "assign_table" : "release_table";

        await dashboardService.logAction({
          action_name: actionName,
          resource_id: tableId,
          resource_type: "table",
          action_data: tableData,
          success: true,
        });
      } catch (error) {
        console.error("Failed to log table action:", error);
      }
    },
    [dashboardService]
  );

  const logCustomerAction = useCallback(
    async (customerId: string, customerData?: any) => {
      try {
        await dashboardService.logAction({
          action_name: "serve_customer",
          resource_id: customerId,
          resource_type: "customer",
          action_data: customerData,
          success: true,
        });
      } catch (error) {
        console.error("Failed to log customer action:", error);
      }
    },
    [dashboardService]
  );

  const logReportAction = useCallback(
    async (reportType: string, reportData?: any) => {
      try {
        await dashboardService.logAction({
          action_name: "generate_report",
          resource_id: `${reportType}-${Date.now()}`,
          resource_type: "report",
          action_data: {
            report_type: reportType,
            ...reportData,
          },
          success: true,
        });
      } catch (error) {
        console.error("Failed to log report action:", error);
      }
    },
    [dashboardService]
  );

  const logError = useCallback(
    async (errorMessage: string, errorContext?: any) => {
      try {
        await dashboardService.logAction({
          action_name: "handle_error",
          action_data: {
            error_message: errorMessage,
            error_context: errorContext,
            timestamp: new Date().toISOString(),
          },
          success: false,
          error_message: errorMessage,
        });
      } catch (error) {
        console.error("Failed to log error:", error);
      }
    },
    [dashboardService]
  );

  // Batch logging for multiple actions
  const logBatchActions = useCallback(
    async (
      actions: Array<{
        action_name: string;
        resource_id?: string;
        resource_type?: string;
        action_data?: any;
        success?: boolean;
        error_message?: string;
      }>
    ) => {
      try {
        await dashboardService.logBatchActions(actions);
      } catch (error) {
        console.error("Failed to log batch actions:", error);
      }
    },
    [dashboardService]
  );

  // Dashboard-specific action templates
  const getActionTemplates = useCallback(() => {
    switch (dashboard_type) {
      case "reception":
        return DashboardActionTemplates.reception;
      case "kitchen":
        return DashboardActionTemplates.kitchen;
      case "bar":
        return DashboardActionTemplates.bar;
      case "accountant":
        return DashboardActionTemplates.accountant;
      case "admin":
        return DashboardActionTemplates.admin;
      default:
        return {};
    }
  }, [dashboard_type]);

  return {
    // Basic activity logging
    ...activityLogger,

    // Enhanced dashboard-specific logging
    logOrderAction,
    logPaymentAction,
    logInventoryAction,
    logTableAction,
    logCustomerAction,
    logReportAction,
    logError,
    logBatchActions,

    // Utilities
    getActionTemplates,
    dashboardService,
  };
}

/**
 * Higher-order component to automatically integrate activity logging
 */
export function withStaffActivityIntegration<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  dashboardType: "reception" | "kitchen" | "bar" | "accountant" | "admin"
): React.ComponentType<
  P & {
    staff_id: string;
    staff_session_id?: string;
    business_id: string;
  }
> {
  const ComponentWithActivityLogging = (
    props: P & {
      staff_id: string;
      staff_session_id?: string;
      business_id: string;
    }
  ) => {
    const activityIntegration = useStaffActivityIntegration({
      staff_id: props.staff_id,
      staff_session_id: props.staff_session_id,
      business_id: props.business_id,
      dashboard_type: dashboardType,
    });

    // Add activity logging functions to props
    const enhancedProps = {
      ...props,
      activityLogger: activityIntegration,
    } as P & {
      activityLogger: ReturnType<typeof useStaffActivityIntegration>;
    };

    return React.createElement(WrappedComponent, enhancedProps);
  };

  return ComponentWithActivityLogging;
}

/**
 * Hook for performance monitoring and alerts
 */
export function usePerformanceMonitoring(staffId: string, businessId: string) {
  const checkPerformanceAlerts = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/staff/performance/${staffId}?business_id=${businessId}&include_alerts=true`
      );
      const data = await response.json();

      if (response.ok && data.performance_metrics?.performance_alerts) {
        const criticalAlerts =
          data.performance_metrics.performance_alerts.filter(
            (alert: any) => alert.type === "critical"
          );

        if (criticalAlerts.length > 0) {
          // Handle critical performance alerts
          console.warn("Critical performance alerts detected:", criticalAlerts);
          return criticalAlerts;
        }
      }

      return [];
    } catch (error) {
      console.error("Failed to check performance alerts:", error);
      return [];
    }
  }, [staffId, businessId]);

  const getPerformanceSummary = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/staff/performance/${staffId}?business_id=${businessId}`
      );
      const data = await response.json();

      if (response.ok && data.performance_metrics) {
        return {
          efficiency_score: data.performance_metrics.metrics.efficiency_score,
          success_rate: data.performance_metrics.metrics.success_rate,
          error_rate: data.performance_metrics.metrics.error_rate,
          activity_volume:
            data.performance_metrics.metrics.activity_volume_score,
          alerts_count:
            data.performance_metrics.performance_alerts?.length || 0,
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to get performance summary:", error);
      return null;
    }
  }, [staffId, businessId]);

  return {
    checkPerformanceAlerts,
    getPerformanceSummary,
  };
}
