"use client";

import { ReactNode } from "react";
import { useStaffSession } from "@/hooks/useStaffSession";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/lib/permissions";

interface PermissionGuardProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
  showLoading?: boolean;
}

/**
 * Component that conditionally renders children based on staff permissions
 * @param permissions - Array of required permissions
 * @param children - Content to render if permissions are met
 * @param fallback - Content to render if permissions are not met
 * @param requireAll - If true, requires all permissions; if false, requires any permission
 * @param showLoading - Whether to show loading state while checking permissions
 */
export function PermissionGuard({
  permissions,
  children,
  fallback = null,
  requireAll = false,
  showLoading = true,
}: PermissionGuardProps) {
  const { permissions: userPermissions, isLoading } = useStaffSession();

  // Show loading state while checking permissions
  if (isLoading && showLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  // If no permissions required, always show content
  if (permissions.length === 0) {
    return <>{children}</>;
  }

  // Check permissions based on requireAll flag
  const hasAccess = requireAll
    ? hasAllPermissions(userPermissions, permissions)
    : hasAnyPermission(userPermissions, permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for wrapping components with permission checks
 * @param requiredPermissions - Array of required permissions
 * @param requireAll - If true, requires all permissions; if false, requires any permission
 * @param customFallback - Custom fallback component
 */
export function withPermissions(
  requiredPermissions: string[],
  requireAll: boolean = false,
  customFallback?: ReactNode
) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function PermissionWrappedComponent(props: P) {
      return (
        <PermissionGuard
          permissions={requiredPermissions}
          requireAll={requireAll}
          fallback={
            customFallback || (
              <div className="p-4 text-center text-gray-500">
                <p>You don't have permission to access this feature.</p>
              </div>
            )
          }
        >
          <Component {...props} />
        </PermissionGuard>
      );
    };
  };
}

/**
 * Hook for checking specific permissions
 * @param requiredPermissions - Array of required permissions
 * @param requireAll - If true, requires all permissions; if false, requires any permission
 * @returns Object with permission check results
 */
export function usePermissionCheck(
  requiredPermissions: string[],
  requireAll: boolean = false
) {
  const { permissions: userPermissions, isLoading } = useStaffSession();

  const hasAccess = requireAll
    ? hasAllPermissions(userPermissions, requiredPermissions)
    : hasAnyPermission(userPermissions, requiredPermissions);

  return {
    hasAccess,
    isLoading,
    userPermissions,
    requiredPermissions,
    canPerform: (permission: string) =>
      hasPermission(userPermissions, permission),
  };
}

/**
 * Component for conditionally rendering based on a single permission
 * @param permission - Single permission to check
 * @param children - Content to render if permission is met
 * @param fallback - Content to render if permission is not met
 */
export function SinglePermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard
      permissions={[permission]}
      fallback={fallback}
      showLoading={false}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * Component for displaying unauthorized access message
 */
export function UnauthorizedAccess({
  message,
  title = "Access Denied",
  showBackButton = true,
  showContactInfo = false,
}: {
  message?: string;
  title?: string;
  showBackButton?: boolean;
  showContactInfo?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10m8-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">
          {message || "You don't have permission to access this feature."}
        </p>

        {showContactInfo && (
          <p className="text-sm text-gray-500 mb-4">
            If you believe this is an error, please contact your manager or
            system administrator.
          </p>
        )}

        <div className="flex gap-2 justify-center">
          {showBackButton && (
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          )}
          <button
            onClick={() => (window.location.href = "/staff/dashboard")}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact unauthorized access message for inline use
 */
export function InlineUnauthorized({
  message = "Access denied",
  showIcon = true,
}: {
  message?: string;
  showIcon?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
      {showIcon && (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      )}
      <span className="text-sm">{message}</span>
    </div>
  );
}

/**
 * Permission denied card for section-level protection
 */
export function PermissionDeniedCard({
  title = "Permission Required",
  message = "You need additional permissions to access this section.",
  requiredPermissions = [],
  showPermissions = false,
}: {
  title?: string;
  message?: string;
  requiredPermissions?: string[];
  showPermissions?: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className="w-full h-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10m8-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h4 className="text-md font-medium text-gray-900 mb-2">{title}</h4>
        <p className="text-sm text-gray-600 mb-4">{message}</p>

        {showPermissions && requiredPermissions.length > 0 && (
          <div className="text-xs text-gray-500">
            <p className="mb-1">Required permissions:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {requiredPermissions.map((permission) => (
                <span
                  key={permission}
                  className="px-2 py-1 bg-gray-200 rounded text-xs font-mono"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
