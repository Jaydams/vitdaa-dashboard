/**
 * Comprehensive permission system for staff RBAC
 * This module provides utilities for checking permissions, role-based access control,
 * and dynamic permission assignment during staff creation.
 */

import { StaffRole } from "@/types/auth";

// Permission constants
export const PERMISSIONS = {
  // Order management permissions
  ORDERS_CREATE: "orders:create",
  ORDERS_READ: "orders:read",
  ORDERS_UPDATE: "orders:update",
  ORDERS_UPDATE_STATUS: "orders:update_status",
  ORDERS_DELETE: "orders:delete",

  // Table management permissions
  TABLES_READ: "tables:read",
  TABLES_UPDATE: "tables:update",
  TABLES_ASSIGN: "tables:assign",

  // Customer management permissions
  CUSTOMERS_READ: "customers:read",
  CUSTOMERS_UPDATE: "customers:update",
  CUSTOMERS_CREATE: "customers:create",

  // Payment processing permissions
  PAYMENTS_PROCESS: "payments:process",
  PAYMENTS_READ: "payments:read",
  PAYMENTS_REFUND: "payments:refund",

  // Inventory management permissions
  INVENTORY_READ: "inventory:read",
  INVENTORY_UPDATE: "inventory:update",
  INVENTORY_ALERTS: "inventory:alerts",
  INVENTORY_RESTOCK_REQUESTS: "inventory:restock_requests",

  // Reporting permissions
  REPORTS_READ: "reports:read",
  REPORTS_GENERATE: "reports:generate",

  // Transaction permissions
  TRANSACTIONS_READ: "transactions:read",
  TRANSACTIONS_UPDATE: "transactions:update",

  // Staff management permissions (for elevated access)
  STAFF_READ: "staff:read",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DELETE: "staff:delete",
} as const;

// Type for permission values
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role-based permission mappings
 * Each role has a specific set of permissions assigned
 */
export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  reception: [
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_UPDATE,
    PERMISSIONS.TABLES_ASSIGN,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.PAYMENTS_PROCESS,
  ],
  kitchen: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_ALERTS,
  ],
  bar: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_RESTOCK_REQUESTS,
  ],
  accountant: [
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_REFUND,
  ],
};

/**
 * Core permission checking function
 * @param userPermissions - Array of permissions the user has
 * @param requiredPermission - The permission to check for
 * @returns Boolean indicating if user has the required permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required permissions
 * @param userPermissions - Array of permissions the user has
 * @param requiredPermissions - Array of permissions to check for
 * @returns Boolean indicating if user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission)
  );
}

/**
 * Check if user has all of the required permissions
 * @param userPermissions - Array of permissions the user has
 * @param requiredPermissions - Array of permissions to check for
 * @returns Boolean indicating if user has all of the required permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission)
  );
}

/**
 * Get permissions for a specific role
 * Used during staff creation to assign role-based permissions
 * @param role - The staff role
 * @returns Array of permissions for the role
 */
export function getPermissionsForRole(role: StaffRole): Permission[] {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

/**
 * Check if a permission is valid
 * @param permission - The permission to validate
 * @returns Boolean indicating if the permission is valid
 */
export function isValidPermission(permission: string): boolean {
  const allPermissions = Object.values(PERMISSIONS);
  return allPermissions.includes(permission as Permission);
}

/**
 * Get all available permissions
 * @returns Array of all available permissions
 */
export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSIONS);
}

/**
 * Check if a role is valid
 * @param role - The role to validate
 * @returns Boolean indicating if the role is valid
 */
export function isValidRole(role: string): role is StaffRole {
  return ["reception", "kitchen", "bar", "accountant"].includes(role);
}

/**
 * Get permissions that are common across multiple roles
 * @param roles - Array of roles to find common permissions for
 * @returns Array of permissions common to all specified roles
 */
export function getCommonPermissions(roles: StaffRole[]): Permission[] {
  if (roles.length === 0) return [];
  if (roles.length === 1) return getPermissionsForRole(roles[0]);

  const firstRolePermissions = getPermissionsForRole(roles[0]);
  return firstRolePermissions.filter((permission) =>
    roles.every((role) => getPermissionsForRole(role).includes(permission))
  );
}

