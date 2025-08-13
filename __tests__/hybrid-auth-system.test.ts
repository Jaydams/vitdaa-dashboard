import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hybridAuth,
  HybridAuthManager,
} from "../lib/hybrid-auth-system";

// Mock the Supabase client
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockSessionData, error: null })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockSessionData, error: null })),
            order: vi.fn(() => ({ data: [mockSessionData], error: null })),
          })),
          order: vi.fn(() => ({ data: [mockSessionData], error: null })),
          in: vi.fn(() => ({ data: [mockSessionData], error: null })),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => ({ data: [mockSessionData], error: null })),
          })),
        })),
        order: vi.fn(() => ({ data: [mockSessionData], error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
    auth: {
      signInWithPassword: vi.fn(() => ({
        data: { user: { id: "admin-123", email: "admin@test.com" } },
        error: null,
      })),
    },
  })),
}));

// Mock data
const mockSessionData = {
  id: "session-123",
  admin_id: "admin-123",
  business_owner_id: "business-123",
  session_token: "token-123",
  created_at: new Date().toISOString(),
  last_activity: new Date().toISOString(),
  is_active: true,
};

const mockShiftData = {
  id: "shift-123",
  business_id: "business-123",
  admin_id: "admin-123",
  shift_name: "Morning Shift",
  started_at: new Date().toISOString(),
  is_active: true,
  max_staff_sessions: 50,
  created_at: new Date().toISOString(),
};

const mockStaffData = {
  id: "staff-123",
  pin_hash: "hashed-pin",
  is_active: true,
  failed_login_attempts: 0,
  locked_until: null,
};

describe("Hybrid Authentication System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HybridAuthManager", () => {
    describe("createAdminSession", () => {
      it("should create an admin session successfully", async () => {
        const result = await hybridAuth.createAdminSession(
          "business-123",
          "shift-management",
          "admin-123",
          "192.168.1.1",
          "Mozilla/5.0"
        );

        expect(result.success).toBe(true);
        expect(result.session).toBeTruthy();
        expect(result.session?.admin_id).toBe("admin-123");
        expect(result.session?.business_owner_id).toBe("business-123");
      });

      it("should handle database errors", async () => {
        const mockSupabase = require("../lib/supabase/server").createClient();
        mockSupabase.from.mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: new Error("Database error"),
              })),
            })),
          })),
        });

        const result = await hybridAuth.createAdminSession(
          "business-123",
          "shift-management",
          "admin-123"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Database error");
      });
    });

    describe("validateAdminSession", () => {
      it("should validate a valid admin session", async () => {
        const result = await hybridAuth.validateAdminSession("token-123");

        expect(result.valid).toBe(true);
        expect(result.session).toBeTruthy();
        expect(result.session?.session_token).toBe("token-123");
      });

      it("should reject invalid session token", async () => {
        const mockSupabase = require("../lib/supabase/server").createClient();
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: null,
                  error: new Error("Not found"),
                })),
              })),
            })),
          })),
        });

        const result = await hybridAuth.validateAdminSession("invalid-token");

        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid session");
      });
    });

    describe("startShift", () => {
      it("should start a shift successfully", async () => {
        const result = await hybridAuth.startShift(
          "business-123",
          "admin-123",
          "Morning Shift",
          50,
          8
        );

        expect(result.success).toBe(true);
        expect(result.shift).toBeTruthy();
        expect(result.shift?.shift_name).toBe("Morning Shift");
        expect(result.shift?.max_staff_sessions).toBe(50);
      });

      it("should handle shift creation errors", async () => {
        const mockSupabase = require("../lib/supabase/server").createClient();
        mockSupabase.from.mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: new Error("Database error"),
              })),
            })),
          })),
        });

        const result = await hybridAuth.startShift(
          "business-123",
          "admin-123",
          "Morning Shift"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Database error");
      });
    });

    describe("endShift", () => {
      it("should end a shift successfully", async () => {
        const result = await hybridAuth.endShift("shift-123", "admin-123");

        expect(result.success).toBe(true);
      });

      it("should handle shift end errors", async () => {
        const mockSupabase = require("../lib/supabase/server").createClient();
        mockSupabase.from.mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: new Error("Database error") })),
          })),
        });

        const result = await hybridAuth.endShift("invalid-shift", "admin-123");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to end shift");
      });
    });

    describe("getShiftStatus", () => {
      it("should return active shift status", async () => {
        const mockSupabase = require("../lib/supabase/server").createClient();
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({ data: mockShiftData, error: null })),
              })),
            })),
          })),
        });

        const status = await hybridAuth.getShiftStatus("business-123");

        expect(status.is_active).toBe(true);
        expect(status.shift).toBeTruthy();
      });

      it("should return inactive status when no shift exists", async () => {
        const mockSupabase = require("../lib/supabase/server").createClient();
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({ data: null, error: null })),
              })),
            })),
          })),
        });

        const status = await hybridAuth.getShiftStatus("business-123");

        expect(status.is_active).toBe(false);
        expect(status.shift).toBeUndefined();
      });
    });

    describe("authenticateStaff", () => {
      it("should authenticate staff successfully with valid PIN", async () => {
        // Mock shift status
        vi.spyOn(hybridAuth, "getShiftStatus").mockResolvedValue({
          is_active: true,
          shift: mockShiftData,
          active_staff_count: 5,
          max_staff_allowed: 50,
        });

        // Mock staff data with correct PIN hash
        const correctPinHash = "hashed-pin";
        const mockSupabase = require("../lib/supabase/server").createClient();
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { ...mockStaffData, pin_hash: correctPinHash },
                  error: null,
                })),
              })),
            })),
          })),
        });

        const result = await hybridAuth.authenticateStaff(
          "business-123",
          "staff-123",
          "1234",
          "admin-123"
        );

        expect(result.success).toBe(true);
        expect(result.session).toBeTruthy();
      });

      it("should reject invalid PIN", async () => {
        // Mock shift status
        vi.spyOn(hybridAuth, "getShiftStatus").mockResolvedValue({
          is_active: true,
          shift: mockShiftData,
          active_staff_count: 5,
          max_staff_allowed: 50,
        });

        // Mock staff data with incorrect PIN hash
        const mockSupabase = require("../lib/supabase/server").createClient();
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { ...mockStaffData, pin_hash: "wrong-hash" },
                  error: null,
                })),
              })),
            })),
          })),
        });

        const result = await hybridAuth.authenticateStaff(
          "business-123",
          "staff-123",
          "1234",
          "admin-123"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid PIN");
      });
    });
  });
});
