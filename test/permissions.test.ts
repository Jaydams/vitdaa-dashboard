import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  isValidPermission,
  getAllPermissions,
  isValidRole,
  getCommonPermissions,
  getUniquePermissions,
  validatePermissions,
  getPermissionGroups,
  canPerformAction,
} from "@/lib/permissions";
import { StaffRole } from "@/types/auth";

describe("Permission Constants", () => {
  it("should have all required permission constants", () => {
    expect(PERMISSIONS.ORDERS_CREATE).toBe("orders:create");
    expect(PERMISSIONS.ORDERS_READ).toBe("orders:read");
    expect(PERMISSIONS.ORDERS_UPDATE).toBe("orders:update");
    expect(PERMISSIONS.ORDERS_UPDATE_STATUS).toBe("orders:update_status");
    expect(PERMISSIONS.TABLES_READ).toBe("tables:read");
    expect(PERMISSIONS.TABLES_UPDATE).toBe("tables:update");
    expect(PERMISSIONS.CUSTOMERS_READ).toBe("customers:read");
    expect(PERMISSIONS.PAYMENTS_PROCESS).toBe("payments:process");
    expect(PERMISSIONS.INVENTORY_READ).toBe("inventory:read");
    expect(PERMISSIONS.INVENTORY_UPDATE).toBe("inventory:update");
    expect(PERMISSIONS.REPORTS_READ).toBe("reports:read");
    expect(PERMISSIONS.REPORTS_GENERATE).toBe("reports:generate");
  });

  it("should have role permissions defined for all roles", () => {
    expect(ROLE_PERMISSIONS.reception).toBeDefined();
    expect(ROLE_PERMISSIONS.kitchen).toBeDefined();
    expect(ROLE_PERMISSIONS.bar).toBeDefined();
    expect(ROLE_PERMISSIONS.accountant).toBeDefined();
  });
});

describe("Role-Based Permissions", () => {
  describe("Reception role permissions", () => {
    it("should have correct permissions for reception role", () => {
      const receptionPermissions = ROLE_PERMISSIONS.reception;

      expect(receptionPermissions).toContain(PERMISSIONS.ORDERS_CREATE);
      expect(receptionPermissions).toContain(PERMISSIONS.ORDERS_READ);
      expect(receptionPermissions).toContain(PERMISSIONS.ORDERS_UPDATE);
      expect(receptionPermissions).toContain(PERMISSIONS.TABLES_READ);
      expect(receptionPermissions).toContain(PERMISSIONS.TABLES_UPDATE);
      expect(receptionPermissions).toContain(PERMISSIONS.CUSTOMERS_READ);
      expect(receptionPermissions).toContain(PERMISSIONS.PAYMENTS_PROCESS);
    });

    it("should not have kitchen-specific permissions", () => {
      const receptionPermissions = ROLE_PERMISSIONS.reception;

      expect(receptionPermissions).not.toContain(PERMISSIONS.INVENTORY_ALERTS);
    });
  });

  describe("Kitchen role permissions", () => {
    it("should have correct permissions for kitchen role", () => {
      const kitchenPermissions = ROLE_PERMISSIONS.kitchen;

      expect(kitchenPermissions).toContain(PERMISSIONS.ORDERS_READ);
      expect(kitchenPermissions).toContain(PERMISSIONS.ORDERS_UPDATE_STATUS);
      expect(kitchenPermissions).toContain(PERMISSIONS.INVENTORY_READ);
      expect(kitchenPermissions).toContain(PERMISSIONS.INVENTORY_UPDATE);
      expect(kitchenPermissions).toContain(PERMISSIONS.INVENTORY_ALERTS);
    });

    it("should not have payment processing permissions", () => {
      const kitchenPermissions = ROLE_PERMISSIONS.kitchen;

      expect(kitchenPermissions).not.toContain(PERMISSIONS.PAYMENTS_PROCESS);
      expect(kitchenPermissions).not.toContain(PERMISSIONS.PAYMENTS_REFUND);
    });
  });

  describe("Bar role permissions", () => {
    it("should have correct permissions for bar role", () => {
      const barPermissions = ROLE_PERMISSIONS.bar;

      expect(barPermissions).toContain(PERMISSIONS.ORDERS_READ);
      expect(barPermissions).toContain(PERMISSIONS.ORDERS_UPDATE_STATUS);
      expect(barPermissions).toContain(PERMISSIONS.INVENTORY_READ);
      expect(barPermissions).toContain(PERMISSIONS.INVENTORY_UPDATE);
      expect(barPermissions).toContain(PERMISSIONS.INVENTORY_RESTOCK_REQUESTS);
    });

    it("should not have table management permissions", () => {
      const barPermissions = ROLE_PERMISSIONS.bar;

      expect(barPermissions).not.toContain(PERMISSIONS.TABLES_UPDATE);
      expect(barPermissions).not.toContain(PERMISSIONS.TABLES_ASSIGN);
    });
  });

  describe("Accountant role permissions", () => {
    it("should have correct permissions for accountant role", () => {
      const accountantPermissions = ROLE_PERMISSIONS.accountant;

      expect(accountantPermissions).toContain(PERMISSIONS.REPORTS_READ);
      expect(accountantPermissions).toContain(PERMISSIONS.REPORTS_GENERATE);
      expect(accountantPermissions).toContain(PERMISSIONS.TRANSACTIONS_READ);
      expect(accountantPermissions).toContain(PERMISSIONS.PAYMENTS_READ);
      expect(accountantPermissions).toContain(PERMISSIONS.PAYMENTS_REFUND);
    });

    it("should not have inventory management permissions", () => {
      const accountantPermissions = ROLE_PERMISSIONS.accountant;

      expect(accountantPermissions).not.toContain(PERMISSIONS.INVENTORY_UPDATE);
      expect(accountantPermissions).not.toContain(PERMISSIONS.INVENTORY_ALERTS);
    });
  });
});

