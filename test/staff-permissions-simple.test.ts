import { describe, it, expect } from "vitest";
import {
  getPermissionsForRole,
  isValidPermission,
  getAllPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  ROLE_PERMISSIONS,
} from "@/lib/staff-permissions";

describe("Staff Permissions - Core Functions", () => {
  describe("ROLE_PERMISSIONS constant", () => {
    it("should have permissions defined for all roles", () => {
      expect(ROLE_PERMISSIONS.reception).toBeDefined();
      expect(ROLE_PERMISSIONS.kitchen).toBeDefined();
      expect(ROLE_PERMISSIONS.bar).toBeDefined();
      expect(ROLE_PERMISSIONS.accountant).toBeDefined();
    });

    it("should have reception permissions", () => {
      const receptionPermissions = ROLE_PERMISSIONS.reception;
      expect(receptionPermissions).toContain("orders:create");
      expect(receptionPermissions).toContain("orders:read");
      expect(receptionPermissions).toContain("tables:read");
      expect(receptionPermissions).toContain("payments:process");
    });

    it("should have kitchen permissions", () => {
      const kitchenPermissions = ROLE_PERMISSIONS.kitchen;
      expect(kitchenPermissions).toContain("orders:read");
      expect(kitchenPermissions).toContain("orders:update_status");
      expect(kitchenPermissions).toContain("inventory:read");
      expect(kitchenPermissions).toContain("inventory:update");
    });

    it("should have bar permissions", () => {
      const barPermissions = ROLE_PERMISSIONS.bar;
      expect(barPermissions).toContain("orders:read");
      expect(barPermissions).toContain("orders:update_status");
      expect(barPermissions).toContain("inventory:read");
      expect(barPermissions).toContain("inventory:restock_requests");
    });

    it("should have accountant permissions", () => {
      const accountantPermissions = ROLE_PERMISSIONS.accountant;
      expect(accountantPermissions).toContain("reports:read");
      expect(accountantPermissions).toContain("reports:generate");
      expect(accountantPermissions).toContain("transactions:read");
      expect(accountantPermissions).toContain("payments:refund");
    });
  });

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
      expect(isValidPermission("orders:read")).toBe(true);
      expect(isValidPermission("payments:process")).toBe(true);
      expect(isValidPermission("reports:generate")).toBe(true);
    });

    it("should return false for invalid permissions", () => {
      expect(isValidPermission("invalid:permission")).toBe(false);
      expect(isValidPermission("orders:invalid")).toBe(false);
      expect(isValidPermission("")).toBe(false);
    });
  });

  describe("getAllPermissions", () => {
    it("should return all available permissions", () => {
      const allPermissions = getAllPermissions();

      expect(allPermissions).toContain("orders:read");
      expect(allPermissions).toContain("payments:process");
      expect(allPermissions).toContain("reports:generate");
      expect(allPermissions.length).toBeGreaterThan(0);
    });

    it("should not contain duplicates", () => {
      const allPermissions = getAllPermissions();
      const uniquePermissions = [...new Set(allPermissions)];

      expect(allPermissions.length).toBe(uniquePermissions.length);
    });
  });

  describe("hasPermission", () => {
    it("should return true when user has the required permission", () => {
      const userPermissions = ["orders:read", "orders:create"];

      expect(hasPermission(userPermissions, "orders:read")).toBe(true);
      expect(hasPermission(userPermissions, "orders:create")).toBe(true);
    });

    it("should return false when user does not have the required permission", () => {
      const userPermissions = ["orders:read"];

      expect(hasPermission(userPermissions, "orders:create")).toBe(false);
      expect(hasPermission(userPermissions, "payments:process")).toBe(false);
    });

    it("should handle empty permissions array", () => {
      const userPermissions: string[] = [];

      expect(hasPermission(userPermissions, "orders:read")).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true when user has any of the required permissions", () => {
      const userPermissions = ["orders:read", "tables:read"];
      const requiredPermissions = ["orders:create", "orders:read"];

      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return false when user has none of the required permissions", () => {
      const userPermissions = ["orders:read"];
      const requiredPermissions = ["payments:process", "reports:read"];

      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(
        false
      );
    });

    it("should handle empty required permissions array", () => {
      const userPermissions = ["orders:read"];
      const requiredPermissions: string[] = [];

      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(
        false
      );
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true when user has all required permissions", () => {
      const userPermissions = ["orders:read", "orders:create", "tables:read"];
      const requiredPermissions = ["orders:read", "orders:create"];

      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(
        true
      );
    });

    it("should return false when user is missing some required permissions", () => {
      const userPermissions = ["orders:read"];
      const requiredPermissions = ["orders:read", "orders:create"];

      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(
        false
      );
    });

    it("should return true for empty required permissions array", () => {
      const userPermissions = ["orders:read"];
      const requiredPermissions: string[] = [];

      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(
        true
      );
    });
  });
});
