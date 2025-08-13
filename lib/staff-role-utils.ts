/**
 * Utilities for staff role management and permission assignment
 * Used during staff creation and role updates
 */

import { StaffRole } from "@/types/auth";
import {
  getPermissionsForRole,
  isValidRole,
  validatePermissions,
  ROLE_PERMISSIONS,
  Permission,
} from "./permissions";

// Re-export commonly used functions for convenience
export { isValidRole } from "./permissions";

/**
 * Interface for staff creation data
 */
export interface StaffCreationData {
  firstName: string;
  lastName: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
  role: StaffRole;
  customPermissions?: string[];
  pin: string;
}

/**
 * Interface for role assignment result
 */
export interface RoleAssignmentResult {
  success: boolean;
  permissions: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Assign permissions to staff based on their role
 * This is the core function used during staff creation
 * @param role - The staff role
 * @param customPermissions - Optional custom permissions to add/override
 * @returns Role assignment result with permissions and validation
 */
export function assignRolePermissions(
  role: StaffRole,
  customPermissions: string[] = []
): RoleAssignmentResult {
  const result: RoleAssignmentResult = {
    success: false,
    permissions: [],
    errors: [],
    warnings: [],
  };

  // Validate role
  if (!isValidRole(role)) {
    result.errors.push(`Invalid role: ${role}`);
    return result;
  }

  // Get base permissions for role
  const basePermissions = getPermissionsForRole(role);

  // Combine base permissions with custom permissions
  const allPermissions = [
    ...new Set([...basePermissions, ...customPermissions]),
  ];

  // Validate all permissions
  const validation = validatePermissions(allPermissions);
  if (!validation.isValid) {
    result.errors.push(
      `Invalid permissions: ${validation.invalidPermissions.join(", ")}`
    );
    return result;
  }

  // Check for permissions that don't belong to the role
  const rolePermissions = getPermissionsForRole(role);
  const extraPermissions = customPermissions.filter(
    (permission) => !rolePermissions.includes(permission as Permission)
  );

  if (extraPermissions.length > 0) {
    result.warnings.push(
      `Permissions not typically assigned to ${role} role: ${extraPermissions.join(
        ", "
      )}`
    );
  }

  result.success = true;
  result.permissions = allPermissions;

  return result;
}

/**
 * Validate staff creation data
 * @param data - Staff creation data
 * @returns Validation result
 */
export function validateStaffCreationData(data: StaffCreationData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!data.firstName?.trim()) {
    errors.push("First name is required");
  }

  if (!data.lastName?.trim()) {
    errors.push("Last name is required");
  }

  if (!data.role) {
    errors.push("Role is required");
  } else if (!isValidRole(data.role)) {
    errors.push(`Invalid role: ${data.role}`);
  }

  if (!data.pin?.trim()) {
    errors.push("PIN is required");
  } else if (data.pin.length < 4) {
    errors.push("PIN must be at least 4 characters");
  } else if (data.pin.length > 8) {
    errors.push("PIN must be no more than 8 characters");
  }

  // Validate email if provided
  if (data.email && !isValidEmail(data.email)) {
    errors.push("Invalid email format");
  }

  // Validate phone number if provided
  if (data.phoneNumber && !isValidPhoneNumber(data.phoneNumber)) {
    warnings.push("Phone number format may be invalid");
  }

