import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createErrorResponse, ErrorCode, ERROR_CODES } from "./error-handling";

// API Error types
export interface ApiError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: Record<string, unknown>;
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code: ErrorCode = ERROR_CODES.VALIDATION_FAILED;
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class AuthenticationError extends Error implements ApiError {
  statusCode = 401;
  code: ErrorCode = ERROR_CODES.AUTHENTICATION_REQUIRED;
  details?: Record<string, unknown>;

  constructor(
    message: string = "Authentication required",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AuthenticationError";
    this.details = details;
  }
}

export class AuthorizationError extends Error implements ApiError {
  statusCode = 403;
  code: ErrorCode = ERROR_CODES.PERMISSION_DENIED;
  details?: Record<string, unknown>;

  constructor(
    message: string = "Permission denied",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.details = details;
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code: ErrorCode = ERROR_CODES.STAFF_NOT_FOUND;
  details?: Record<string, unknown>;

  constructor(
    message: string = "Resource not found",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "NotFoundError";
    this.details = details;
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code: ErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.INVALID_DATA,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ConflictError";
    this.code = code;
    this.details = details;
  }
}

export class ServerError extends Error implements ApiError {
  statusCode = 500;
  code: ErrorCode = ERROR_CODES.SERVER_ERROR;
  details?: Record<string, unknown>;

  constructor(
    message: string = "Internal server error",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ServerError";
    this.details = details;
  }
}

// API Error Handler wrapper
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API Error:", error);
      return handleApiError(error);
    }
  };
}

// Handle different types of errors and return appropriate responses
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    const validationErrors = error.errors.reduce((acc, err) => {
      const path = err.path.join(".");
      acc[path] = err.message;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: "Validation failed",
          details: { validationErrors },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    const message = error.message.toLowerCase();

    if (
      message.includes("unique constraint") ||
      message.includes("already exists")
    ) {
      const code = message.includes("email")
        ? ERROR_CODES.EMAIL_ALREADY_EXISTS
        : message.includes("phone")
        ? ERROR_CODES.PHONE_ALREADY_EXISTS
        : ERROR_CODES.INVALID_DATA;

      return NextResponse.json(
        {
          error: {
            code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    if (message.includes("not found")) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.STAFF_NOT_FOUND,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (message.includes("unauthorized") || message.includes("permission")) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.UNAUTHORIZED_ACCESS,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }
  }

  // Default server error
  return NextResponse.json(
    {
      error: {
        code: ERROR_CODES.SERVER_ERROR,
        message: "An unexpected error occurred",
      },
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

// Validation middleware for API routes
export function validateRequestBody<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<T> => {
    try {
      const body = await request.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Request validation failed", {
          validationErrors: error.errors.reduce((acc, err) => {
            const path = err.path.join(".");
            acc[path] = err.message;
            return acc;
          }, {} as Record<string, string>),
        });
      }
      throw new ValidationError("Invalid request body");
    }
  };
}

// Query parameter validation
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(searchParams.entries());
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Query parameter validation failed", {
        validationErrors: error.errors.reduce((acc, err) => {
          const path = err.path.join(".");
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>),
      });
    }
    throw new ValidationError("Invalid query parameters");
  }
}

// File upload validation
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    required?: boolean;
  } = {}
): void {
  const {
    maxSize = 10 * 1024 * 1024,
    allowedTypes = [],
    required = true,
  } = options;

  if (required && !file) {
    throw new ValidationError("File is required");
  }

  if (!file) return;

  if (file.size > maxSize) {
    throw new ValidationError(
      `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
      { fileSize: file.size, maxSize }
    );
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new ValidationError("File type not supported", {
      fileType: file.type,
      allowedTypes,
    });
  }
}

// Rate limiting error
export function createRateLimitError(
  remainingTime: number,
  maxAttempts: number
): ApiError {
  return {
    name: "RateLimitError",
    message: `Too many attempts. Please wait ${Math.ceil(
      remainingTime / 1000
    )} seconds before trying again.`,
    statusCode: 429,
    code: ERROR_CODES.RATE_LIMITED,
    details: {
      remainingTime,
      maxAttempts,
      retryAfter: Math.ceil(remainingTime / 1000),
    },
  };
}

// Database error handling
export function handleDatabaseError(error: unknown): never {
  console.error("Database error:", error);

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("unique constraint")) {
      if (message.includes("email")) {
        throw new ConflictError(
          "Email address already exists",
          ERROR_CODES.EMAIL_ALREADY_EXISTS
        );
      }
      if (message.includes("phone")) {
        throw new ConflictError(
          "Phone number already exists",
          ERROR_CODES.PHONE_ALREADY_EXISTS
        );
      }
      throw new ConflictError("Resource already exists");
    }

    if (message.includes("foreign key constraint")) {
      throw new ValidationError("Referenced resource does not exist");
    }

    if (message.includes("not found") || message.includes("no rows")) {
      throw new NotFoundError("Resource not found");
    }

    if (message.includes("connection") || message.includes("timeout")) {
      throw new ServerError("Database connection error");
    }
  }

  throw new ServerError("Database operation failed");
}

// Success response helper
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

// Paginated response helper
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
      message,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

// Async error boundary for API routes
export async function safeApiCall<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(
      `API operation failed${errorContext ? ` (${errorContext})` : ""}:`,
      error
    );

    // Re-throw known API errors
    if (error instanceof ApiError || error instanceof z.ZodError) {
      throw error;
    }

    // Handle database errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("database") ||
        message.includes("supabase") ||
        message.includes("sql") ||
        message.includes("constraint")
      ) {
        handleDatabaseError(error);
      }
    }

    // Default to server error
    throw new ServerError(
      errorContext ? `${errorContext} operation failed` : "Operation failed"
    );
  }
}

// Request logging middleware
export function logApiRequest(
  request: NextRequest,
  context: {
    userId?: string;
    staffId?: string;
    businessId?: string;
    action?: string;
  } = {}
) {
  const { method, url, headers } = request;
  const userAgent = headers.get("user-agent");
  const ip = headers.get("x-forwarded-for") || headers.get("x-real-ip");

  console.log("API Request:", {
    method,
    url,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

// Response time middleware
export function withResponseTime<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      const response = await handler(...args);
      const responseTime = Date.now() - startTime;

      // Add response time header
      response.headers.set("X-Response-Time", `${responseTime}ms`);

      console.log(`API Response Time: ${responseTime}ms`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.log(`API Error Response Time: ${responseTime}ms`);
      throw error;
    }
  };
}
