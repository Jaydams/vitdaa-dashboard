import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/security-audit";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorContext {
  userId?: string;
  staffId?: string;
  businessId?: string;
  action?: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ErrorHandlingOptions {
  logSecurity?: boolean;
  redirectOnError?: boolean;
  redirectUrl?: string;
  showToast?: boolean;
  severity?: ErrorSeverity;
}

// Error codes and their corresponding user messages
export const ERROR_CODES = {
  // Authentication errors
  INVALID_PIN: "invalid-pin",
  INVALID_ADMIN_PIN: "invalid-admin-pin",
  MISSING_CREDENTIALS: "missing-credentials",
  AUTHENTICATION_REQUIRED: "authentication-required",
  UNAUTHORIZED_ACCESS: "unauthorized-access",

  // Rate limiting errors
  RATE_LIMITED: "rate-limited",
  STAFF_PIN_LOCKED: "staff-pin-locked",
  ADMIN_PIN_LOCKED: "admin-pin-locked",

  // Permission errors
  PERMISSION_DENIED: "permission-denied",
  INSUFFICIENT_PERMISSIONS: "insufficient-permissions",
  ROLE_MISMATCH: "role-mismatch",

  // Session errors
  SESSION_EXPIRED: "session-expired",
  SESSION_INVALID: "session-invalid",
  SESSION_CREATION_FAILED: "session-creation-failed",

  // Validation errors
  MISSING_REQUIRED_FIELDS: "missing-required-fields",
  INVALID_DATA: "invalid-data",
  VALIDATION_FAILED: "validation-failed",

  // Server errors
  SERVER_ERROR: "server-error",
  NETWORK_ERROR: "network-error",
  DATABASE_ERROR: "database-error",

  // Staff management errors
  STAFF_NOT_FOUND: "staff-not-found",
  STAFF_CREATION_FAILED: "staff-creation-failed",
  STAFF_UPDATE_FAILED: "staff-update-failed",
  EMAIL_ALREADY_EXISTS: "email-already-exists",
  PHONE_ALREADY_EXISTS: "phone-already-exists",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// User-friendly error messages
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  "invalid-pin":
    "The PIN you entered is incorrect. Please check and try again.",
  "invalid-admin-pin":
    "The admin PIN you entered is incorrect. Please verify and try again.",
  "missing-credentials": "Please provide all required information to continue.",
  "authentication-required": "You need to sign in to access this feature.",
  "unauthorized-access": "You are not authorized to access this resource.",

  "rate-limited":
    "Too many attempts detected. Please wait before trying again.",
  "staff-pin-locked":
    "This account has been temporarily locked due to multiple failed PIN attempts.",
  "admin-pin-locked":
    "Admin access has been temporarily locked for security reasons.",

  "permission-denied": "You don't have permission to perform this action.",
  "insufficient-permissions":
    "Your current role doesn't allow this operation. Contact your manager for access.",
  "role-mismatch":
    "This action requires different permissions than your current role provides.",

  "session-expired":
    "Your session has expired for security reasons. Please sign in again.",
  "session-invalid": "Your session is no longer valid. Please sign in again.",
  "session-creation-failed":
    "Unable to create a secure session. Please try signing in again.",

  "missing-required-fields":
    "Please fill in all required fields before continuing.",
  "invalid-data":
    "Some of the information you provided is not valid. Please check and try again.",
  "validation-failed": "Please review your information and correct any errors.",

  "server-error":
    "A server error occurred. Our team has been notified. Please try again later.",
  "network-error":
    "Unable to connect to our servers. Please check your internet connection.",
  "database-error":
    "A database error occurred. Please try again in a few moments.",

  "staff-not-found": "The requested staff member could not be found.",
  "staff-creation-failed":
    "Unable to create the staff member. Please check the information and try again.",
  "staff-update-failed":
    "Unable to update the staff member information. Please try again.",
  "email-already-exists":
    "A staff member with this email address already exists.",
  "phone-already-exists":
    "A staff member with this phone number already exists.",
};

/**
 * Handle authentication errors with appropriate logging and redirects
 */
