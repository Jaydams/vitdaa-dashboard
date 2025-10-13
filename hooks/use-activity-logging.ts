import React, { useCallback, useRef } from "react";
import {
  ActivityLogData,
  ActivityType,
  logStaffActivity,
} from "@/lib/activity-logging-middleware";

interface UseActivityLoggingProps {
  staff_id: string;
  staff_session_id?: string;
  business_id: string;
}

interface ActivityLogOptions {
  resource_id?: string;
  resource_type?: string;
  activity_details?: Record<string, any>;
  performance_metrics?: Record<string, any>;
}

export function useActivityLogging({
  staff_id,
  staff_session_id,
  business_id,
}: UseActivityLoggingProps) {
  const startTimeRef = useRef<number>(Date.now());

  const logActivity = useCallback(
    async (
      activity_type: ActivityType,
      options: ActivityLogOptions = {},
      success: boolean = true,
      error_message?: string
    ) => {
      try {
        const activityData: ActivityLogData = {
          staff_id,
          staff_session_id,
          business_id,
          activity_type,
          success,
          error_message,
          ...options,
          performance_metrics: {
            response_time: Date.now() - startTimeRef.current,
            ...options.performance_metrics,
          },
        };

        await logStaffActivity(activityData);
      } catch (error) {
        console.error("Failed to log activity:", error);
      }
    },
    [staff_id, staff_session_id, business_id]
  );

  const logOrderActivity = useCallback(
    async (
      activity_type: "order_created" | "order_updated" | "order_status_changed",
      orderId: string,
      orderDetails?: Record<string, any>,
      success: boolean = true,
      error_message?: string
    ) => {
      await logActivity(
        activity_type,
        {
          resource_id: orderId,
          resource_type: "order",
          activity_details: orderDetails,
        },
        success,
        error_message
      );
    },
    [logActivity]
  );

  const logPaymentActivity = useCallback(
    async (
      paymentId: string,
      paymentDetails?: Record<string, any>,
      success: boolean = true,
      error_message?: string
    ) => {
      await logActivity(
        "payment_processed",
        {
          resource_id: paymentId,
          resource_type: "payment",
          activity_details: paymentDetails,
        },
        success,
        error_message
      );
    },
    [logActivity]
  );

  const logInventoryActivity = useCallback(
    async (
      activity_type:
        | "inventory_requested"
        | "inventory_approved"
        | "inventory_denied"
        | "inventory_updated",
      inventoryId: string,
      inventoryDetails?: Record<string, any>,
      success: boolean = true,
      error_message?: string
    ) => {
      await logActivity(
        activity_type,
        {
          resource_id: inventoryId,
          resource_type: "inventory",
          activity_details: inventoryDetails,
        },
        success,
        error_message
      );
    },
    [logActivity]
  );

  const logTableActivity = useCallback(
    async (
      tableId: string,
      tableDetails?: Record<string, any>,
      success: boolean = true,
      error_message?: string
    ) => {
      await logActivity(
        "table_assigned",
        {
          resource_id: tableId,
          resource_type: "table",
          activity_details: tableDetails,
        },
        success,
        error_message
      );
    },
    [logActivity]
  );

  const logCustomerActivity = useCallback(
    async (
      customerId: string,
      customerDetails?: Record<string, any>,
      success: boolean = true,
      error_message?: string
    ) => {
      await logActivity(
        "customer_served",
        {
          resource_id: customerId,
          resource_type: "customer",
          activity_details: customerDetails,
        },
        success,
        error_message
      );
    },
    [logActivity]
  );

  const logReportActivity = useCallback(
    async (
      reportId: string,
      reportDetails?: Record<string, any>,
      success: boolean = true,
      error_message?: string
    ) => {
      await logActivity(
        "report_generated",
        {
          resource_id: reportId,
          resource_type: "report",
          activity_details: reportDetails,
        },
        success,
        error_message
      );
    },
    [logActivity]
  );

  const logRefundActivity = useCallback(
    async (
      refundId: string,
      refundDetails?: Record<string, any>,
      success: boolean = true,
      error_message?: string
    ) => {
      await logActivity(
        "refund_processed",
        {
          resource_id: refundId,
          resource_type: "refund",
          activity_details: refundDetails,
        },
        success,
        error_message
      );
    },
    [logActivity]
  );

  const logDashboardAccess = useCallback(
    async (
      dashboardType: string,
      accessDetails?: Record<string, any>,
      success: boolean = true,
      error_message?: string
    ) => {
      await logActivity(
        "dashboard_accessed",
        {
          resource_id: dashboardType,
          resource_type: "dashboard",
          activity_details: {
            dashboard_type: dashboardType,
            ...accessDetails,
          },
        },
        success,
        error_message
      );
    },
    [logActivity]
  );

  const logError = useCallback(
    async (errorDetails: Record<string, any>, error_message: string) => {
      await logActivity(
        "error_occurred",
        {
          activity_details: errorDetails,
        },
        false,
        error_message
      );
    },
    [logActivity]
  );

  const resetTimer = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  return {
    logActivity,
    logOrderActivity,
    logPaymentActivity,
    logInventoryActivity,
    logTableActivity,
    logCustomerActivity,
    logReportActivity,
    logRefundActivity,
    logDashboardAccess,
    logError,
    resetTimer,
  };
}

// Higher-order component for automatic dashboard access logging
export function withDashboardLogging<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  dashboardType: string
): React.ComponentType<P & UseActivityLoggingProps> {
  const DashboardWithLogging = (props: P & UseActivityLoggingProps) => {
    const { logDashboardAccess } = useActivityLogging({
      staff_id: props.staff_id,
      staff_session_id: props.staff_session_id,
      business_id: props.business_id,
    });

    // Log dashboard access on mount
    React.useEffect(() => {
      logDashboardAccess(dashboardType, {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      });
    }, [logDashboardAccess]);

    return React.createElement(WrappedComponent, props);
  };

  return DashboardWithLogging;
}

// Hook for performance tracking
export function usePerformanceTracking() {
  const startTimeRef = useRef<number | undefined>(undefined);
  const metricsRef = useRef<Record<string, any>>({});

  const startTracking = useCallback((operationName: string) => {
    const now = Date.now();
    startTimeRef.current = now;
    metricsRef.current[operationName] = {
      start_time: now,
    };
  }, []);

  const endTracking = useCallback((operationName: string) => {
    if (startTimeRef.current && metricsRef.current[operationName]) {
      const endTime = Date.now();
      const duration = endTime - startTimeRef.current;

      metricsRef.current[operationName] = {
        ...metricsRef.current[operationName],
        end_time: endTime,
        duration,
      };

      return {
        duration,
        start_time: startTimeRef.current,
        end_time: endTime,
      };
    }
    return null;
  }, []);

  const getMetrics = useCallback((operationName?: string) => {
    if (operationName) {
      return metricsRef.current[operationName];
    }
    return metricsRef.current;
  }, []);

  const clearMetrics = useCallback(() => {
    metricsRef.current = {};
    startTimeRef.current = undefined;
  }, []);

  return {
    startTracking,
    endTracking,
    getMetrics,
    clearMetrics,
  };
}