describe("Permission Checking Functions", () => {
  describe("hasPermission", () => {
    it("should return true when user has the required permission", () => {
      const userPermissions = [
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.ORDERS_CREATE,
      ];

      expect(hasPermission(userPermissions, PERMISSIONS.ORDERS_READ)).toBe(
        true
      );
      expect(hasPermission(userPermissions, PERMISSIONS.ORDERS_CREATE)).toBe(
        true
      );
    });

    it("should return false when user does not have the required permission", () => {
      const userPermissions = [PERMISSIONS.ORDERS_READ];

      expect(hasPermission(userPermissions, PERMISSIONS.ORDERS_CREATE)).toBe(
        false
      );
      expect(hasPermission(userPermissions, PERMISSIONS.PAYMENTS_PROCESS)).toBe(
        false
      );
    });

    it("should handle empty permissions array", () => {
      const userPermissions: string[] = [];

      expect(hasPermission(userPermissions, PERMISSIONS.ORDERS_READ)).toBe(
        false
      );
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true when user has any of the required permissions", () => {
      const userPermissions = [
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.TABLES_READ,
      ];
      const requiredPermissions = [
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.ORDERS_READ,
      ];

      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return false when user has none of the required permissions", () => {
      const userPermissions = [PERMISSIONS.ORDERS_READ];
      const requiredPermissions = [
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.REPORTS_READ,
      ];

      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(
        false
      );
    });

    it("should handle empty required permissions array", () => {
      const userPermissions = [PERMISSIONS.ORDERS_READ];
      const requiredPermissions: string[] = [];

      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(
        false
      );
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true when user has all required permissions", () => {
      const userPermissions = [
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.TABLES_READ,
      ];
      const requiredPermissions = [
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.ORDERS_CREATE,
      ];

      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(
        true
      );
    });

    it("should return false when user is missing some required permissions", () => {
      const userPermissions = [PERMISSIONS.ORDERS_READ];
      const requiredPermissions = [
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.ORDERS_CREATE,
      ];

      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(
        false
      );
    });

    it("should return true for empty required permissions array", () => {
      const userPermissions = [PERMISSIONS.ORDERS_READ];
      const requiredPermissions: string[] = [];

      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(
        true
      );
    });
  });
});

