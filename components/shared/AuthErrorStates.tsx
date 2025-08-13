"use client";

import React from "react";
import {
  AlertCircle,
  Clock,
  Shield,
  Key,
  RefreshCw,
  LogIn,
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

interface AuthErrorProps {
  onRetry?: () => void;
  onGoBack?: () => void;
}

// Staff PIN authentication failure
export function StaffPinFailureError({ onRetry, onGoBack }: AuthErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Key className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Invalid PIN
          </CardTitle>
          <CardDescription className="text-gray-600">
            The PIN you entered is incorrect. Please check and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              After 3 failed attempts, your account will be temporarily locked
              for 15 minutes.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onGoBack && (
              <Button variant="outline" onClick={onGoBack} className="w-full">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Staff PIN rate limit exceeded
export function StaffPinRateLimitError({
  remainingMinutes = 15,
  onRetry,
  onGoBack,
}: AuthErrorProps & { remainingMinutes?: number }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Account Temporarily Locked
          </CardTitle>
          <CardDescription className="text-gray-600">
            Too many failed PIN attempts. Please wait {remainingMinutes} minutes
            before trying again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This security measure protects your account from unauthorized
              access attempts.
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Time remaining:{" "}
              <span className="font-semibold text-orange-600">
                {remainingMinutes} minutes
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            )}
            {onGoBack && (
              <Button variant="outline" onClick={onGoBack} className="w-full">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin PIN authentication failure
export function AdminPinFailureError({ onRetry, onGoBack }: AuthErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Invalid Admin PIN
          </CardTitle>
          <CardDescription className="text-gray-600">
            The admin PIN you entered is incorrect. Please verify and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              After 5 failed attempts, admin access will be locked for 30
              minutes.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onGoBack && (
              <Button variant="outline" onClick={onGoBack} className="w-full">
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin PIN rate limit exceeded
export function AdminPinRateLimitError({
  remainingMinutes = 30,
  onRetry,
  onGoBack,
}: AuthErrorProps & { remainingMinutes?: number }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Admin Access Locked
          </CardTitle>
          <CardDescription className="text-gray-600">
            Too many failed admin PIN attempts. Admin access is temporarily
            locked for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is a critical security measure. All admin access attempts
              have been logged.
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Time remaining:{" "}
              <span className="font-semibold text-red-600">
                {remainingMinutes} minutes
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            )}
            {onGoBack && (
              <Button variant="outline" onClick={onGoBack} className="w-full">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Permission denied error
export function PermissionDeniedError({
  requiredPermission,
  currentRole,
  onRetry,
  onGoBack,
}: AuthErrorProps & {
  requiredPermission?: string;
  currentRole?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Access Denied
          </CardTitle>
          <CardDescription className="text-gray-600">
            You don't have permission to access this resource or perform this
            action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiredPermission && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Required permission:{" "}
                <code className="font-mono text-sm">{requiredPermission}</code>
                {currentRole && (
                  <>
                    <br />
                    Your current role:{" "}
                    <span className="font-semibold">{currentRole}</span>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Need access?</strong> Contact your manager or business
              owner to request the necessary permissions.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Permissions Again
              </Button>
            )}
            {onGoBack && (
              <Button variant="outline" onClick={onGoBack} className="w-full">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Session expired error
export function SessionExpiredError({ onRetry, onGoBack }: AuthErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
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
              Sessions automatically expire after 8 hours of inactivity to
              protect your account.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => (window.location.href = "/staff/login")}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In Again
            </Button>
            {onGoBack && (
              <Button variant="outline" onClick={onGoBack} className="w-full">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Generic authentication error
export function AuthenticationError({
  title = "Authentication Required",
  message = "You need to be signed in to access this resource.",
  onRetry,
  onGoBack,
}: AuthErrorProps & {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <LogIn className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => (window.location.href = "/login")}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onGoBack && (
              <Button variant="outline" onClick={onGoBack} className="w-full">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
