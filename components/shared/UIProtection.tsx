"use client";

import { ReactNode, useState, useEffect } from "react";
import { useStaffSession } from "@/hooks/useStaffSession";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/lib/permissions";
import { AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Props for ActionGuard component
 */
interface ActionGuardProps {
  action: string;
  permissions?: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  showReason?: boolean;
}

/**
 * Component that protects UI actions based on permissions
 * @param action - The action being protected
 * @param permissions - Required permissions (if not using action mapping)
 * @param requireAll - Whether all permissions are required
 * @param children - Content to render if authorized
 * @param fallback - Content to render if unauthorized
 * @param showReason - Whether to show reason for denial
 */
export function ActionGuard({
  action,
  permissions = [],
  requireAll = false,
  children,
  fallback = null,
  showReason = false,
}: ActionGuardProps) {
  const { permissions: userPermissions, canPerformAction } = useStaffSession();

  // Check if user can perform the action
  const canPerform =
    permissions.length > 0
      ? requireAll
        ? hasAllPermissions(userPermissions, permissions)
        : hasAnyPermission(userPermissions, permissions)
      : canPerformAction(action);

  if (!canPerform) {
    if (showReason) {
      return (
        <div className="p-2 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="h-4 w-4" />
            <span>Insufficient permissions for: {action}</span>
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Props for ButtonGuard component
 */
interface ButtonGuardProps {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
  disabledText?: string;
  showTooltip?: boolean;
}

/**
 * Component that disables buttons based on permissions
 * @param permissions - Required permissions
 * @param requireAll - Whether all permissions are required
 * @param children - Button content
 * @param disabledText - Text to show when disabled
 * @param showTooltip - Whether to show tooltip explaining why disabled
 */
export function ButtonGuard({
  permissions,
  requireAll = false,
  children,
  disabledText = "Insufficient permissions",
  showTooltip = true,
}: ButtonGuardProps) {
  const { permissions: userPermissions } = useStaffSession();

  const hasAccess = requireAll
    ? hasAllPermissions(userPermissions, permissions)
    : hasAnyPermission(userPermissions, permissions);

  if (!hasAccess) {
    return (
      <div className="relative group">
        <div className="opacity-50 cursor-not-allowed">{children}</div>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {disabledText}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Props for FieldGuard component
 */
interface FieldGuardProps {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
  mode?: "hide" | "disable" | "readonly";
  fallback?: ReactNode;
}

/**
 * Component that protects form fields based on permissions
 * @param permissions - Required permissions
 * @param requireAll - Whether all permissions are required
 * @param children - Field content
 * @param mode - How to handle unauthorized access (hide, disable, readonly)
 * @param fallback - Content to show when hidden
 */
export function FieldGuard({
  permissions,
  requireAll = false,
  children,
  mode = "hide",
  fallback = null,
}: FieldGuardProps) {
  const { permissions: userPermissions } = useStaffSession();

  const hasAccess = requireAll
    ? hasAllPermissions(userPermissions, permissions)
    : hasAnyPermission(userPermissions, permissions);

  if (!hasAccess) {
    switch (mode) {
      case "hide":
        return <>{fallback}</>;
      case "disable":
        return <div className="opacity-50 pointer-events-none">{children}</div>;
      case "readonly":
        return (
          <div className="relative">
            {children}
            <div className="absolute inset-0 bg-gray-100 bg-opacity-50 cursor-not-allowed" />
          </div>
        );
      default:
        return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Props for SectionGuard component
 */
interface SectionGuardProps {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
  title?: string;
  description?: string;
  showPlaceholder?: boolean;
}

/**
 * Component that protects entire sections of UI
 * @param permissions - Required permissions
 * @param requireAll - Whether all permissions are required
 * @param children - Section content
 * @param title - Section title for placeholder
 * @param description - Section description for placeholder
 * @param showPlaceholder - Whether to show placeholder when unauthorized
 */
export function SectionGuard({
  permissions,
  requireAll = false,
  children,
  title = "Restricted Section",
  description = "You don't have permission to view this section.",
  showPlaceholder = true,
}: SectionGuardProps) {
  const { permissions: userPermissions } = useStaffSession();

  const hasAccess = requireAll
    ? hasAllPermissions(userPermissions, permissions)
    : hasAnyPermission(userPermissions, permissions);

  if (!hasAccess) {
    if (!showPlaceholder) {
      return null;
    }

    return (
      <Card className="border-dashed border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-500">
            <Lock className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">{description}</p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

/**
 * Props for ConditionalRender component
 */
interface ConditionalRenderProps {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

/**
 * Simple conditional rendering based on permissions
 * @param permissions - Required permissions
 * @param requireAll - Whether all permissions are required
 * @param children - Content to render if authorized
 * @param fallback - Content to render if unauthorized
 * @param loading - Content to render while loading
 */
export function ConditionalRender({
  permissions,
  requireAll = false,
  children,
  fallback = null,
  loading = null,
}: ConditionalRenderProps) {
  const { permissions: userPermissions, isLoading } = useStaffSession();

  if (isLoading && loading) {
    return <>{loading}</>;
  }

  const hasAccess = requireAll
    ? hasAllPermissions(userPermissions, permissions)
    : hasAnyPermission(userPermissions, permissions);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Props for PermissionDebugger component
 */
interface PermissionDebuggerProps {
  show?: boolean;
}

/**
 * Component for debugging permissions (development only)
 * @param show - Whether to show the debugger
 */
export function PermissionDebugger({ show = false }: PermissionDebuggerProps) {
  const { permissions, staff, isLoading } = useStaffSession();
  const [isVisible, setIsVisible] = useState(show);

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (isLoading) {
    return null;
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Eye className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 max-h-96 overflow-auto z-50 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Permission Debugger</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-xs font-medium text-gray-600">Staff:</p>
          <p className="text-xs">
            {staff?.first_name} {staff?.last_name} ({staff?.role})
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600">Permissions:</p>
          <div className="max-h-32 overflow-auto">
            {permissions.map((permission) => (
              <p
                key={permission}
                className="text-xs font-mono bg-gray-100 px-1 rounded"
              >
                {permission}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook for checking multiple permission scenarios
 * @param permissionChecks - Array of permission check configurations
 * @returns Object with results for each check
 */
export function useMultiplePermissionChecks(
  permissionChecks: Array<{
    name: string;
    permissions: string[];
    requireAll?: boolean;
  }>
) {
  const { permissions: userPermissions, isLoading } = useStaffSession();

  const results = permissionChecks.reduce((acc, check) => {
    const hasAccess = check.requireAll
      ? hasAllPermissions(userPermissions, check.permissions)
      : hasAnyPermission(userPermissions, check.permissions);

    acc[check.name] = hasAccess;
    return acc;
  }, {} as Record<string, boolean>);

  return {
    results,
    isLoading,
    userPermissions,
  };
}
