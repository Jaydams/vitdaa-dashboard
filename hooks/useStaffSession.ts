import { useEffect, useState } from "react";
// DO NOT import validateStaffSession from server code in client components!
import { Staff, StaffSessionRecord } from "@/types/auth";

interface StaffSessionState {
  staff: Staff | null;
  sessionRecord: StaffSessionRecord | null;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for managing staff session state
 * @returns Staff session state and utilities
 */
export function useStaffSession() {
  const [sessionState, setSessionState] = useState<StaffSessionState>({
    staff: null,
    sessionRecord: null,
    permissions: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      setSessionState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Get session token from cookie
      const sessionToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("staff_session_token="))
        ?.split("=")[1];

      if (!sessionToken) {
        setSessionState({
          staff: null,
          sessionRecord: null,
          permissions: [],
          isLoading: false,
          error: "No session token found",
        });
        return;
      }

      // Validate session (client stub: always null)
      // In a real app, use an API route or server action to validate session on the server
      const sessionRecord = null;
      // const sessionRecord = await fetch('/api/validate-staff-session', { ... })
      if (!sessionRecord) {
        setSessionState({
          staff: null,
          sessionRecord: null,
          permissions: [],
          isLoading: false,
          error: "Invalid or expired session (client stub)",
        });
        return;
      }

      // Get staff details from headers (set by middleware)
      const staffId = document
        .querySelector('meta[name="x-staff-id"]')
        ?.getAttribute("content");
      const staffRole = document
        .querySelector('meta[name="x-staff-role"]')
        ?.getAttribute("content");
      const staffPermissions = document
        .querySelector('meta[name="x-staff-permissions"]')
        ?.getAttribute("content");

      if (staffId && staffRole && staffPermissions) {
        try {
          const permissions = JSON.parse(staffPermissions);

          // Note: In a real implementation, you'd fetch full staff details
          // For now, we'll create a minimal staff object
          const staff: Staff = {
            id: staffId,
            role: staffRole as any,
            permissions,
            // Other fields would be populated from actual API call
          } as Staff;

          setSessionState({
            staff,
            sessionRecord,
            permissions,
            isLoading: false,
            error: null,
          });
        } catch (parseError) {
          setSessionState({
            staff: null,
            sessionRecord: null,
            permissions: [],
            isLoading: false,
            error: "Error parsing session data",
          });
        }
      } else {
        setSessionState({
          staff: null,
          sessionRecord: sessionRecord,
          permissions: [],
          isLoading: false,
          error: "Incomplete session data",
        });
      }
    } catch (error) {
      console.error("Error validating staff session:", error);
      setSessionState({
        staff: null,
        sessionRecord: null,
        permissions: [],
        isLoading: false,
        error: "Session validation failed",
      });
    }
  };

  const hasPermission = (permission: string): boolean => {
    return sessionState.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((permission) =>
      sessionState.permissions.includes(permission)
    );
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((permission) =>
      sessionState.permissions.includes(permission)
    );
  };

  const canPerformAction = (action: string): boolean => {
    // Import canPerformAction from permissions utility
    const { canPerformAction: canPerform } = require("@/lib/permissions");
    return canPerform(sessionState.permissions, action);
  };

  const signOut = async () => {
    try {
      // Clear session cookie
      document.cookie =
        "staff_session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Reset state
      setSessionState({
        staff: null,
        sessionRecord: null,
        permissions: [],
        isLoading: false,
        error: null,
      });

      // Redirect to staff login
      window.location.href = "/staff/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return {
    ...sessionState,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canPerformAction,
    signOut,
    refreshSession: validateSession,
  };
}

/**
 * Hook for checking if staff has specific permissions
 * @param requiredPermissions - Array of required permissions
 * @returns Boolean indicating if staff has required permissions
 */
export function useStaffPermissions(requiredPermissions: string[]) {
  const { permissions, isLoading } = useStaffSession();

  const hasPermissions =
    requiredPermissions.length === 0 ||
    requiredPermissions.some((permission) => permissions.includes(permission));

  return {
    hasPermissions,
    isLoading,
    permissions,
  };
}