/**
 * Get permissions that are unique to a specific role
 * @param role - The role to get unique permissions for
 * @param compareRoles - Array of roles to compare against
 * @returns Array of permissions unique to the specified role
 */
export function getUniquePermissions(
  role: StaffRole,
  compareRoles: StaffRole[]
): Permission[] {
  const rolePermissions = getPermissionsForRole(role);
  const comparePermissions = compareRoles.flatMap((r) =>
    getPermissionsForRole(r)
  );

  return rolePermissions.filter(
    (permission) => !comparePermissions.includes(permission)
  );
}

/**
 * Validate permissions array
 * @param permissions - Array of permissions to validate
 * @returns Object with validation result and invalid permissions
 */
export function validatePermissions(permissions: string[]): {
  isValid: boolean;
  invalidPermissions: string[];
} {
  const invalidPermissions = permissions.filter(
    (permission) => !isValidPermission(permission)
  );

  return {
    isValid: invalidPermissions.length === 0,
    invalidPermissions,
  };
}

/**
 * Create permission groups for UI organization
 * @returns Object with permissions grouped by category
 */
export function getPermissionGroups() {
  return {
    orders: {
      label: "Order Management",
      permissions: [
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.ORDERS_UPDATE,
        PERMISSIONS.ORDERS_UPDATE_STATUS,
        PERMISSIONS.ORDERS_DELETE,
      ],
    },
    tables: {
      label: "Table Management",
      permissions: [
        PERMISSIONS.TABLES_READ,
        PERMISSIONS.TABLES_UPDATE,
        PERMISSIONS.TABLES_ASSIGN,
      ],
    },
    customers: {
      label: "Customer Management",
      permissions: [
        PERMISSIONS.CUSTOMERS_READ,
        PERMISSIONS.CUSTOMERS_UPDATE,
        PERMISSIONS.CUSTOMERS_CREATE,
      ],
    },
    payments: {
      label: "Payment Processing",
      permissions: [
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.PAYMENTS_READ,
        PERMISSIONS.PAYMENTS_REFUND,
      ],
    },
    inventory: {
      label: "Inventory Management",
      permissions: [
        PERMISSIONS.INVENTORY_READ,
        PERMISSIONS.INVENTORY_UPDATE,
        PERMISSIONS.INVENTORY_ALERTS,
        PERMISSIONS.INVENTORY_RESTOCK_REQUESTS,
      ],
    },
    reports: {
      label: "Reports & Analytics",
      permissions: [
        PERMISSIONS.REPORTS_READ,
        PERMISSIONS.REPORTS_GENERATE,
        PERMISSIONS.TRANSACTIONS_READ,
        PERMISSIONS.TRANSACTIONS_UPDATE,
      ],
    },
  };
}

/**
 * Check if user can perform a specific action based on permissions
 * @param userPermissions - Array of permissions the user has
 * @param action - The action to check (maps to specific permissions)
 * @returns Boolean indicating if user can perform the action
 */
export function canPerformAction(
  userPermissions: string[],
  action: string
): boolean {
  // Map actions to required permissions
  const actionPermissionMap: Record<string, string[]> = {
    create_order: [PERMISSIONS.ORDERS_CREATE],
    view_orders: [PERMISSIONS.ORDERS_READ],
    update_order: [PERMISSIONS.ORDERS_UPDATE],
    update_order_status: [PERMISSIONS.ORDERS_UPDATE_STATUS],
    manage_tables: [PERMISSIONS.TABLES_READ, PERMISSIONS.TABLES_UPDATE],
    process_payment: [PERMISSIONS.PAYMENTS_PROCESS],
    view_reports: [PERMISSIONS.REPORTS_READ],
    generate_reports: [PERMISSIONS.REPORTS_GENERATE],
    manage_inventory: [
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_UPDATE,
    ],
    view_customers: [PERMISSIONS.CUSTOMERS_READ],
    manage_customers: [
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_UPDATE,
    ],
  };

  const requiredPermissions = actionPermissionMap[action];
  if (!requiredPermissions) {
    console.warn(`Unknown action: ${action}`);
    return false;
  }

  return hasAnyPermission(userPermissions, requiredPermissions);
}
