import { NextRequest, NextResponse } from "next/server";
import {
  ActivityLogData,
  ActivityType,
  logStaffActivity,
} from "./activity-logging-middleware";

interface ApiActivityConfig {
  activity_type: ActivityType;
  extractStaffInfo: (
    request: NextRequest,
    params?: any
  ) => {
    staff_id?: string;
    staff_session_id?: string;
    business_id?: string;
  };
  extractResourceInfo?: (
    request: NextRequest,
    params?: any,
    response?: Response
  ) => {
    resource_id?: string;
    resource_type?: string;
    activity_details?: Record<string, any>;
  };
}

/**
 * Middleware wrapper for API routes to automatically log staff activities
 */
export function withApiActivityLogging<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  config: ApiActivityConfig
) {
  return async (...args: T): Promise<Response> => {
    const startTime = Date.now();
    const request = args[0] as NextRequest;
    const params = args[1] as any;

    let response: Response;
    let success = true;
    let errorMessage: string | undefined;

    try {
      // Execute the original handler
      response = await handler(...args);
      success = response.ok;

      // Extract error message if request failed
      if (!success) {
        try {
          const responseClone = response.clone();
          const responseText = await responseClone.text();
          const responseJson = JSON.parse(responseText);
          errorMessage =
            responseJson.error ||
            responseJson.message ||
            `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}`;
        }
      }
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Create error response
      response = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // Log the activity
    try {
      const staffInfo = config.extractStaffInfo(request, params);
      const resourceInfo =
        config.extractResourceInfo?.(request, params, response) || {};

      // Only log if we have required staff information
      if (staffInfo.staff_id && staffInfo.business_id) {
        const activityData: ActivityLogData = {
          staff_id: staffInfo.staff_id,
          staff_session_id: staffInfo.staff_session_id,
          business_id: staffInfo.business_id,
          activity_type: config.activity_type,
          success,
          error_message: errorMessage,
          performance_metrics: {
            response_time: Date.now() - startTime,
          },
          ...resourceInfo,
        };

        // Log activity asynchronously to avoid blocking response
        logStaffActivity(activityData).catch((loggingError) => {
          console.error("Failed to log API activity:", loggingError);
        });
      }
    } catch (loggingError) {
      console.error("Activity logging setup failed:", loggingError);
    }

    return response;
  };
}

/**
 * Extract staff information from request headers or body
 */
export function extractStaffFromRequest(request: NextRequest): {
  staff_id?: string;
  staff_session_id?: string;
  business_id?: string;
} {
  // Try to get from headers first
  const staffId = request.headers.get("x-staff-id");
  const sessionId = request.headers.get("x-staff-session-id");
  const businessId = request.headers.get("x-business-id");

  if (staffId && businessId) {
    return {
      staff_id: staffId,
      staff_session_id: sessionId || undefined,
      business_id: businessId,
    };
  }

  // If not in headers, we'll need to extract from request body or URL
  // This will be handled by specific route implementations
  return {};
}

/**
 * Extract resource information from request and response
 */
export function extractResourceFromOrderRequest(
  request: NextRequest,
  params?: any,
  response?: Response
): {
  resource_id?: string;
  resource_type?: string;
  activity_details?: Record<string, any>;
} {
  const orderId = params?.id || params?.orderId;

  return {
    resource_id: orderId,
    resource_type: "order",
    activity_details: {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Extract resource information from inventory requests
 */
export function extractResourceFromInventoryRequest(
  request: NextRequest,
  params?: any,
  response?: Response
): {
  resource_id?: string;
  resource_type?: string;
  activity_details?: Record<string, any>;
} {
  const inventoryId = params?.id || params?.inventoryId;

  return {
    resource_id: inventoryId,
    resource_type: "inventory",
    activity_details: {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Extract resource information from payment requests
 */
export function extractResourceFromPaymentRequest(
  request: NextRequest,
  params?: any,
  response?: Response
): {
  resource_id?: string;
  resource_type?: string;
  activity_details?: Record<string, any>;
} {
  const paymentId = params?.id || params?.paymentId;

  return {
    resource_id: paymentId,
    resource_type: "payment",
    activity_details: {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Predefined middleware configurations for common API routes
 */
export const ApiActivityConfigs = {
  orderCreated: {
    activity_type: "order_created" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromOrderRequest,
  },

  orderUpdated: {
    activity_type: "order_updated" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromOrderRequest,
  },

  orderStatusChanged: {
    activity_type: "order_status_changed" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromOrderRequest,
  },

  paymentProcessed: {
    activity_type: "payment_processed" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromPaymentRequest,
  },

  inventoryRequested: {
    activity_type: "inventory_requested" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromInventoryRequest,
  },

  inventoryApproved: {
    activity_type: "inventory_approved" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromInventoryRequest,
  },

  inventoryDenied: {
    activity_type: "inventory_denied" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromInventoryRequest,
  },

  inventoryUpdated: {
    activity_type: "inventory_updated" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromInventoryRequest,
  },

  refundProcessed: {
    activity_type: "refund_processed" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: extractResourceFromPaymentRequest,
  },

  reportGenerated: {
    activity_type: "report_generated" as ActivityType,
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: (request: NextRequest, params?: any) => ({
      resource_type: "report",
      activity_details: {
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString(),
      },
    }),
  },
};

/**
 * Utility function to create activity logging middleware for specific routes
 */
export function createActivityMiddleware(activityType: ActivityType) {
  return (
    extractStaffInfo: (
      request: NextRequest,
      params?: any
    ) => {
      staff_id: string;
      staff_session_id?: string;
      business_id: string;
    },
    extractResourceInfo?: (
      request: NextRequest,
      params?: any,
      response?: Response
    ) => {
      resource_id?: string;
      resource_type?: string;
      activity_details?: Record<string, any>;
    }
  ) => {
    return withApiActivityLogging(
      async (...args: any[]) => {
        throw new Error("Handler not implemented");
      },
      {
        activity_type: activityType,
        extractStaffInfo,
        extractResourceInfo,
      }
    );
  };
}

/**
 * Batch logging utility for multiple activities in a single request
 */
export async function logBatchApiActivities(activities: ActivityLogData[]) {
  try {
    // Import the batch logging function
    const { logBatchStaffActivities } = await import(
      "./activity-logging-middleware"
    );
    await logBatchStaffActivities(activities);
  } catch (error) {
    console.error("Failed to batch log API activities:", error);
  }
}

/**
 * Middleware for dashboard access logging
 */
export function withDashboardAccessLogging(
  handler: (...args: any[]) => Promise<Response>,
  dashboardType: string
) {
  return withApiActivityLogging(handler, {
    activity_type: "dashboard_accessed",
    extractStaffInfo: extractStaffFromRequest,
    extractResourceInfo: (request: NextRequest) => ({
      resource_id: dashboardType,
      resource_type: "dashboard",
      activity_details: {
        dashboard_type: dashboardType,
        method: request.method,
        url: request.url,
        user_agent: request.headers.get("user-agent"),
        timestamp: new Date().toISOString(),
      },
    }),
  });
}
