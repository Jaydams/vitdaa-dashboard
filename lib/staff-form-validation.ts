import { z } from "zod";

// Common validation patterns
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
const nameRegex = /^[a-zA-Z\s\-'\.]+$/;

// Staff Profile Validation Schema
export const staffProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .regex(nameRegex, "First name contains invalid characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .regex(nameRegex, "Last name contains invalid characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  username: z
    .string()
    .optional()
    .refine(
      (val) => !val || (val.length >= 3 && val.length <= 30),
      "Username must be between 3 and 30 characters"
    ),
  phoneNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val),
      "Please enter a valid phone number"
    ),
  profileImageUrl: z
    .string()
    .url("Invalid image URL")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      return age >= 16 && age <= 100;
    }, "Age must be between 16 and 100 years"),
  address: z
    .object({
      street: z.string().max(255, "Street address too long").optional(),
      city: z.string().max(100, "City name too long").optional(),
      state: z.string().max(100, "State name too long").optional(),
      zipCode: z.string().max(20, "ZIP code too long").optional(),
      country: z.string().max(100, "Country name too long").optional(),
    })
    .optional(),
  emergencyContactName: z
    .string()
    .max(100, "Emergency contact name too long")
    .optional(),
  emergencyContactPhone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val),
      "Please enter a valid emergency contact phone number"
    ),
  emergencyContactRelationship: z
    .string()
    .max(50, "Relationship description too long")
    .optional(),
  department: z.string().max(100, "Department name too long").optional(),
  employeeId: z.string().max(50, "Employee ID too long").optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

// Salary Management Validation Schema
export const salarySchema = z
  .object({
    salaryType: z.enum(["hourly", "monthly", "annual"], {
      required_error: "Salary type is required",
    }),
    baseSalary: z
      .number()
      .min(0, "Base salary cannot be negative")
      .max(10000000, "Base salary is too high")
      .optional(),
    hourlyRate: z
      .number()
      .min(0, "Hourly rate cannot be negative")
      .max(1000, "Hourly rate is too high")
      .optional(),
    paymentFrequency: z.enum(["weekly", "bi_weekly", "monthly"], {
      required_error: "Payment frequency is required",
    }),
    commissionRate: z
      .number()
      .min(0, "Commission rate cannot be negative")
      .max(100, "Commission rate cannot exceed 100%")
      .default(0),
    bonusEligible: z.boolean().default(false),
    effectiveDate: z
      .string()
      .min(1, "Effective date is required")
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Please enter a valid date"),
  })
  .refine(
    (data) => {
      if (data.salaryType === "hourly") {
        return data.hourlyRate && data.hourlyRate > 0;
      } else {
        return data.baseSalary && data.baseSalary > 0;
      }
    },
    {
      message: "Please provide a valid salary amount",
      path: ["salaryAmount"],
    }
  );

// Performance Review Validation Schema
export const performanceReviewSchema = z
  .object({
    reviewPeriodStart: z
      .string()
      .min(1, "Review period start date is required")
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Please enter a valid start date"),
    reviewPeriodEnd: z
      .string()
      .min(1, "Review period end date is required")
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Please enter a valid end date"),
    overallRating: z
      .number()
      .min(1, "Overall rating must be at least 1")
      .max(5, "Overall rating cannot exceed 5")
      .optional(),
    performanceMetrics: z
      .array(
        z.object({
          name: z.string().min(1, "Metric name is required"),
          score: z
            .number()
            .min(0, "Score cannot be negative")
            .max(5, "Score cannot exceed maximum"),
          maxScore: z.number().min(1, "Maximum score must be at least 1"),
          comments: z.string().max(500, "Comments too long").optional(),
        })
      )
      .min(1, "At least one performance metric is required"),
    goals: z
      .array(
        z.object({
          id: z.string(),
          title: z
            .string()
            .min(1, "Goal title is required")
            .max(200, "Goal title too long"),
          description: z
            .string()
            .max(1000, "Goal description too long")
            .optional(),
          targetDate: z.string().refine((val) => {
            if (!val) return true;
            const date = new Date(val);
            return !isNaN(date.getTime()) && date > new Date();
          }, "Target date must be in the future"),
          status: z.enum([
            "not_started",
            "in_progress",
            "completed",
            "overdue",
          ]),
          progressPercentage: z
            .number()
            .min(0, "Progress cannot be negative")
            .max(100, "Progress cannot exceed 100%")
            .default(0),
        })
      )
      .optional(),
    achievements: z
      .array(
        z.object({
          id: z.string(),
          title: z
            .string()
            .min(1, "Achievement title is required")
            .max(200, "Achievement title too long"),
          description: z
            .string()
            .max(1000, "Achievement description too long")
            .optional(),
          dateAchieved: z.string().refine((val) => {
            const date = new Date(val);
            return !isNaN(date.getTime()) && date <= new Date();
          }, "Achievement date cannot be in the future"),
          recognitionType: z.enum([
            "commendation",
            "award",
            "milestone",
            "other",
          ]),
        })
      )
      .optional(),
    areasForImprovement: z
      .string()
      .max(2000, "Areas for improvement text too long")
      .optional(),
    comments: z.string().max(2000, "Comments too long").optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.reviewPeriodStart);
      const endDate = new Date(data.reviewPeriodEnd);
      return endDate > startDate;
    },
    {
      message: "Review period end date must be after start date",
      path: ["reviewPeriodEnd"],
    }
  );

