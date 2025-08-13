import { NextRequest, NextResponse } from "next/server";
import { hybridAuth } from "@/lib/hybrid-auth-system";

/**
 * Hybrid Authentication Middleware
 * Provides route protection and session validation for the hybrid auth system
 */

export interface AuthContext {
  type: "admin" | "staff";
  session: any;
  user?: any;
  permissions?: string[];
}

export interface MiddlewareOptions {
  requireAdmin?: boolean;
  requireStaff?: boolean;
  requiredPermissions?: string[];
  allowBoth?: boolean;
}

/**
 * Extract session token from request headers or cookies
 */
function extractSessionToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try custom header
  const tokenHeader = request.headers.get("x-session-token");
  if (tokenHeader) {
    return tokenHeader;
  }

  // Try cookie
  const tokenCookie = request.cookies.get("session_token");
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

/**
 * Validate admin session and return auth context
 */
async function validateAdminAuth(
  sessionToken: string
): Promise<AuthContext | null> {
  try {
    const adminSession = await hybridAuth.validateAdminSession(
      sessionToken
    );
    if (!adminSession) {
      return null;
    }

    return {
      type: "admin",
      session: adminSession,
      permissions: ["admin"], // Admins have all permissions
    };
  } catch (error) {
    console.error("Error validating admin session:", error);
    return null;
  }
}

/**
 * Validate staff session and return auth context
 */
async function validateStaffAuth(
  sessionToken: string
): Promise<AuthContext | null> {
  try {
    const staffSession = await hybridAuth.validateStaffSession(sessionToken);
    if (!staffSession) {
      return null;
    }

    // Get staff information for permissions
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: staff } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role, permissions")
      .eq("id", staffSession.staff_id)
      .single();

    return {
      type: "staff",
      session: staffSession,
      user: staff,
      permissions: staff?.permissions || [],
    };
  } catch (error) {
    console.error("Error validating staff session:", error);
    return null;
  }
}

/**
 * Check if user has required permissions
 */
function hasRequiredPermissions(
  authContext: AuthContext,
  requiredPermissions: string[]
): boolean {
  if (authContext.type === "admin") {
    return true; // Admins have all permissions
  }

  if (!authContext.permissions || requiredPermissions.length === 0) {
    return requiredPermissions.length === 0;
  }

  return requiredPermissions.every((permission) =>
    authContext.permissions!.includes(permission)
  );
}

/**
 * Main authentication middleware function
 */
export async function hybridAuthMiddleware(
  request: NextRequest,
  options: MiddlewareOptions = {}
): Promise<{ authContext: AuthContext | null; response: NextResponse | null }> {
  const {
    requireAdmin = false,
    requireStaff = false,
    requiredPermissions = [],
    allowBoth = true,
  } = options;

  // Extract session token
  const sessionToken = extractSessionToken(request);
  if (!sessionToken) {
    return {
      authContext: null,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  let authContext: AuthContext | null = null;

  // Try admin authentication first if allowed
  if (!requireStaff || allowBoth) {
    authContext = await validateAdminAuth(sessionToken);
  }

  // Try staff authentication if admin failed and staff is allowed
  if (!authContext && (!requireAdmin || allowBoth)) {
    authContext = await validateStaffAuth(sessionToken);
  }

  // Check if authentication was successful
  if (!authContext) {
    return {
      authContext: null,
      response: NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      ),
    };
  }

  // Check specific role requirements
  if (requireAdmin && authContext.type !== "admin") {
    return {
      authContext: null,
      response: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  if (requireStaff && authContext.type !== "staff") {
    return {
      authContext: null,
      response: NextResponse.json(
        { error: "Staff access required" },
        { status: 403 }
      ),
    };
  }

  // Check permissions
  if (
    requiredPermissions.length > 0 &&
    !hasRequiredPermissions(authContext, requiredPermissions)
  ) {
    return {
      authContext: null,
      response: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return {
    authContext,
    response: null, // No error response needed
  };
}

/**
 * Higher-order function to create protected API route handlers
 */
export function withHybridAuth(
  handler: (
    request: NextRequest,
    authContext: AuthContext
  ) => Promise<NextResponse>,
  options: MiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { authContext, response } = await hybridAuthMiddleware(
      request,
      options
    );

    if (response) {
      return response; // Return error response
    }

    if (!authContext) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    try {
      return await handler(request, authContext);
    } catch (error) {
      console.error("Error in protected route handler:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility function to get current user from session token
 */
export async function getCurrentUser(
  sessionToken: string
): Promise<AuthContext | null> {
  // Try admin first
  const adminAuth = await validateAdminAuth(sessionToken);
  if (adminAuth) {
    return adminAuth;
  }

  // Try staff
  const staffAuth = await validateStaffAuth(sessionToken);
  if (staffAuth) {
    return staffAuth;
  }

  return null;
}

/**
 * Utility function to check if session is valid
 */
export async function isSessionValid(sessionToken: string): Promise<boolean> {
  const authContext = await getCurrentUser(sessionToken);
  return authContext !== null;
}

/**
 * Utility function to get session info for monitoring
 */
export async function getSessionInfo(sessionToken: string): Promise<any> {
  return await hybridAuth.getSessionInfo(sessionToken);
}

/**
 * Rate limiting for PIN attempts
 */
const pinAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkPINRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const attempts = pinAttempts.get(identifier);

  if (!attempts) {
    pinAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset if window has passed
  if (now - attempts.lastAttempt > windowMs) {
    pinAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Check if limit exceeded
  if (attempts.count >= maxAttempts) {
    return false;
  }

  // Increment attempts
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

/**
 * Clear PIN rate limit for identifier
 */
export function clearPINRateLimit(identifier: string): void {
  pinAttempts.delete(identifier);
}

/**
 * Middleware for protecting Next.js API routes
 */
export function createAuthMiddleware(options: MiddlewareOptions = {}) {
  return (handler: Function) => {
    return withHybridAuth(handler as any, options);
  };
}

/**
 * React hook for client-side authentication state
 */
export function useHybridAuth() {
  if (typeof window === "undefined") {
    return { authContext: null, loading: true };
  }

  const [authContext, setAuthContext] = React.useState<AuthContext | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for stored session
        const adminSession = localStorage.getItem("hybrid_admin_session");
        const staffSession = localStorage.getItem("hybrid_staff_session");

        if (adminSession) {
          const sessionData = JSON.parse(adminSession);
          const isValid = await isSessionValid(sessionData.token);

          if (isValid) {
            setAuthContext({
              type: "admin",
              session: sessionData,
              permissions: ["admin"],
            });
          } else {
            localStorage.removeItem("hybrid_admin_session");
          }
        } else if (staffSession) {
          const sessionData = JSON.parse(staffSession);
          const isValid = await isSessionValid(sessionData.token);

          if (isValid) {
            // Get staff info
            const authContext = await getCurrentUser(sessionData.token);
            setAuthContext(authContext);
          } else {
            localStorage.removeItem("hybrid_staff_session");
          }
        }
      } catch (error) {
        console.error("Error checking auth state:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem("hybrid_admin_session");
    localStorage.removeItem("hybrid_staff_session");
    setAuthContext(null);
  };

  return { authContext, loading, logout };
}

// Import React for the hook
import React from "react";
