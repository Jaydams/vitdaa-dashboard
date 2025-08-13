"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

export type ErrorType =
  | "authentication"
  | "authorization"
  | "rate_limit"
  | "validation"
  | "network"
  | "server"
  | "permission"
  | "session_expired"
  | "unknown";

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface UseErrorHandlerReturn {
  error: ErrorDetails | null;
  isError: boolean;
  clearError: () => void;
  handleError: (error: Error | ErrorDetails | string) => void;
  showErrorToast: (
    message: string,
    options?: {
      duration?: number;
      action?: { label: string; onClick: () => void };
    }
  ) => void;
  showSuccessToast: (message: string, options?: { duration?: number }) => void;
  showWarningToast: (message: string, options?: { duration?: number }) => void;
}

// Error message mappings for common error codes
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  "invalid-pin": "The PIN you entered is incorrect. Please try again.",
  "invalid-admin-pin": "The admin PIN you entered is incorrect.",
  "missing-credentials": "Please provide all required credentials.",
  "authentication-required": "You need to sign in to access this resource.",
  "unauthorized-access": "You are not authorized to access this resource.",

  // Rate limiting errors
  "rate-limited": "Too many attempts. Please wait before trying again.",
  "staff-pin-locked": "Account temporarily locked due to failed PIN attempts.",
  "admin-pin-locked": "Admin access temporarily locked for security.",

  // Permission errors
  "permission-denied": "You don't have permission to perform this action.",
  "insufficient-permissions": "Your current role doesn't allow this operation.",
  "role-mismatch": "This action requires a different role.",

  // Session errors
  "session-expired": "Your session has expired. Please sign in again.",
  "session-invalid": "Your session is invalid. Please sign in again.",
  "session-creation-failed": "Failed to create session. Please try again.",

  // Validation errors
  "missing-required-fields": "Please fill in all required fields.",
  "invalid-data": "The data you provided is invalid.",
  "validation-failed": "Please check your input and try again.",

  // Server errors
  "server-error": "A server error occurred. Please try again later.",
  "network-error": "Network error. Please check your connection.",
  "database-error": "Database error. Please try again later.",

  // Staff management errors
  "staff-not-found": "Staff member not found.",
  "staff-creation-failed": "Failed to create staff member.",
  "staff-update-failed": "Failed to update staff member.",
  "email-already-exists": "A staff member with this email already exists.",
  "phone-already-exists":
    "A staff member with this phone number already exists.",

  // Default
  "unknown-error": "An unexpected error occurred. Please try again.",
};

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorDetails | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const parseError = useCallback(
    (error: Error | ErrorDetails | string): ErrorDetails => {
      if (typeof error === "string") {
        return {
          type: "unknown",
          message: ERROR_MESSAGES[error] || error,
          code: error,
          retryable: true,
          severity: "medium",
        };
      }

      if ("type" in error && "message" in error) {
        // Already an ErrorDetails object
        return error;
      }

      // It's an Error object
      const errorMessage = error.message || "An unexpected error occurred";
      let errorType: ErrorType = "unknown";
      let retryable = true;
      let severity: "low" | "medium" | "high" | "critical" = "medium";

      // Determine error type based on message content
      if (
        errorMessage.includes("authentication") ||
        errorMessage.includes("sign in")
      ) {
        errorType = "authentication";
        retryable = false;
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("authorized")
      ) {
        errorType = "authorization";
        retryable = false;
        severity = "high";
      } else if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("locked")
      ) {
        errorType = "rate_limit";
        retryable = false;
        severity = "high";
      } else if (
        errorMessage.includes("validation") ||
        errorMessage.includes("invalid")
      ) {
        errorType = "validation";
        retryable = true;
        severity = "low";
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("connection")
      ) {
        errorType = "network";
        retryable = true;
      } else if (
        errorMessage.includes("server") ||
        errorMessage.includes("database")
      ) {
        errorType = "server";
        retryable = true;
        severity = "high";
      } else if (
        errorMessage.includes("session") ||
        errorMessage.includes("expired")
      ) {
        errorType = "session_expired";
        retryable = false;
      }

      return {
        type: errorType,
        message: errorMessage,
        retryable,
        severity,
        details: {
          originalError: error.name,
          stack: error.stack,
        },
      };
    },
    []
  );

  const handleError = useCallback(
    (error: Error | ErrorDetails | string) => {
      const parsedError = parseError(error);
      setError(parsedError);

      // Log error for debugging
      console.error("Error handled:", parsedError);

      // Show toast notification for certain error types
      if (
        parsedError.severity === "critical" ||
        parsedError.type === "server"
      ) {
        toast.error(parsedError.message, {
          duration: 5000,
          action: parsedError.retryable
            ? {
                label: "Retry",
                onClick: () => window.location.reload(),
              }
            : undefined,
        });
      }
    },
    [parseError]
  );

  const showErrorToast = useCallback(
    (
      message: string,
      options?: {
        duration?: number;
        action?: { label: string; onClick: () => void };
      }
    ) => {
      toast.error(message, {
        duration: options?.duration || 4000,
        action: options?.action,
      });
    },
    []
  );

  const showSuccessToast = useCallback(
    (message: string, options?: { duration?: number }) => {
      toast.success(message, {
        duration: options?.duration || 3000,
      });
    },
    []
  );

  const showWarningToast = useCallback(
    (message: string, options?: { duration?: number }) => {
      toast.warning(message, {
        duration: options?.duration || 4000,
      });
    },
    []
  );

  return {
    error,
    isError: error !== null,
    clearError,
    handleError,
    showErrorToast,
    showSuccessToast,
    showWarningToast,
  };
}

// Utility function to extract error message from various error formats
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return ERROR_MESSAGES[error] || error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "An unexpected error occurred";
}

// Utility function to determine if an error is retryable
export function isRetryableError(error: unknown): boolean {
  if (typeof error === "string") {
    const nonRetryableErrors = [
      "invalid-pin",
      "invalid-admin-pin",
      "unauthorized-access",
      "permission-denied",
      "session-expired",
      "rate-limited",
    ];
    return !nonRetryableErrors.includes(error);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return !(
      message.includes("unauthorized") ||
      message.includes("permission") ||
      message.includes("expired") ||
      message.includes("locked")
    );
  }

  return true; // Default to retryable
}

// Utility function to get user-friendly error message
export function getUserFriendlyErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);

  // Return user-friendly version if available
  if (typeof error === "string" && ERROR_MESSAGES[error]) {
    return ERROR_MESSAGES[error];
  }

  // For generic errors, provide helpful context
  if (message.includes("fetch")) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (message.includes("timeout")) {
    return "The request timed out. Please try again.";
  }

  if (message.includes("500")) {
    return "A server error occurred. Our team has been notified. Please try again later.";
  }

  if (message.includes("404")) {
    return "The requested resource was not found.";
  }

  return message;
}
