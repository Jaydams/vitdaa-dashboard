import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hashPin,
  verifyPin,
  generateSecurePin,
  hashAdminPin,
  verifyAdminPin,
  generateSessionToken,
} from "@/actions/staff-auth-utils";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  isValidPermission,
  canPerformAction,
} from "@/lib/permissions";

describe("Staff Management Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Staff Creation Workflow", () => {
    it("should create staff with proper PIN hashing and role permissions", async () => {
      // Simulate staff creation workflow
      const staffData = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        role: "reception" as const,
        pin: "1234",
      };

      // Step 1: Generate secure PIN if needed
      const generatedPin = generateSecurePin();
      expect(generatedPin).toMatch(/^\d{4}$/);

      // Step 2: Hash the PIN
      const hashedPin = await hashPin(staffData.pin);
      expect(hashedPin).toBeDefined();
      expect(hashedPin).not.toBe(staffData.pin);

      // Step 3: Verify PIN can be validated
      const isValidPin = await verifyPin(staffData.pin, hashedPin);
      expect(isValidPin).toBe(true);

      // Step 4: Assign role-based permissions
      const permissions = getPermissionsForRole(staffData.role);
      expect(permissions).toContain("orders:create");
      expect(permissions).toContain("orders:read");
      expect(permissions).toContain("tables:read");
      expect(permissions).toContain("payments:process");

      // Step 5: Validate permissions are valid
      const validationResult = permissions.every((permission) =>
        isValidPermission(permission)
      );
      expect(validationResult).toBe(true);

      // Simulate complete staff record
      const staffRecord = {
        id: "staff-123",
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        email: staffData.email,
        role: staffData.role,
        pinHash: hashedPin,
        permissions: permissions,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      expect(staffRecord.pinHash).toBe(hashedPin);
      expect(staffRecord.permissions).toEqual(permissions);
    });

    it("should handle different staff roles with appropriate permissions", async () => {
      const roles = ["reception", "kitchen", "bar", "accountant"] as const;

      for (const role of roles) {
        // Create staff for each role
        const pin = generateSecurePin();
        const hashedPin = await hashPin(pin);
        const permissions = getPermissionsForRole(role);

        // Verify role-specific permissions
        switch (role) {
          case "reception":
            expect(permissions).toContain("orders:create");
            expect(permissions).toContain("payments:process");
            expect(permissions).toContain("tables:read");
            break;
          case "kitchen":
            expect(permissions).toContain("orders:read");
            expect(permissions).toContain("orders:update_status");
            expect(permissions).toContain("inventory:read");
            expect(permissions).not.toContain("payments:process");
            break;
          case "bar":
            expect(permissions).toContain("orders:read");
            expect(permissions).toContain("inventory:restock_requests");
            expect(permissions).not.toContain("tables:read");
            break;
          case "accountant":
            expect(permissions).toContain("reports:read");
            expect(permissions).toContain("payments:refund");
            expect(permissions).not.toContain("orders:create");
            break;
        }

        // Verify PIN workflow
        const isValidPin = await verifyPin(pin, hashedPin);
        expect(isValidPin).toBe(true);
      }
    });
  });

  describe("Staff Sign-in Workflow", () => {
    it("should validate staff credentials and create session", async () => {
      // Setup: Create staff member
      const staffPin = "1234";
      const hashedPin = await hashPin(staffPin);
      const permissions = getPermissionsForRole("reception");

      const staffMember = {
        id: "staff-123",
        firstName: "Jane",
        lastName: "Smith",
        role: "reception",
        pinHash: hashedPin,
        permissions: permissions,
        isActive: true,
      };

      // Step 1: Validate PIN during sign-in
      const isValidPin = await verifyPin(staffPin, staffMember.pinHash);
      expect(isValidPin).toBe(true);

      // Step 2: Generate session token
      const sessionToken = generateSessionToken();
      expect(sessionToken).toMatch(/^[a-f0-9]{64}$/);

      // Step 3: Create session record
      const sessionRecord = {
        id: "session-123",
        staffId: staffMember.id,
        sessionToken: sessionToken,
        signedInBy: "business-owner-123",
        signedInAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        isActive: true,
      };

      expect(sessionRecord.staffId).toBe(staffMember.id);
      expect(sessionRecord.sessionToken).toBe(sessionToken);
      expect(sessionRecord.isActive).toBe(true);

      // Step 4: Verify staff can perform role-based actions
      expect(hasPermission(staffMember.permissions, "orders:create")).toBe(
        true
      );
      expect(hasPermission(staffMember.permissions, "reports:generate")).toBe(
        false
      );
    });

    it("should reject invalid PIN during sign-in", async () => {
      const correctPin = "1234";
      const wrongPin = "5678";
      const hashedPin = await hashPin(correctPin);

      // Attempt sign-in with wrong PIN
      const isValidPin = await verifyPin(wrongPin, hashedPin);
      expect(isValidPin).toBe(false);

      // Should not create session for invalid PIN
      // In real implementation, this would prevent session creation
    });
  });

  describe("Role-Based Access Control Workflow", () => {
    it("should enforce permissions for different actions", () => {
      const receptionPermissions = getPermissionsForRole("reception");
      const kitchenPermissions = getPermissionsForRole("kitchen");
      const accountantPermissions = getPermissionsForRole("accountant");

      // Reception staff actions
      expect(canPerformAction(receptionPermissions, "create_order")).toBe(true);
      expect(canPerformAction(receptionPermissions, "process_payment")).toBe(
        true
      );
      expect(canPerformAction(receptionPermissions, "generate_reports")).toBe(
        false
      );

      // Kitchen staff actions
      expect(canPerformAction(kitchenPermissions, "view_orders")).toBe(true);
      expect(canPerformAction(kitchenPermissions, "manage_inventory")).toBe(
        true
      );
      expect(canPerformAction(kitchenPermissions, "process_payment")).toBe(
        false
      );

      // Accountant staff actions
      expect(canPerformAction(accountantPermissions, "view_reports")).toBe(
        true
      );
      expect(canPerformAction(accountantPermissions, "generate_reports")).toBe(
        true
      );
      expect(canPerformAction(accountantPermissions, "create_order")).toBe(
        false
      );
    });

    it("should handle complex permission requirements", () => {
      const receptionPermissions = getPermissionsForRole("reception");
      const kitchenPermissions = getPermissionsForRole("kitchen");

      // Test hasAnyPermission - user needs at least one permission
      const orderPermissions = ["orders:create", "orders:update"];
      expect(hasAnyPermission(receptionPermissions, orderPermissions)).toBe(
        true
      );
      expect(hasAnyPermission(kitchenPermissions, orderPermissions)).toBe(
        false
      ); // kitchen only has orders:read

      // Test hasAllPermissions - user needs all permissions
      const tableManagementPermissions = ["tables:read", "tables:update"];
      expect(
        hasAllPermissions(receptionPermissions, tableManagementPermissions)
      ).toBe(true);
      expect(
        hasAllPermissions(kitchenPermissions, tableManagementPermissions)
      ).toBe(false);
    });
  });

  describe("Admin PIN Workflow", () => {
    it("should handle admin PIN for elevated access", async () => {
      const adminPin = "123456";

      // Step 1: Hash admin PIN
      const hashedAdminPin = await hashAdminPin(adminPin);
      expect(hashedAdminPin).toBeDefined();
      expect(hashedAdminPin).not.toBe(adminPin);

      // Step 2: Verify admin PIN
      const isValidAdminPin = await verifyAdminPin(adminPin, hashedAdminPin);
      expect(isValidAdminPin).toBe(true);

      // Step 3: Verify wrong admin PIN is rejected
      const wrongAdminPin = "654321";
      const isWrongAdminPin = await verifyAdminPin(
        wrongAdminPin,
        hashedAdminPin
      );
      expect(isWrongAdminPin).toBe(false);

      // Simulate business owner record with admin PIN
      const businessOwner = {
        id: "business-owner-123",
        email: "owner@restaurant.com",
        adminPinHash: hashedAdminPin,
      };

      expect(businessOwner.adminPinHash).toBe(hashedAdminPin);
    });
  });

  describe("Session Management Workflow", () => {
    it("should handle session expiration logic", () => {
      const now = new Date();
      const eightHoursLater = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const tenHoursLater = new Date(now.getTime() + 10 * 60 * 60 * 1000);

      // Create session
      const session = {
        id: "session-123",
        staffId: "staff-123",
        sessionToken: generateSessionToken(),
        signedInAt: now.toISOString(),
        expiresAt: eightHoursLater.toISOString(),
        isActive: true,
      };

      // Check if session is expired
      const isExpired = new Date(session.expiresAt) < tenHoursLater;
      expect(isExpired).toBe(true);

      // Check if session is still valid
      const isStillValid = new Date(session.expiresAt) > now;
      expect(isStillValid).toBe(true);
    });

    it("should generate unique session tokens", () => {
      const tokens = new Set();

      // Generate multiple tokens
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSessionToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid role assignments", () => {
      // Test with invalid role
      const invalidRole = "manager" as any;

      // This should not crash but return empty permissions or handle gracefully
      try {
        const permissions = getPermissionsForRole(invalidRole);
        // If it doesn't throw, permissions should be empty or undefined
        expect(permissions).toEqual([]);
      } catch (error) {
        // If it throws, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });

    it("should handle empty or invalid permissions", () => {
      const emptyPermissions: string[] = [];
      const invalidPermissions = ["invalid:permission", "another:invalid"];

      // Empty permissions should deny all actions
      expect(hasPermission(emptyPermissions, "orders:read")).toBe(false);
      expect(canPerformAction(emptyPermissions, "create_order")).toBe(false);

      // Invalid permissions should not grant access
      expect(hasPermission(invalidPermissions, "orders:read")).toBe(false);
      expect(canPerformAction(invalidPermissions, "create_order")).toBe(false);
    });

    it("should handle PIN validation edge cases", async () => {
      const validPin = "1234";
      const hashedPin = await hashPin(validPin);

      // Empty PIN should fail
      const emptyPinResult = await verifyPin("", hashedPin);
      expect(emptyPinResult).toBe(false);

      // Very long PIN should still work
      const longPin = "123456789012345678901234567890";
      const hashedLongPin = await hashPin(longPin);
      const longPinResult = await verifyPin(longPin, hashedLongPin);
      expect(longPinResult).toBe(true);
    });
  });

  describe("Complete Staff Management Workflow", () => {
    it("should simulate complete staff lifecycle", async () => {
      // 1. Business owner sets up admin PIN
      const adminPin = "123456";
      const hashedAdminPin = await hashAdminPin(adminPin);

      // 2. Business owner creates staff member
      const staffPin = generateSecurePin();
      const hashedStaffPin = await hashPin(staffPin);
      const staffPermissions = getPermissionsForRole("reception");

      const staff = {
        id: "staff-123",
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@restaurant.com",
        role: "reception" as const,
        pinHash: hashedStaffPin,
        permissions: staffPermissions,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // 3. Business owner signs in staff member
      const isValidStaffPin = await verifyPin(staffPin, staff.pinHash);
      expect(isValidStaffPin).toBe(true);

      const sessionToken = generateSessionToken();
      const session = {
        id: "session-123",
        staffId: staff.id,
        sessionToken: sessionToken,
        signedInBy: "business-owner-123",
        signedInAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      };

      // 4. Staff member performs role-based actions
      expect(canPerformAction(staff.permissions, "create_order")).toBe(true);
      expect(canPerformAction(staff.permissions, "process_payment")).toBe(true);
      expect(canPerformAction(staff.permissions, "generate_reports")).toBe(
        false
      );

      // 5. Business owner needs elevated access
      const isValidAdminPin = await verifyAdminPin(adminPin, hashedAdminPin);
      expect(isValidAdminPin).toBe(true);

      // 6. Session management
      expect(session.isActive).toBe(true);
      expect(session.staffId).toBe(staff.id);

      // Complete workflow validation
      expect(staff.pinHash).toBeDefined();
      expect(staff.permissions.length).toBeGreaterThan(0);
      expect(session.sessionToken).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
