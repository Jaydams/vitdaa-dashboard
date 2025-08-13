import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

// Import validation schemas
import {
  staffProfileSchema,
  salarySchema,
  performanceReviewSchema,
  documentUploadSchema,
  shiftScheduleSchema,
  attendanceSchema,
  formatValidationErrors,
  validateEmail,
  validatePhoneNumber,
  validateName,
  validateDate,
  validateFutureDate,
  validatePastDate,
  validateFileSize,
  validateFileType,
} from "@/lib/staff-form-validation";

// Import error handling utilities
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  useFormValidation,
  useFileUploadValidation,
} from "@/hooks/useFormValidation";

describe("Staff Form Validation", () => {
  describe("Staff Profile Schema", () => {
    it("should validate required fields", () => {
      const invalidData = {
        firstName: "",
        lastName: "",
        email: "",
      };

      const result = staffProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.firstName).toContain("First name is required");
        expect(errors.lastName).toContain("Last name is required");
        expect(errors.email).toContain("Email is required");
      }
    });

    it("should validate email format", () => {
      const invalidData = {
        firstName: "John",
        lastName: "Doe",
        email: "invalid-email",
      };

      const result = staffProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.email).toContain("Please enter a valid email address");
      }
    });

    it("should validate name characters", () => {
      const invalidData = {
        firstName: "John123",
        lastName: "Doe@#$",
        email: "john@example.com",
      };

      const result = staffProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.firstName).toContain(
          "First name contains invalid characters"
        );
        expect(errors.lastName).toContain(
          "Last name contains invalid characters"
        );
      }
    });

    it("should validate phone number format", () => {
      const invalidData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "invalid-phone",
      };

      const result = staffProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.phoneNumber).toContain(
          "Please enter a valid phone number"
        );
      }
    });

    it("should validate age range for date of birth", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        dateOfBirth: futureDate.toISOString().split("T")[0],
      };

      const result = staffProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.dateOfBirth).toContain(
          "Age must be between 16 and 100 years"
        );
      }
    });

    it("should accept valid data", () => {
      const validData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: "1990-01-01",
      };

      const result = staffProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Salary Schema", () => {
    it("should validate required fields", () => {
      const invalidData = {};

      const result = salarySchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.salaryType).toContain("Salary type is required");
        expect(errors.paymentFrequency).toContain(
          "Payment frequency is required"
        );
        expect(errors.effectiveDate).toContain("Effective date is required");
      }
    });

    it("should validate hourly rate for hourly salary type", () => {
      const invalidData = {
        salaryType: "hourly",
        paymentFrequency: "weekly",
        effectiveDate: "2024-01-01",
        hourlyRate: 0,
      };

      const result = salarySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate base salary for non-hourly salary types", () => {
      const invalidData = {
        salaryType: "monthly",
        paymentFrequency: "monthly",
        effectiveDate: "2024-01-01",
        baseSalary: 0,
      };

      const result = salarySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate commission rate range", () => {
      const invalidData = {
        salaryType: "hourly",
        paymentFrequency: "weekly",
        effectiveDate: "2024-01-01",
        hourlyRate: 15,
        commissionRate: 150, // Invalid: over 100%
      };

      const result = salarySchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.commissionRate).toContain(
          "Commission rate cannot exceed 100%"
        );
      }
    });

    it("should accept valid hourly salary data", () => {
      const validData = {
        salaryType: "hourly",
        paymentFrequency: "weekly",
        effectiveDate: "2024-01-01",
        hourlyRate: 15.5,
        commissionRate: 5,
        bonusEligible: true,
      };

      const result = salarySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept valid monthly salary data", () => {
      const validData = {
        salaryType: "monthly",
        paymentFrequency: "monthly",
        effectiveDate: "2024-01-01",
        baseSalary: 5000,
        commissionRate: 10,
        bonusEligible: false,
      };

      const result = salarySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Performance Review Schema", () => {
    it("should validate required fields", () => {
      const invalidData = {};

      const result = performanceReviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.reviewPeriodStart).toContain(
          "Review period start date is required"
        );
        expect(errors.reviewPeriodEnd).toContain(
          "Review period end date is required"
        );
        expect(errors.performanceMetrics).toContain(
          "At least one performance metric is required"
        );
      }
    });

    it("should validate date range", () => {
      const invalidData = {
        reviewPeriodStart: "2024-06-01",
        reviewPeriodEnd: "2024-05-01", // End before start
        performanceMetrics: [{ name: "Quality", score: 4, maxScore: 5 }],
      };

      const result = performanceReviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.reviewPeriodEnd).toContain(
          "Review period end date must be after start date"
        );
      }
    });

    it("should validate performance metrics", () => {
      const invalidData = {
        reviewPeriodStart: "2024-01-01",
        reviewPeriodEnd: "2024-06-01",
        performanceMetrics: [
          { name: "", score: 6, maxScore: 5 }, // Invalid name and score
        ],
      };

      const result = performanceReviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate goal target dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        reviewPeriodStart: "2024-01-01",
        reviewPeriodEnd: "2024-06-01",
        performanceMetrics: [{ name: "Quality", score: 4, maxScore: 5 }],
        goals: [
          {
            id: "1",
            title: "Test Goal",
            targetDate: pastDate.toISOString().split("T")[0], // Past date
            status: "not_started",
            progressPercentage: 0,
          },
        ],
      };

      const result = performanceReviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept valid performance review data", () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      const validData = {
        reviewPeriodStart: "2024-01-01",
        reviewPeriodEnd: "2024-06-01",
        performanceMetrics: [
          { name: "Quality", score: 4, maxScore: 5, comments: "Good work" },
          { name: "Productivity", score: 5, maxScore: 5 },
        ],
        goals: [
          {
            id: "1",
            title: "Improve efficiency",
            description: "Focus on process optimization",
            targetDate: futureDate.toISOString().split("T")[0],
            status: "in_progress",
            progressPercentage: 25,
          },
        ],
        achievements: [
          {
            id: "1",
            title: "Completed training",
            description: "Finished advanced course",
            dateAchieved: "2024-03-15",
            recognitionType: "milestone",
          },
        ],
        areasForImprovement: "Focus on time management",
        comments: "Overall good performance",
      };

      const result = performanceReviewSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Document Upload Schema", () => {
    it("should validate required fields", () => {
      const invalidData = {};

      const result = documentUploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.documentType).toContain("Document type is required");
        expect(errors.documentName).toContain("Document name is required");
      }
    });

    it("should validate file size", () => {
      const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.pdf", {
        type: "application/pdf",
      });

      const invalidData = {
        documentType: "contract",
        documentName: "Test Document",
        file: largeFile,
      };

      const result = documentUploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.file).toContain("File size must be less than 10MB");
      }
    });

    it("should validate file type", () => {
      const invalidFile = new File(["content"], "test.exe", {
        type: "application/x-executable",
      });

      const invalidData = {
        documentType: "contract",
        documentName: "Test Document",
        file: invalidFile,
      };

      const result = documentUploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.file).toContain("File type not supported");
      }
    });

    it("should validate expiration date", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const validFile = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      const invalidData = {
        documentType: "certification",
        documentName: "Test Certificate",
        file: validFile,
        expirationDate: pastDate.toISOString().split("T")[0],
      };

      const result = documentUploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.expirationDate).toContain(
          "Expiration date must be in the future"
        );
      }
    });

    it("should accept valid document data", () => {
      const validFile = new File(["content"], "contract.pdf", {
        type: "application/pdf",
      });

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const validData = {
        documentType: "contract",
        documentName: "Employment Contract",
        file: validFile,
        expirationDate: futureDate.toISOString().split("T")[0],
        isRequired: true,
      };

      const result = documentUploadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Shift Schedule Schema", () => {
    it("should validate required fields", () => {
      const invalidData = {};

      const result = shiftScheduleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.shiftDate).toContain("Shift date is required");
        expect(errors.scheduledStartTime).toContain("Start time is required");
        expect(errors.scheduledEndTime).toContain("End time is required");
      }
    });

    it("should validate time format", () => {
      const invalidData = {
        shiftDate: "2024-06-01",
        scheduledStartTime: "25:00", // Invalid time
        scheduledEndTime: "18:00",
      };

      const result = shiftScheduleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.scheduledStartTime).toContain(
          "Please enter a valid time"
        );
      }
    });

    it("should validate time range", () => {
      const invalidData = {
        shiftDate: "2024-06-01",
        scheduledStartTime: "18:00",
        scheduledEndTime: "09:00", // End before start
      };

      const result = shiftScheduleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.scheduledEndTime).toContain(
          "End time must be after start time"
        );
      }
    });

    it("should accept valid shift data", () => {
      const validData = {
        shiftDate: "2024-06-01",
        scheduledStartTime: "09:00",
        scheduledEndTime: "17:00",
        breakDurationMinutes: 60,
        notes: "Regular shift",
      };

      const result = shiftScheduleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Attendance Schema", () => {
    it("should validate required fields", () => {
      const invalidData = {};

      const result = attendanceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.attendanceDate).toContain("Attendance date is required");
        expect(errors.status).toContain("Attendance status is required");
      }
    });

    it("should validate clock times", () => {
      const invalidData = {
        attendanceDate: "2024-06-01",
        clockInTime: "2024-06-01T09:00:00Z",
        clockOutTime: "2024-06-01T08:00:00Z", // Before clock in
        status: "present",
      };

      const result = attendanceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.clockOutTime).toContain(
          "Clock-out time must be after clock-in time"
        );
      }
    });

    it("should accept valid attendance data", () => {
      const validData = {
        attendanceDate: "2024-06-01",
        clockInTime: "2024-06-01T09:00:00Z",
        clockOutTime: "2024-06-01T17:00:00Z",
        status: "present",
        notes: "On time",
      };

      const result = attendanceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe("Field Validation Functions", () => {
  describe("validateEmail", () => {
    it("should validate required email", () => {
      expect(validateEmail("")).toBe("Email is required");
    });

    it("should validate email format", () => {
      expect(validateEmail("invalid-email")).toBe(
        "Please enter a valid email address"
      );
      expect(validateEmail("test@example.com")).toBe(null);
    });

    it("should validate email length", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      expect(validateEmail(longEmail)).toBe(
        "Email must be less than 255 characters"
      );
    });
  });

  describe("validatePhoneNumber", () => {
    it("should allow empty phone number", () => {
      expect(validatePhoneNumber("")).toBe(null);
    });

    it("should validate phone format", () => {
      expect(validatePhoneNumber("invalid-phone")).toBe(
        "Please enter a valid phone number"
      );
      expect(validatePhoneNumber("+1234567890")).toBe(null);
      expect(validatePhoneNumber("1234567890")).toBe(null);
    });
  });

  describe("validateName", () => {
    it("should validate required name", () => {
      expect(validateName("", "First name")).toBe("First name is required");
    });

    it("should validate name length", () => {
      const longName = "a".repeat(51);
      expect(validateName(longName, "First name")).toBe(
        "First name must be less than 50 characters"
      );
    });

    it("should validate name characters", () => {
      expect(validateName("John123", "First name")).toBe(
        "First name contains invalid characters"
      );
      expect(validateName("John", "First name")).toBe(null);
      expect(validateName("O'Connor", "Last name")).toBe(null);
      expect(validateName("Mary-Jane", "First name")).toBe(null);
    });
  });

  describe("validateDate", () => {
    it("should validate required date", () => {
      expect(validateDate("", "Birth date")).toBe("Birth date is required");
    });

    it("should validate date format", () => {
      expect(validateDate("invalid-date", "Birth date")).toBe(
        "Please enter a valid birth date"
      );
      expect(validateDate("2024-01-01", "Birth date")).toBe(null);
    });
  });

  describe("validateFutureDate", () => {
    it("should validate future date", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(
        validateFutureDate(pastDate.toISOString().split("T")[0], "Target date")
      ).toBe("Target date must be in the future");

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(
        validateFutureDate(
          futureDate.toISOString().split("T")[0],
          "Target date"
        )
      ).toBe(null);
    });
  });

  describe("validatePastDate", () => {
    it("should validate past date", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(
        validatePastDate(
          futureDate.toISOString().split("T")[0],
          "Achievement date"
        )
      ).toBe("Achievement date cannot be in the future");

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(
        validatePastDate(
          pastDate.toISOString().split("T")[0],
          "Achievement date"
        )
      ).toBe(null);
    });
  });

  describe("validateFileSize", () => {
    it("should validate file size", () => {
      const smallFile = new File(["content"], "small.txt", {
        type: "text/plain",
      });
      expect(validateFileSize(smallFile)).toBe(null);

      // Mock large file
      Object.defineProperty(smallFile, "size", { value: 11 * 1024 * 1024 });
      expect(validateFileSize(smallFile)).toBe(
        "File size must be less than 10MB"
      );
    });
  });

  describe("validateFileType", () => {
    it("should validate file type", () => {
      const validFile = new File(["content"], "document.pdf", {
        type: "application/pdf",
      });
      const allowedTypes = ["application/pdf", "image/jpeg"];

      expect(validateFileType(validFile, allowedTypes)).toBe(null);

      const invalidFile = new File(["content"], "script.exe", {
        type: "application/x-executable",
      });
      expect(validateFileType(invalidFile, allowedTypes)).toBe(
        "File type not supported"
      );
    });
  });
});

describe("Error Handling Integration", () => {
  it("should format validation errors correctly", () => {
    const schema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
    });

    const result = schema.safeParse({ name: "", email: "invalid" });

    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.name).toBe("Name is required");
      expect(errors.email).toBe("Invalid email");
    }
  });
});
