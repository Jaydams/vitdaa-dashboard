"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, RefreshCw, X, CheckCircle } from "lucide-react";
import { useSessionManager } from "@/lib/session-manager";
import { toast } from "sonner";

interface SessionExpiryWarningProps {
  className?: string;
  showInHeader?: boolean;
  warningThreshold?: number; // minutes before expiry to show warning
  criticalThreshold?: number; // minutes before expiry to show critical warning
}

export function SessionExpiryWarning({
  className = "",
  showInHeader = false,
  warningThreshold = 10,
  criticalThreshold = 2,
}: SessionExpiryWarningProps) {
  const { session, timeUntilExpiry, isValid, extendSession } =
    useSessionManager();
  const [isExtending, setIsExtending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
  const shouldShowWarning =
    isValid && minutesUntilExpiry <= warningThreshold && minutesUntilExpiry > 0;
  const isCritical = minutesUntilExpiry <= criticalThreshold;

  // Reset dismissed state when session changes or time increases
  useEffect(() => {
    if (minutesUntilExpiry > warningThreshold) {
      setIsDismissed(false);
    }
  }, [minutesUntilExpiry, warningThreshold]);

  const handleExtendSession = async (minutes: number = 30) => {
    setIsExtending(true);
    try {
      await extendSession(minutes);
      toast.success(`Session extended by ${minutes} minutes`);
      setIsDismissed(true);
    } catch (error) {
      toast.error("Failed to extend session. Please try again.");
    } finally {
      setIsExtending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!session || !shouldShowWarning || isDismissed) {
    return null;
  }

  const progressValue = Math.max(
    0,
    (minutesUntilExpiry / warningThreshold) * 100
  );

  // Header version - compact indicator
  if (showInHeader) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge
          variant="outline"
          className={`${
            isCritical
              ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
              : "bg-orange-50 text-orange-700 border-orange-200"
          }`}
        >
          <Clock className="h-3 w-3 mr-1" />
          {minutesUntilExpiry}m left
        </Badge>
        <Button
          onClick={() => handleExtendSession()}
          size="sm"
          variant="outline"
          disabled={isExtending}
          className="h-7 px-2 text-xs"
        >
          {isExtending ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            "Extend"
          )}
        </Button>
      </div>
    );
  }

  // Full warning component
  return (
    <Card
      className={`${
        isCritical
          ? "border-red-200 bg-red-50 shadow-lg"
          : "border-orange-200 bg-orange-50"
      } ${className}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {isCritical ? (
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 animate-pulse" />
            ) : (
              <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4
                  className={`font-medium ${
                    isCritical ? "text-red-800" : "text-orange-800"
                  }`}
                >
                  {isCritical ? "Session Expiring Soon!" : "Session Warning"}
                </h4>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    isCritical
                      ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-orange-100 text-orange-700 border-orange-300"
                  }`}
                >
                  {minutesUntilExpiry} minute
                  {minutesUntilExpiry !== 1 ? "s" : ""} left
                </Badge>
              </div>

              <p
                className={`text-sm mb-3 ${
                  isCritical ? "text-red-700" : "text-orange-700"
                }`}
              >
                {isCritical
                  ? "Your session will expire very soon. Extend now to avoid losing your work."
                  : "Your session will expire soon. Consider extending it to continue working."}
              </p>

              {/* Progress bar */}
              <div className="mb-3">
                <Progress
                  value={progressValue}
                  className={`h-2 ${
                    isCritical ? "bg-red-200" : "bg-orange-200"
                  }`}
                />
              </div>

              {/* Session info */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                <div>
                  <p className="text-gray-600">Staff Role</p>
                  <p className="font-medium capitalize">{session.role}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expires At</p>
                  <p className="font-medium">
                    {new Date(session.expiresAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleExtendSession(30)}
                  size="sm"
                  disabled={isExtending}
                  className={`${
                    isCritical
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  } text-white`}
                >
                  {isExtending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Extending...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Extend 30 min
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleExtendSession(60)}
                  size="sm"
                  variant="outline"
                  disabled={isExtending}
                  className={`border-gray-300 ${
                    isCritical
                      ? "text-red-700 hover:bg-red-50"
                      : "text-orange-700 hover:bg-orange-50"
                  }`}
                >
                  Extend 1 hour
                </Button>

                {!isCritical && (
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Close button */}
          {!isCritical && (
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Floating session expiry notification
 */
export function SessionExpiryNotification() {
  const { session, timeUntilExpiry, isValid } = useSessionManager();
  const [isVisible, setIsVisible] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

  useEffect(() => {
    if (!session || !isValid) {
      setIsVisible(false);
      setHasShownWarning(false);
      return;
    }

    // Show notification when 5 minutes left
    if (minutesUntilExpiry <= 5 && minutesUntilExpiry > 0 && !hasShownWarning) {
      setIsVisible(true);
      setHasShownWarning(true);

      // Auto-hide after 10 seconds unless critical
      if (minutesUntilExpiry > 2) {
        setTimeout(() => {
          setIsVisible(false);
        }, 10000);
      }
    }

    // Reset when session is extended
    if (minutesUntilExpiry > 10) {
      setHasShownWarning(false);
    }
  }, [session, isValid, minutesUntilExpiry, hasShownWarning]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <SessionExpiryWarning criticalThreshold={2} warningThreshold={5} />
    </div>
  );
}

/**
 * Hook for session expiry management
 */
export function useSessionExpiryWarning() {
  const { session, timeUntilExpiry, isValid, extendSession } =
    useSessionManager();

  const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
  const shouldWarn =
    isValid && minutesUntilExpiry <= 10 && minutesUntilExpiry > 0;
  const isCritical = minutesUntilExpiry <= 2;

  return {
    session,
    minutesUntilExpiry,
    shouldWarn,
    isCritical,
    extendSession,
  };
}
