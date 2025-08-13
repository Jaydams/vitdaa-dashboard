import { NextResponse, type NextRequest } from "next/server";
import {
  validateStaffSession,
  cleanupExpiredSessions,
} from "@/actions/staff-auth-utils";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Define role-based permissions
const ROLE_PERMISSIONS = {
  reception: [
    "orders:create",
    "orders:read",
    "orders:update",
    "tables:read",
    "tables:update",
    "customers:read",
    "payments:process",
  ],
  kitchen: [
    "orders:read",
    "orders:update_status",
    "inventory:read",
    "inventory:update",
    "inventory:alerts",
  ],
  bar: [
    "orders:read",
    "orders:update_status",
    "inventory:read",
    "inventory:update",
    "inventory:restock_requests",
  ],
  accountant: [
    "reports:read",
    "transactions:read",
    "payments:read",
    "reports:generate",
    "payments:refund",
  ],
} as const;

// Define protected staff dashboard routes and their required permissions
const PROTECTED_ROUTES = {
  "/staffs": [],
  "/staffs/orders": ["orders:read"],
  "/staffs/orders/create": ["orders:create"],
  "/staffs/orders/update": ["orders:update", "orders:update_status"],
  "/staffs/tables": ["tables:read"],
  "/staffs/tables/manage": ["tables:update"],
  "/staffs/customers": ["customers:read"],
  "/staffs/payments": ["payments:process", "payments:read"],
  "/staffs/inventory": ["inventory:read"],
  "/staffs/inventory/update": ["inventory:update"],
  "/staffs/reports": ["reports:read"],
  "/staffs/reports/generate": ["reports:generate"],
} as const;

/**
 * Validates staff session and extracts permissions
 * @param request - The incoming request
 * @returns Object containing session validation results
 */
export async function validateStaffSessionMiddleware(request: NextRequest) {
  try {
    // Get staff session token from cookies
    const staffSessionToken = request.cookies.get("staff_session_token")?.value;

    console.log("Staff session validation - Token found:", !!staffSessionToken);
    console.log("Staff session validation - Token:", staffSessionToken?.substring(0, 8) + "...");

    if (!staffSessionToken) {
      console.log("Staff session validation - No token found");
      return {
        isValid: false,
        staff: null,
        permissions: [],
        sessionRecord: null,
        error: "No staff session token found",
      };
    }

    // Validate the session token
    const sessionRecord = await validateStaffSession(staffSessionToken);

    console.log("Staff session validation - Session record:", !!sessionRecord);
    console.log("Staff session validation - Session details:", sessionRecord ? {
      id: sessionRecord.id,
      staff_id: sessionRecord.staff_id,
      is_active: sessionRecord.is_active,
      expires_at: sessionRecord.expires_at
    } : null);

    if (!sessionRecord) {
      console.log("Staff session validation - Invalid session record");
      return {
        isValid: false,
        staff: null,
        permissions: [],
        sessionRecord: null,
        error: "Invalid or expired staff session",
      };
    }

    // Get staff details
    const supabase = await createServiceClient();
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("id", sessionRecord.staff_id)
      .eq("is_active", true)
      .single();

    console.log("Staff session validation - Staff found:", !!staff);
    console.log("Staff session validation - Staff error:", staffError);
    console.log("Staff session validation - Staff details:", staff ? {
      id: staff.id,
      email: staff.email,
      is_active: staff.is_active,
      role: staff.role
    } : null);

    if (staffError || !staff) {
      console.log("Staff session validation - Staff not found or inactive");
      return {
        isValid: false,
        staff: null,
        permissions: [],
        sessionRecord: null,
        error: "Staff member not found or inactive",
      };
    }

    // Get role-based permissions
    const rolePermissions =
      ROLE_PERMISSIONS[staff.role as keyof typeof ROLE_PERMISSIONS] || [];
    const staffPermissions = staff.permissions || [];
    const allPermissions = [
      ...new Set([...rolePermissions, ...staffPermissions]),
    ];

    console.log("Staff session validation - Success, permissions:", allPermissions);

    return {
      isValid: true,
      staff,
      permissions: allPermissions,
      sessionRecord,
      error: null,
    };
  } catch (error) {
    console.error("Error validating staff session:", error);
    return {
      isValid: false,
      staff: null,
      permissions: [],
      sessionRecord: null,
      error: "Session validation error",
    };
  }
}

