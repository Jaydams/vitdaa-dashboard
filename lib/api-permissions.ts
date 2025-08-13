/**
 * API permission middleware for protecting endpoints with role-based access control
 */

import { NextRequest, NextResponse } from "next/server";
import { getStaffFromHeaders } from "@/lib/supabase/staff-middleware";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "./permissions";

/**
 * Interface for API permission configuration
 */
export interface ApiPermissionConfig {
  requiredPermissions: string[];
  requireAll?: boolean;
  allowBusinessOwner?: boolean;
  customErrorMessage?: string;
}

/**
 * Higher-order function to create permission-protected API handlers
 * @param config - Permission configuration
 * @param handler - The API handler function
 * @returns Protected API handler
 */
export function withApiPermissions(
  config: ApiPermissionConfig,
  handler: (
    request: NextRequest,
    context: { params?: any }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params?: any }
  ): Promise<NextResponse> => {
    try {
      // Get staff session from headers
      const staffSession = getStaffFromHeaders(request.headers);

      // Check if business owner access is allowed and user is business owner
      if (config.allowBusinessOwner) {
        const businessOwnerHeader = request.headers.get("x-business-owner-id");
        if (businessOwnerHeader) {
          // Business owner has full access
          return handler(request, context);
        }
      }

      // Check if staff session exists
      if (!staffSession) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Staff session required",
          },
          { status: 401 }
        );
      }

      // Check permissions
      const { requiredPermissions, requireAll = false } = config;
      const userPermissions = staffSession.permissions;

      let hasAccess = false;

      if (requiredPermissions.length === 0) {
        // No specific permissions required, just need valid session
        hasAccess = true;
      } else if (requireAll) {
        hasAccess = hasAllPermissions(userPermissions, requiredPermissions);
      } else {
        hasAccess = hasAnyPermission(userPermissions, requiredPermissions);
      }

      if (!hasAccess) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message:
              config.customErrorMessage ||
              "Insufficient permissions to access this resource",
            requiredPermissions,
            userPermissions,
          },
          { status: 403 }
        );
      }

      // Add staff session to request headers for use in handler
      const newHeaders = new Headers(request.headers);
      newHeaders.set("x-staff-session", JSON.stringify(staffSession));

      const modifiedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: newHeaders,
        body: request.body,
      });

      return handler(modifiedRequest, context);
    } catch (error) {
      console.error("API permission check error:", error);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "Permission check failed",
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility to extract staff session from request headers
 * @param request - Next.js request object
 * @returns Staff session or null
 */
export function getStaffSessionFromRequest(request: NextRequest) {
  const staffSessionHeader = request.headers.get("x-staff-session");
  if (!staffSessionHeader) return null;

  try {
    return JSON.parse(staffSessionHeader);
  } catch {
    return null;
  }
}

/**
 * Middleware function for checking permissions in API routes
 * @param request - Next.js request object
 * @param requiredPermissions - Array of required permissions
 * @param requireAll - Whether all permissions are required
 * @returns Permission check result
 */
export async function checkApiPermissions(
  request: NextRequest,
  requiredPermissions: string[],
  requireAll: boolean = false
): Promise<{
  hasAccess: boolean;
  staffSession: any | null;
  error?: string;
}> {
  try {
    const staffSession = getStaffFromHeaders(request.headers);

    if (!staffSession) {
      return {
        hasAccess: false,
        staffSession: null,
        error: "Staff session required",
      };
    }

    const userPermissions = staffSession.permissions;
    let hasAccess = false;

    if (requiredPermissions.length === 0) {
      hasAccess = true;
    } else if (requireAll) {
      hasAccess = hasAllPermissions(userPermissions, requiredPermissions);
    } else {
      hasAccess = hasAnyPermission(userPermissions, requiredPermissions);
    }

    return {
      hasAccess,
      staffSession,
      error: hasAccess ? undefined : "Insufficient permissions",
    };
  } catch (error) {
    console.error("Permission check error:", error);
    return {
      hasAccess: false,
      staffSession: null,
      error: "Permission check failed",
    };
  }
}

/**
 * Create a permission error response
 * @param message - Error message
 * @param requiredPermissions - Required permissions
 * @param userPermissions - User's current permissions
 * @returns NextResponse with error
 */
export function createPermissionErrorResponse(
  message: string = "Insufficient permissions",
  requiredPermissions: string[] = [],
  userPermissions: string[] = []
): NextResponse {
  return NextResponse.json(
    {
      error: "Forbidden",
      message,
      requiredPermissions,
      userPermissions,
    },
    { status: 403 }
  );
}

/**
 * Create an unauthorized error response
 * @param message - Error message
 * @returns NextResponse with error
 */
export function createUnauthorizedResponse(
  message: string = "Authentication required"
): NextResponse {
  return NextResponse.json(
    {
      error: "Unauthorized",
      message,
    },
    { status: 401 }
  );
}

/**
 * Permission decorators for common permission patterns
 */
export const PermissionDecorators = {
  /**
   * Require order management permissions
   */
  requireOrderAccess: (handler: Function) =>
    withApiPermissions(
      {
        requiredPermissions: ["orders:read"],
        customErrorMessage: "Order access required",
      },
      handler as any
    ),

  /**
   * Require order creation permissions
   */
  requireOrderCreate: (handler: Function) =>
    withApiPermissions(
      {
        requiredPermissions: ["orders:create"],
        customErrorMessage: "Order creation permission required",
      },
      handler as any
    ),

  /**
   * Require payment processing permissions
   */
  requirePaymentAccess: (handler: Function) =>
    withApiPermissions(
      {
        requiredPermissions: ["payments:process", "payments:read"],
        requireAll: false,
        customErrorMessage: "Payment access required",
      },
      handler as any
    ),

  /**
   * Require inventory management permissions
   */
  requireInventoryAccess: (handler: Function) =>
    withApiPermissions(
      {
        requiredPermissions: ["inventory:read"],
        customErrorMessage: "Inventory access required",
      },
      handler as any
    ),

  /**
   * Require reporting permissions
   */
  requireReportAccess: (handler: Function) =>
    withApiPermissions(
      {
        requiredPermissions: ["reports:read"],
        customErrorMessage: "Report access required",
      },
      handler as any
    ),

  /**
   * Allow business owner or staff with specific permissions
   */
  requireBusinessOwnerOrPermissions:
    (permissions: string[]) => (handler: Function) =>
      withApiPermissions(
        {
          requiredPermissions: permissions,
          allowBusinessOwner: true,
          customErrorMessage:
            "Business owner access or specific permissions required",
        },
        handler as any
      ),
};