// Document Upload Validation Schema
export const documentUploadSchema = z.object({
  documentType: z.enum(
    [
      "contract",
      "id_document",
      "tax_form",
      "certification",
      "training_record",
      "other",
    ],
    {
      required_error: "Document type is required",
    }
  ),
  documentName: z
    .string()
    .min(1, "Document name is required")
    .max(255, "Document name too long"),
  expirationDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    }, "Expiration date must be in the future"),
  isRequired: z.boolean().default(false),
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "File size must be less than 10MB"
    )
    .refine((file) => {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      return allowedTypes.includes(file.type);
    }, "File type not supported. Please upload PDF, Word, or image files"),
});

// Shift Scheduling Validation Schema
export const shiftScheduleSchema = z
  .object({
    shiftDate: z
      .string()
      .min(1, "Shift date is required")
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Please enter a valid date"),
    scheduledStartTime: z
      .string()
      .min(1, "Start time is required")
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please enter a valid time (HH:MM)"
      ),
    scheduledEndTime: z
      .string()
      .min(1, "End time is required")
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please enter a valid time (HH:MM)"
      ),
    breakDurationMinutes: z
      .number()
      .min(0, "Break duration cannot be negative")
      .max(480, "Break duration cannot exceed 8 hours")
      .default(0),
    notes: z.string().max(500, "Notes too long").optional(),
  })
  .refine(
    (data) => {
      const startTime = new Date(`2000-01-01T${data.scheduledStartTime}:00`);
      const endTime = new Date(`2000-01-01T${data.scheduledEndTime}:00`);
      return endTime > startTime;
    },
    {
      message: "End time must be after start time",
      path: ["scheduledEndTime"],
    }
  );

// Attendance Tracking Validation Schema
export const attendanceSchema = z
  .object({
    attendanceDate: z
      .string()
      .min(1, "Attendance date is required")
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Please enter a valid date"),
    clockInTime: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Please enter a valid clock-in time"),
    clockOutTime: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Please enter a valid clock-out time"),
    status: z.enum(["present", "absent", "late", "early_departure"], {
      required_error: "Attendance status is required",
    }),
    notes: z.string().max(500, "Notes too long").optional(),
  })
  .refine(
    (data) => {
      if (data.clockInTime && data.clockOutTime) {
        const clockIn = new Date(data.clockInTime);
        const clockOut = new Date(data.clockOutTime);
        return clockOut > clockIn;
      }
      return true;
    },
    {
      message: "Clock-out time must be after clock-in time",
      path: ["clockOutTime"],
    }
  );

// Validation error formatter
export function formatValidationErrors(
  error: z.ZodError
): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  if (!error || !error.errors) {
    return formattedErrors;
  }

  error.errors.forEach((err) => {
    const path = err.path.join(".");
    formattedErrors[path] = err.message;
  });

  return formattedErrors;
}

// Field-specific validation functions
export const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Please enter a valid email address";
  if (email.length > 255) return "Email must be less than 255 characters";
  return null;
};

export const validatePhoneNumber = (phone: string): string | null => {
  if (!phone) return null; // Optional field
  if (!phoneRegex.test(phone)) return "Please enter a valid phone number";
  return null;
};

export const validateName = (
  name: string,
  fieldName: string
): string | null => {
  if (!name) return `${fieldName} is required`;
  if (name.length > 50) return `${fieldName} must be less than 50 characters`;
  if (!nameRegex.test(name)) return `${fieldName} contains invalid characters`;
  return null;
};

export const validateDate = (
  date: string,
  fieldName: string
): string | null => {
  if (!date) return `${fieldName} is required`;
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime()))
    return `Please enter a valid ${fieldName.toLowerCase()}`;
  return null;
};

export const validateFutureDate = (
  date: string,
  fieldName: string
): string | null => {
  const baseValidation = validateDate(date, fieldName);
  if (baseValidation) return baseValidation;

  const parsedDate = new Date(date);
  if (parsedDate <= new Date()) return `${fieldName} must be in the future`;
  return null;
};

export const validatePastDate = (
  date: string,
  fieldName: string
): string | null => {
  const baseValidation = validateDate(date, fieldName);
  if (baseValidation) return baseValidation;

  const parsedDate = new Date(date);
  if (parsedDate > new Date()) return `${fieldName} cannot be in the future`;
  return null;
};

export const validateFileSize = (
  file: File,
  maxSizeMB: number = 10
): string | null => {
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File size must be less than ${maxSizeMB}MB`;
  }
  return null;
};

export const validateFileType = (
  file: File,
  allowedTypes: string[]
): string | null => {
  if (!allowedTypes.includes(file.type)) {
    return "File type not supported";
  }
  return null;
};
