/**
 * Client-side permission utilities for staff roles
 * This file contains the same permission logic as staff-permissions.ts
 * but without server-side dependencies
 */

import { StaffRole } from "@/types/staff";

/**
 * Role-based permission mappings
 */
export const ROLE_PERMISSIONS = {
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

/**
 * Get permissions for a specific role
 * @param role - The staff role
 * @returns Array of permissions for the role
 */
export function getPermissionsForRole(role: StaffRole): string[] {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

/**
 * Check if a permission is valid
 * @param permission - The permission to validate
 * @returns Boolean indicating if the permission is valid
 */
export function isValidPermission(permission: string): boolean {
  const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
  return (allPermissions as string[]).includes(permission);
}

/**
 * Get all available permissions
 * @returns Array of all available permissions
 */
export function getAllPermissions(): string[] {
  return [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
}