export async function handleAuthError(
  errorCode: ErrorCode,
  context: ErrorContext,
  options: ErrorHandlingOptions = {}
): Promise<never> {
  const {
    logSecurity = true,
    redirectOnError = true,
    redirectUrl,
    severity = "medium",
  } = options;

  // Log security event if enabled
  if (logSecurity && context.businessId) {
    await logSecurityEvent({
      business_id: context.businessId,
      event_type: getSecurityEventType(errorCode),
      severity,
      user_id: context.userId,
      staff_id: context.staffId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: {
        error_code: errorCode,
        action: context.action,
        resource: context.resource,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Determine redirect URL based on error type
  let finalRedirectUrl = redirectUrl;

  if (!finalRedirectUrl && redirectOnError) {
    finalRedirectUrl = getDefaultRedirectUrl(errorCode, context);
  }

  if (finalRedirectUrl) {
    const errorParam = encodeURIComponent(errorCode);
    const separator = finalRedirectUrl.includes("?") ? "&" : "?";
    redirect(`${finalRedirectUrl}${separator}error=${errorParam}`);
  }

  // This should never be reached due to redirect, but TypeScript requires it
  throw new Error(ERROR_MESSAGES[errorCode] || "An unexpected error occurred");
}

/**
 * Handle validation errors with user-friendly messages
 */
export function handleValidationError(
  errors: Record<string, string[]>,
  redirectUrl?: string
): never {
  const errorMessages = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
    .join("; ");

  const encodedErrors = encodeURIComponent(errorMessages);
  const finalUrl = redirectUrl || "/dashboard";
  const separator = finalUrl.includes("?") ? "&" : "?";

  redirect(
    `${finalUrl}${separator}error=validation-failed&details=${encodedErrors}`
  );
}

/**
 * Handle rate limiting errors with appropriate lockout information
 */
export async function handleRateLimitError(
  errorCode: "staff-pin-locked" | "admin-pin-locked",
  remainingTime: number,
  context: ErrorContext,
  redirectUrl?: string
): Promise<never> {
  const minutes = Math.ceil(remainingTime / (60 * 1000));

  // Log security event
  if (context.businessId) {
    await logSecurityEvent({
      business_id: context.businessId,
      event_type:
        errorCode === "staff-pin-locked"
          ? "staff_pin_lockout"
          : "admin_pin_lockout",
      severity: "high",
      user_id: context.userId,
      staff_id: context.staffId,
      ip_address: context.ipAddress,
      details: {
        lockout_duration_minutes: minutes,
        error_code: errorCode,
        timestamp: new Date().toISOString(),
      },
    });
  }

  const finalUrl = redirectUrl || getDefaultRedirectUrl(errorCode, context);
  const separator = finalUrl.includes("?") ? "&" : "?";

  redirect(`${finalUrl}${separator}error=${errorCode}&minutes=${minutes}`);
}

/**
 * Handle permission errors with detailed context
 */
export async function handlePermissionError(
  requiredPermission: string,
  currentPermissions: string[],
  context: ErrorContext,
  redirectUrl?: string
): Promise<never> {
  // Log security event
  if (context.businessId) {
    await logSecurityEvent({
      business_id: context.businessId,
      event_type: "permission_violation",
      severity: "medium",
      user_id: context.userId,
      staff_id: context.staffId,
      ip_address: context.ipAddress,
      details: {
        required_permission: requiredPermission,
        current_permissions: currentPermissions,
        attempted_action: context.action,
        attempted_resource: context.resource,
        timestamp: new Date().toISOString(),
      },
    });
  }

  const finalUrl =
    redirectUrl || getDefaultRedirectUrl("permission-denied", context);
  const separator = finalUrl.includes("?") ? "&" : "?";
  const encodedPermission = encodeURIComponent(requiredPermission);

  redirect(
    `${finalUrl}${separator}error=permission-denied&required=${encodedPermission}`
  );
}

/**
 * Get the appropriate security event type for an error code
 */
function getSecurityEventType(errorCode: ErrorCode): string {
  const eventTypeMap: Record<string, string> = {
    "invalid-pin": "staff_pin_failure",
    "invalid-admin-pin": "admin_pin_failure",
    "staff-pin-locked": "staff_pin_lockout",
    "admin-pin-locked": "admin_pin_lockout",
    "unauthorized-access": "unauthorized_access_attempt",
    "permission-denied": "permission_violation",
    "session-expired": "session_expired",
    "session-invalid": "session_expired",
  };

  return eventTypeMap[errorCode] || "suspicious_activity";
}

/**
 * Get the default redirect URL based on error type and context
 */
function getDefaultRedirectUrl(
  errorCode: ErrorCode,
  context: ErrorContext
): string {
  // Staff-related errors
  if (context.staffId || errorCode.includes("staff")) {
    if (errorCode === "session-expired" || errorCode === "session-invalid") {
      return "/staff/login";
    }
    return "/staffs";
  }

  // Admin/business owner errors
  if (errorCode.includes("admin") || context.userId) {
    if (errorCode === "session-expired" || errorCode === "session-invalid") {
      return "/login";
    }
    return "/dashboard";
  }

  // Default fallback
  return "/login";
}

/**
 * Extract error information from URL search params
 */
export function parseErrorFromUrl(searchParams: URLSearchParams): {
  errorCode?: ErrorCode;
  message?: string;
  details?: string;
  minutes?: number;
  requiredPermission?: string;
} {
  const errorCode = searchParams.get("error") as ErrorCode;
  const details = searchParams.get("details");
  const minutes = searchParams.get("minutes");
  const requiredPermission = searchParams.get("required");

  if (!errorCode) {
    return {};
  }

  return {
    errorCode,
    message: ERROR_MESSAGES[errorCode] || "An unexpected error occurred",
    details: details || undefined,
    minutes: minutes ? parseInt(minutes, 10) : undefined,
    requiredPermission: requiredPermission || undefined,
  };
}

/**
 * Create a standardized error response for API endpoints
 */
export function createErrorResponse(
  errorCode: ErrorCode,
  statusCode: number = 400,
  additionalData?: Record<string, unknown>
): Response {
  const errorData = {
    error: {
      code: errorCode,
      message: ERROR_MESSAGES[errorCode] || "An unexpected error occurred",
      ...additionalData,
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(errorData), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Utility to safely handle async operations with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options: ErrorHandlingOptions = {}
): Promise<T | never> {
  try {
    return await operation();
  } catch (error) {
    console.error("Safe async operation failed:", error);

    // Determine error code based on error type
    let errorCode: ErrorCode = "server-error";

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("unauthorized") || message.includes("permission")) {
        errorCode = "unauthorized-access";
      } else if (
        message.includes("validation") ||
        message.includes("invalid")
      ) {
        errorCode = "validation-failed";
      } else if (message.includes("network") || message.includes("fetch")) {
        errorCode = "network-error";
      } else if (message.includes("database") || message.includes("supabase")) {
        errorCode = "database-error";
      }
    }

    await handleAuthError(errorCode, context, options);
  }
}