describe("Role and Permission Utilities", () => {
  describe("getPermissionsForRole", () => {
    it("should return correct permissions for each role", () => {
      expect(getPermissionsForRole("reception")).toEqual(
        ROLE_PERMISSIONS.reception
      );
      expect(getPermissionsForRole("kitchen")).toEqual(
        ROLE_PERMISSIONS.kitchen
      );
      expect(getPermissionsForRole("bar")).toEqual(ROLE_PERMISSIONS.bar);
      expect(getPermissionsForRole("accountant")).toEqual(
        ROLE_PERMISSIONS.accountant
      );
    });

    it("should return a copy of permissions array", () => {
      const permissions = getPermissionsForRole("reception");
      permissions.push("test:permission");

      // Original should not be modified
      expect(ROLE_PERMISSIONS.reception).not.toContain("test:permission");
    });
  });

  describe("isValidPermission", () => {
    it("should return true for valid permissions", () => {
      expect(isValidPermission(PERMISSIONS.ORDERS_READ)).toBe(true);
      expect(isValidPermission(PERMISSIONS.PAYMENTS_PROCESS)).toBe(true);
      expect(isValidPermission(PERMISSIONS.REPORTS_GENERATE)).toBe(true);
    });

    it("should return false for invalid permissions", () => {
      expect(isValidPermission("invalid:permission")).toBe(false);
      expect(isValidPermission("orders:invalid")).toBe(false);
      expect(isValidPermission("")).toBe(false);
    });
  });

  describe("isValidRole", () => {
    it("should return true for valid roles", () => {
      expect(isValidRole("reception")).toBe(true);
      expect(isValidRole("kitchen")).toBe(true);
      expect(isValidRole("bar")).toBe(true);
      expect(isValidRole("accountant")).toBe(true);
    });

    it("should return false for invalid roles", () => {
      expect(isValidRole("manager")).toBe(false);
      expect(isValidRole("admin")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole("RECEPTION")).toBe(false); // case sensitive
    });
  });

  describe("getAllPermissions", () => {
    it("should return all available permissions", () => {
      const allPermissions = getAllPermissions();

      expect(allPermissions).toContain(PERMISSIONS.ORDERS_READ);
      expect(allPermissions).toContain(PERMISSIONS.PAYMENTS_PROCESS);
      expect(allPermissions).toContain(PERMISSIONS.REPORTS_GENERATE);
      expect(allPermissions.length).toBeGreaterThan(0);
    });

    it("should not contain duplicates", () => {
      const allPermissions = getAllPermissions();
      const uniquePermissions = [...new Set(allPermissions)];

      expect(allPermissions.length).toBe(uniquePermissions.length);
    });
  });
});