/**
 * Checks if staff has required permissions for a route
 * @param staffPermissions - Array of staff permissions
 * @param requiredPermissions - Array of required permissions for the route
 * @returns True if staff has all required permissions
 */
export function hasRequiredPermissions(
  staffPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (requiredPermissions.length === 0) {
    return true; // No specific permissions required
  }

  return requiredPermissions.some((permission) =>
    staffPermissions.includes(permission)
  );
}

/**
 * Main staff session middleware for role-based access control
 * @param request - The incoming request
 * @returns NextResponse with appropriate handling
 */
export async function staffSessionMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if this is a staff dashboard route
  if (!pathname.startsWith("/staffs")) {
    return NextResponse.next();
  }

  // Validate staff session
  const sessionValidation = await validateStaffSessionMiddleware(request);

  if (!sessionValidation.isValid) {
    // Redirect to staff login if session is invalid
    const url = request.nextUrl.clone();
    url.pathname = "/staff-login";
    url.searchParams.set("error", sessionValidation.error || "Session expired");

    const response = NextResponse.redirect(url);

    // Clear invalid session cookie
    response.cookies.delete("staff_session_token");

    return response;
  }

  // Check route permissions
  const requiredPermissions = getRequiredPermissionsForRoute(pathname);

  if (
    !hasRequiredPermissions(sessionValidation.permissions, requiredPermissions)
  ) {
    // Redirect to staff dashboard with permission error
    const url = request.nextUrl.clone();
    url.pathname = "/staffs";
    url.searchParams.set("error", "Insufficient permissions");

    return NextResponse.redirect(url);
  }

  // Add staff information to request headers for use in components
  const response = NextResponse.next();

  response.headers.set("x-staff-id", sessionValidation.staff!.id);
  response.headers.set("x-staff-role", sessionValidation.staff!.role);
  response.headers.set(
    "x-staff-permissions",
    JSON.stringify(sessionValidation.permissions)
  );
  response.headers.set(
    "x-staff-session-id",
    sessionValidation.sessionRecord!.id
  );

  return response;
}

/**
 * Gets required permissions for a specific route
 * @param pathname - The route pathname
 * @returns Array of required permissions
 */
function getRequiredPermissionsForRoute(pathname: string): string[] {
  // Find exact match first
  if (pathname in PROTECTED_ROUTES) {
    return [...PROTECTED_ROUTES[pathname as keyof typeof PROTECTED_ROUTES]];
  }

  // Find partial matches for dynamic routes
  for (const [route, permissions] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      return [...permissions];
    }
  }

  // Default: no specific permissions required for unlisted staff routes
  return [];
}

/**
 * Cleanup expired sessions periodically
 * This should be called periodically or triggered by a cron job
 * @param businessId - Optional business ID to limit cleanup
 */
export async function performSessionCleanup(businessId?: string) {
  try {
    const cleanedCount = await cleanupExpiredSessions(businessId);
    console.log(`Cleaned up ${cleanedCount} expired staff sessions`);
    return cleanedCount;
  } catch (error) {
    console.error("Error during session cleanup:", error);
    return 0;
  }
}

/**
 * Utility function to get staff session from request headers
 * Use this in server components to access staff information
 * @param headers - Request headers
 * @returns Staff session information
 */
export function getStaffFromHeaders(headers: Headers) {
  const staffId = headers.get("x-staff-id");
  const staffRole = headers.get("x-staff-role");
  const staffPermissions = headers.get("x-staff-permissions");
  const sessionId = headers.get("x-staff-session-id");

  if (!staffId || !staffRole || !staffPermissions || !sessionId) {
    return null;
  }

  try {
    return {
      staffId,
      staffRole,
      permissions: JSON.parse(staffPermissions),
      sessionId,
    };
  } catch (error) {
    console.error("Error parsing staff permissions from headers:", error);
    return null;
  }
}
