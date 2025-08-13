import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStaffFromHeaders } from "@/lib/supabase/staff-middleware";

/**
 * Server-side utility to get staff session information
 * @returns Staff session data or null if not available
 */
export async function getServerStaffSession() {
  const headersList = await headers();
  return getStaffFromHeaders(headersList);
}

/**
 * Server-side utility to check if staff has required permissions
 * @param requiredPermissions - Array of required permissions
 * @param requireAll - If true, requires all permissions; if false, requires any permission
 * @returns Boolean indicating if staff has required permissions
 */
export async function hasServerPermissions(
  requiredPermissions: string[],
  requireAll: boolean = false
): Promise<boolean> {
  const staffSession = await getServerStaffSession();

  if (!staffSession) {
    return false;
  }

  if (requiredPermissions.length === 0) {
    return true;
  }

  if (requireAll) {
    return requiredPermissions.every((permission) =>
      staffSession.permissions.includes(permission)
    );
  } else {
    return requiredPermissions.some((permission) =>
      staffSession.permissions.includes(permission)
    );
  }
}

/**
 * Server-side utility to enforce permissions and redirect if not authorized
 * @param requiredPermissions - Array of required permissions
 * @param requireAll - If true, requires all permissions; if false, requires any permission
 * @param redirectTo - URL to redirect to if unauthorized (default: /staff/dashboard)
 */
export async function enforcePermissions(
  requiredPermissions: string[],
  requireAll: boolean = false,
  redirectTo: string = "/staffs?error=insufficient_permissions"
) {
  const hasPermissions = await hasServerPermissions(
    requiredPermissions,
    requireAll
  );

  if (!hasPermissions) {
    redirect(redirectTo);
  }
}

/**
 * Server-side utility to get staff role
 * @returns Staff role or null if not available
 */
export async function getServerStaffRole(): Promise<string | null> {
  const staffSession = await getServerStaffSession();
  return staffSession?.staffRole || null;
}

/**
 * Server-side utility to check if staff has a specific role
 * @param role - The role to check for
 * @returns Boolean indicating if staff has the specified role
 */
export async function hasServerRole(role: string): Promise<boolean> {
  const staffRole = await getServerStaffRole();
  return staffRole === role;
}

// Import comprehensive permission utilities
import {
  ROLE_PERMISSIONS,
  getPermissionsForRole as getPermissionsForRoleCore,
  isValidPermission as isValidPermissionCore,
  getAllPermissions as getAllPermissionsCore,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "./permissions";
import { StaffRole } from "@/types/auth";

/**
 * Role-based permission mappings (re-exported from permissions.ts)
 */
export { ROLE_PERMISSIONS };

/**
 * Get permissions for a specific role
 * @param role - The staff role
 * @returns Array of permissions for the role
 */
export function getPermissionsForRole(role: StaffRole): string[] {
  return getPermissionsForRoleCore(role);
}

/**
 * Check if a permission is valid
 * @param permission - The permission to validate
 * @returns Boolean indicating if the permission is valid
 */
export function isValidPermission(permission: string): boolean {
  return isValidPermissionCore(permission);
}

/**
 * Get all available permissions
 * @returns Array of all available permissions
 */
export function getAllPermissions(): string[] {
  return getAllPermissionsCore();
}

/**
 * Core permission checking function (re-exported from permissions.ts)
 */
export { hasPermission, hasAnyPermission, hasAllPermissions };