describe("Advanced Permission Functions", () => {
  describe("getCommonPermissions", () => {
    it("should return permissions common to all specified roles", () => {
      const commonPermissions = getCommonPermissions(["kitchen", "bar"]);

      expect(commonPermissions).toContain(PERMISSIONS.ORDERS_READ);
      expect(commonPermissions).toContain(PERMISSIONS.ORDERS_UPDATE_STATUS);
      expect(commonPermissions).toContain(PERMISSIONS.INVENTORY_READ);
      expect(commonPermissions).toContain(PERMISSIONS.INVENTORY_UPDATE);
    });

    it("should return empty array when no common permissions exist", () => {
      const commonPermissions = getCommonPermissions([
        "reception",
        "accountant",
      ]);

      expect(commonPermissions).toEqual([]);
    });

    it("should handle single role", () => {
      const commonPermissions = getCommonPermissions(["reception"]);

      expect(commonPermissions).toEqual(ROLE_PERMISSIONS.reception);
    });

    it("should handle empty roles array", () => {
      const commonPermissions = getCommonPermissions([]);

      expect(commonPermissions).toEqual([]);
    });
  });

  describe("getUniquePermissions", () => {
    it("should return permissions unique to a role", () => {
      const uniquePermissions = getUniquePermissions("reception", [
        "kitchen",
        "bar",
      ]);

      expect(uniquePermissions).toContain(PERMISSIONS.PAYMENTS_PROCESS);
      expect(uniquePermissions).toContain(PERMISSIONS.TABLES_READ);
      expect(uniquePermissions).not.toContain(PERMISSIONS.ORDERS_READ); // common with kitchen/bar
    });

    it("should return all permissions when no comparison roles provided", () => {
      const uniquePermissions = getUniquePermissions("reception", []);

      expect(uniquePermissions).toEqual(ROLE_PERMISSIONS.reception);
    });
  });

  describe("validatePermissions", () => {
    it("should validate array of valid permissions", () => {
      const permissions = [
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.PAYMENTS_PROCESS,
      ];
      const result = validatePermissions(permissions);

      expect(result.isValid).toBe(true);
      expect(result.invalidPermissions).toEqual([]);
    });

    it("should identify invalid permissions", () => {
      const permissions = [
        PERMISSIONS.ORDERS_READ,
        "invalid:permission",
        "another:invalid",
      ];
      const result = validatePermissions(permissions);

      expect(result.isValid).toBe(false);
      expect(result.invalidPermissions).toEqual([
        "invalid:permission",
        "another:invalid",
      ]);
    });

    it("should handle empty permissions array", () => {
      const result = validatePermissions([]);

      expect(result.isValid).toBe(true);
      expect(result.invalidPermissions).toEqual([]);
    });
  });
});

describe("Action-Based Permission Checking", () => {
  describe("canPerformAction", () => {
    it("should allow action when user has required permissions", () => {
      const userPermissions = [
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.ORDERS_READ,
      ];

      expect(canPerformAction(userPermissions, "create_order")).toBe(true);
      expect(canPerformAction(userPermissions, "view_orders")).toBe(true);
    });

    it("should deny action when user lacks required permissions", () => {
      const userPermissions = [PERMISSIONS.ORDERS_READ];

      expect(canPerformAction(userPermissions, "process_payment")).toBe(false);
      expect(canPerformAction(userPermissions, "generate_reports")).toBe(false);
    });

    it("should handle unknown actions", () => {
      const userPermissions = [PERMISSIONS.ORDERS_READ];

      expect(canPerformAction(userPermissions, "unknown_action")).toBe(false);
    });

    it("should handle complex actions requiring multiple permissions", () => {
      const userPermissions = [
        PERMISSIONS.TABLES_READ,
        PERMISSIONS.TABLES_UPDATE,
        PERMISSIONS.INVENTORY_READ,
        PERMISSIONS.INVENTORY_UPDATE,
      ];

      expect(canPerformAction(userPermissions, "manage_tables")).toBe(true);
      expect(canPerformAction(userPermissions, "manage_inventory")).toBe(true);
    });
  });
});

describe("Permission Groups", () => {
  describe("getPermissionGroups", () => {
    it("should return organized permission groups", () => {
      const groups = getPermissionGroups();

      expect(groups.orders).toBeDefined();
      expect(groups.tables).toBeDefined();
      expect(groups.customers).toBeDefined();
      expect(groups.payments).toBeDefined();
      expect(groups.inventory).toBeDefined();
      expect(groups.reports).toBeDefined();
    });

    it("should have proper structure for each group", () => {
      const groups = getPermissionGroups();

      Object.values(groups).forEach((group) => {
        expect(group.label).toBeDefined();
        expect(group.permissions).toBeDefined();
        expect(Array.isArray(group.permissions)).toBe(true);
        expect(group.permissions.length).toBeGreaterThan(0);
      });
    });

    it("should contain valid permissions in each group", () => {
      const groups = getPermissionGroups();
      const allValidPermissions = getAllPermissions();

      Object.values(groups).forEach((group) => {
        group.permissions.forEach((permission) => {
          expect(allValidPermissions).toContain(permission);
        });
      });
    });
  });
});
