import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import {
  hashPin,
  verifyPin,
  generateSecurePin,
  hashAdminPin,
  verifyAdminPin,
  generateSessionToken,
  validateStaffSession,
  createStaffSession,
  terminateStaffSession,
  terminateAllStaffSessions,
  cleanupExpiredSessions,
  validateAdminSession,
  invalidateAdminSession,
  cleanupExpiredAdminSessions,
} from "@/actions/staff-auth-utils";

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock crypto - handled in setup.ts

describe("PIN Management Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hashPin", () => {
    it("should hash a PIN using bcrypt with 12 salt rounds", async () => {
      const pin = "1234";
      const hashedPin = "hashed_pin";

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPin);

      const result = await hashPin(pin);

      expect(bcrypt.hash).toHaveBeenCalledWith(pin, 12);
      expect(result).toBe(hashedPin);
    });

    it("should handle different PIN lengths", async () => {
      const pins = ["12", "1234", "123456"];
      const hashedPin = "hashed_pin";

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPin);

      for (const pin of pins) {
        await hashPin(pin);
        expect(bcrypt.hash).toHaveBeenCalledWith(pin, 12);
      }
    });
  });

  describe("verifyPin", () => {
    it("should verify a PIN against its hash", async () => {
      const pin = "1234";
      const hashedPin = "hashed_pin";

      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      const result = await verifyPin(pin, hashedPin);

      expect(bcrypt.compare).toHaveBeenCalledWith(pin, hashedPin);
      expect(result).toBe(true);
    });

    it("should return false for incorrect PIN", async () => {
      const pin = "1234";
      const hashedPin = "hashed_pin";

      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      const result = await verifyPin(pin, hashedPin);

      expect(bcrypt.compare).toHaveBeenCalledWith(pin, hashedPin);
      expect(result).toBe(false);
    });

    it("should handle bcrypt errors gracefully", async () => {
      const pin = "1234";
      const hashedPin = "invalid_hash";

      vi.mocked(bcrypt.compare).mockRejectedValue(new Error("Invalid hash"));

      await expect(verifyPin(pin, hashedPin)).rejects.toThrow("Invalid hash");
    });
  });

  describe("generateSecurePin", () => {
    it("should generate a 4-digit PIN by default", () => {
      const pin = generateSecurePin();

      expect(pin).toMatch(/^\d{4}$/);
      expect(pin.length).toBe(4);
    });

    it("should generate PIN of specified length", () => {
      const lengths = [3, 5, 6, 8];

      lengths.forEach((length) => {
        const pin = generateSecurePin(length);
        expect(pin).toMatch(new RegExp(`^\\d{${length}}$`));
        expect(pin.length).toBe(length);
      });
    });

    it("should generate different PINs on multiple calls", () => {
      const pins = new Set();

      // Generate 100 PINs to test randomness
      for (let i = 0; i < 100; i++) {
        pins.add(generateSecurePin());
      }

      // Should have generated multiple unique PINs
      expect(pins.size).toBeGreaterThan(1);
    });

    it("should only contain digits", () => {
      const pin = generateSecurePin(10);

      expect(pin).toMatch(/^\d+$/);
      expect(pin.split("").every((char) => "0123456789".includes(char))).toBe(
        true
      );
    });
  });
});

describe("Admin PIN Management Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hashAdminPin", () => {
    it("should hash an admin PIN using bcrypt with 12 salt rounds", async () => {
      const adminPin = "123456";
      const hashedPin = "hashed_admin_pin";

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPin);

      const result = await hashAdminPin(adminPin);

      expect(bcrypt.hash).toHaveBeenCalledWith(adminPin, 12);
      expect(result).toBe(hashedPin);
    });
  });

  describe("verifyAdminPin", () => {
    it("should verify an admin PIN against its hash", async () => {
      const adminPin = "123456";
      const hashedPin = "hashed_admin_pin";

      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      const result = await verifyAdminPin(adminPin, hashedPin);

      expect(bcrypt.compare).toHaveBeenCalledWith(adminPin, hashedPin);
      expect(result).toBe(true);
    });

    it("should return false for incorrect admin PIN", async () => {
      const adminPin = "123456";
      const hashedPin = "hashed_admin_pin";

      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      const result = await verifyAdminPin(adminPin, hashedPin);

      expect(result).toBe(false);
    });
  });
});

describe("Session Token Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSessionToken", () => {
    it("should generate a 64-character hex string", () => {
      const token = generateSessionToken();

      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(token.length).toBe(64);
    });

    it("should generate different tokens on multiple calls", () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      expect(token1).not.toBe(token2);
    });
  });
});

describe("Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PIN verification error handling", () => {
    it("should handle bcrypt hash errors", async () => {
      const pin = "1234";
      const invalidHash = "not_a_valid_hash";

      vi.mocked(bcrypt.compare).mockRejectedValue(
        new Error("Invalid hash format")
      );

      await expect(verifyPin(pin, invalidHash)).rejects.toThrow(
        "Invalid hash format"
      );
    });

    it("should handle bcrypt compare errors", async () => {
      const pin = "1234";
      const hashedPin = "valid_hash";

      vi.mocked(bcrypt.compare).mockRejectedValue(
        new Error("Comparison failed")
      );

      await expect(verifyPin(pin, hashedPin)).rejects.toThrow(
        "Comparison failed"
      );
    });
  });

  describe("PIN hashing error handling", () => {
    it("should handle bcrypt hashing errors", async () => {
      const pin = "1234";

      vi.mocked(bcrypt.hash).mockRejectedValue(new Error("Hashing failed"));

      await expect(hashPin(pin)).rejects.toThrow("Hashing failed");
    });
  });
});

describe("Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PIN generation edge cases", () => {
    it("should handle zero length PIN request", () => {
      const pin = generateSecurePin(0);
      expect(pin).toBe("");
    });

    it("should handle very long PIN requests", () => {
      const pin = generateSecurePin(100);
      expect(pin.length).toBe(100);
      expect(pin).toMatch(/^\d{100}$/);
    });
  });

  describe("PIN verification edge cases", () => {
    it("should handle empty PIN", async () => {
      const pin = "";
      const hashedPin = "some_hash";

      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      const result = await verifyPin(pin, hashedPin);

      expect(bcrypt.compare).toHaveBeenCalledWith(pin, hashedPin);
      expect(result).toBe(false);
    });

    it("should handle empty hash", async () => {
      const pin = "1234";
      const hashedPin = "";

      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      const result = await verifyPin(pin, hashedPin);

      expect(result).toBe(false);
    });
  });
});
