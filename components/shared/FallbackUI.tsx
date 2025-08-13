"use client";

import React from "react";
import {
  AlertTriangle,
  Shield,
  Clock,
  RefreshCw,
  Home,
  LogIn,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FallbackUIProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
}

// Permission denied fallback
export function PermissionDeniedFallback({
  requiredPermission,
  currentRole,
  onRetry,
  onGoHome,
}: FallbackUIProps & {
  requiredPermission?: string;
  currentRole?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Access Restricted
          </CardTitle>
          <CardDescription className="text-gray-600">
            You don't have the necessary permissions to access this area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {requiredPermission && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    <strong>Required permission:</strong>{" "}
                    <code className="font-mono text-sm bg-gray-100 px-1 rounded">
                      {requiredPermission}
                    </code>
                  </p>
                  {currentRole && (
                    <p>
                      <strong>Your current role:</strong> {currentRole}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Need access?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Contact your manager or business owner</li>
              <li>• Request the necessary role or permissions</li>
              <li>• Check if your role has been recently updated</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            )}
            <Button
              onClick={
                onGoHome || (() => (window.location.href = "/dashboard"))
              }
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Session expired fallback
export function SessionExpiredFallback({
  isStaff = false,
  onRetry,
  onGoHome,
}: FallbackUIProps & {
  isStaff?: boolean;
}) {
  const loginUrl = isStaff ? "/staff/login" : "/login";
  const dashboardUrl = isStaff ? "/staffs" : "/dashboard";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Session Expired
          </CardTitle>
          <CardDescription className="text-gray-600">
            Your session has expired for security reasons. Please sign in again
            to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Sessions automatically expire after{" "}
              {isStaff ? "8 hours" : "24 hours"} to protect your account and
              data.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => (window.location.href = loginUrl)}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In Again
            </Button>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Rate limit exceeded fallback
export function RateLimitFallback({
  type = "authentication",
  remainingMinutes = 15,
  onRetry,
  onGoHome,
}: FallbackUIProps & {
  type?: "authentication" | "admin";
  remainingMinutes?: number;
}) {
  const isAdmin = type === "admin";
  const lockoutDuration = isAdmin ? 30 : 15;
  const maxAttempts = isAdmin ? 5 : 3;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${
              isAdmin ? "bg-red-100" : "bg-orange-100"
            }`}
          >
            <Shield
              className={`w-8 h-8 ${
                isAdmin ? "text-red-600" : "text-orange-600"
              }`}
            />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            {isAdmin ? "Admin Access Locked" : "Account Temporarily Locked"}
          </CardTitle>
          <CardDescription className="text-gray-600">
            Too many failed {isAdmin ? "admin PIN" : "PIN"} attempts. Access is
            temporarily restricted for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              After {maxAttempts} failed attempts, access is locked for{" "}
              {lockoutDuration} minutes to protect against unauthorized access.
            </AlertDescription>
          </Alert>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Time remaining:</p>
            <p
              className={`text-2xl font-bold ${
                isAdmin ? "text-red-600" : "text-orange-600"
              }`}
            >
              {remainingMinutes} minutes
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              While you wait:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Double-check your {isAdmin ? "admin PIN" : "PIN"}</li>
              <li>• Ensure you're entering the correct credentials</li>
              <li>
                • Contact support if you've forgotten your{" "}
                {isAdmin ? "admin PIN" : "PIN"}
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
            )}
            <Button
              onClick={
                onGoHome || (() => (window.location.href = "/dashboard"))
              }
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Generic error fallback
export function GenericErrorFallback({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again or contact support if the problem persists.",
  showDetails = false,
  errorDetails,
  onRetry,
  onGoHome,
}: FallbackUIProps & {
  title?: string;
  message?: string;
  showDetails?: boolean;
  errorDetails?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showDetails && errorDetails && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {errorDetails}
                  </pre>
                </details>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              What you can do:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Refresh the page and try again</li>
              <li>• Check your internet connection</li>
              <li>• Clear your browser cache</li>
              <li>• Contact support if the issue persists</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {onRetry && (
              <Button onClick={onRetry} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button
              onClick={
                onGoHome || (() => (window.location.href = "/dashboard"))
              }
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading error fallback (for when data fails to load)
export function LoadingErrorFallback({
  resource = "data",
  onRetry,
  onGoHome,
}: FallbackUIProps & {
  resource?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[40vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Failed to Load {resource}
          </CardTitle>
          <CardDescription className="text-gray-600">
            We couldn't load the {resource}. This might be a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onGoHome && (
              <Button onClick={onGoHome} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Configuration error fallback (for missing setup)
export function ConfigurationErrorFallback({
  configType = "system",
  onConfigure,
  onGoHome,
}: FallbackUIProps & {
  configType?: string;
  onConfigure?: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Setup Required
          </CardTitle>
          <CardDescription className="text-gray-600">
            {configType} configuration is required before you can access this
            feature.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Please complete the {configType} setup to continue using this
              feature.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3">
            {onConfigure && (
              <Button onClick={onConfigure} className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Configure Now
              </Button>
            )}
            <Button
              onClick={
                onGoHome || (() => (window.location.href = "/dashboard"))
              }
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