  // Validate custom permissions if provided
  if (data.customPermissions && data.customPermissions.length > 0) {
    const permissionValidation = validatePermissions(data.customPermissions);
    if (!permissionValidation.isValid) {
      errors.push(
        `Invalid custom permissions: ${permissionValidation.invalidPermissions.join(
          ", "
        )}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get role description and capabilities
 * @param role - The staff role
 * @returns Role information object
 */
export function getRoleInfo(role: StaffRole): {
  name: string;
  description: string;
  capabilities: string[];
  permissions: Permission[];
} {
  const roleInfo = {
    reception: {
      name: "Reception Staff",
      description:
        "Handles customer service, orders, and front-of-house operations",
      capabilities: [
        "Create and manage customer orders",
        "Assign and manage table seating",
        "Process payments and handle transactions",
        "Access customer information and history",
        "Update order status and communicate with kitchen/bar",
      ],
    },
    kitchen: {
      name: "Kitchen Staff",
      description: "Manages food preparation and kitchen operations",
      capabilities: [
        "View and manage kitchen orders",
        "Update order preparation status",
        "Monitor and update kitchen inventory",
        "Create low stock alerts",
        "Track food preparation times",
      ],
    },
    bar: {
      name: "Bar Staff",
      description: "Handles beverage preparation and bar operations",
      capabilities: [
        "View and manage beverage orders",
        "Update drink preparation status",
        "Monitor and update bar inventory",
        "Create restock requests",
        "Track beverage preparation times",
      ],
    },
    accountant: {
      name: "Accountant",
      description: "Manages financial operations and reporting",
      capabilities: [
        "Generate financial reports",
        "View transaction history",
        "Process refunds and handle disputes",
        "Access payment and revenue data",
        "Monitor business financial performance",
      ],
    },
  };

  const info = roleInfo[role];
  const permissions = getPermissionsForRole(role);

  return {
    ...info,
    permissions,
  };
}

/**
 * Get all available roles with their information
 * @returns Array of role information objects
 */
export function getAllRoles() {
  const roles: StaffRole[] = ["reception", "kitchen", "bar", "accountant"];
  return roles.map((role) => ({
    role,
    ...getRoleInfo(role),
  }));
}

/**
 * Check if a role can be assigned to a staff member
 * @param role - The role to check
 * @param businessType - Optional business type for role compatibility
 * @returns Boolean indicating if role can be assigned
 */
export function canAssignRole(role: StaffRole, businessType?: string): boolean {
  // Basic validation
  if (!isValidRole(role)) {
    return false;
  }

  // Business type specific validation (if needed)
  if (businessType) {
    // For example, some business types might not need bar staff
    if (businessType === "cafe" && role === "bar") {
      return false;
    }
  }

  return true;
}

/**
 * Get recommended roles for a business type
 * @param businessType - The type of business
 * @returns Array of recommended roles
 */
export function getRecommendedRoles(businessType: string): StaffRole[] {
  const roleRecommendations: Record<string, StaffRole[]> = {
    restaurant: ["reception", "kitchen", "bar", "accountant"],
    cafe: ["reception", "kitchen", "accountant"],
    bar: ["reception", "bar", "accountant"],
    "fast-food": ["reception", "kitchen", "accountant"],
    default: ["reception", "kitchen", "accountant"],
  };

  return roleRecommendations[businessType] || roleRecommendations.default;
}

/**
 * Simple email validation
 * @param email - Email to validate
 * @returns Boolean indicating if email is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Simple phone number validation
 * @param phoneNumber - Phone number to validate
 * @returns Boolean indicating if phone number is valid
 */
function isValidPhoneNumber(phoneNumber: string): boolean {
  // Basic validation - adjust based on your requirements
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ""));
}

/**
 * Create staff member with role-based permissions
 * This function combines validation and permission assignment
 * @param data - Staff creation data
 * @returns Result with staff data and assigned permissions
 */
export function prepareStaffCreation(data: StaffCreationData): {
  success: boolean;
  staffData?: {
    firstName: string;
    lastName: string;
    email?: string;
    username?: string;
    phoneNumber?: string;
    role: StaffRole;
    permissions: string[];
  };
  errors: string[];
  warnings: string[];
} {
  // Validate input data
  const validation = validateStaffCreationData(data);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  // Assign role-based permissions
  const roleAssignment = assignRolePermissions(
    data.role,
    data.customPermissions
  );
  if (!roleAssignment.success) {
    return {
      success: false,
      errors: roleAssignment.errors,
      warnings: [...validation.warnings, ...roleAssignment.warnings],
    };
  }

  return {
    success: true,
    staffData: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email?.trim(),
      username: data.username?.trim(),
      phoneNumber: data.phoneNumber?.trim(),
      role: data.role,
      permissions: roleAssignment.permissions,
    },
    errors: [],
    warnings: [...validation.warnings, ...roleAssignment.warnings],
  };
}
