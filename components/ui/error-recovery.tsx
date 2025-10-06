"use client";

import React, { useState, useEffect } from "react";
import { HiExclamationTriangle, HiArrowPath, HiSignal } from "react-icons/hi2";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-skeletons";
import { cn } from "@/lib/utils";

export interface ErrorRecoveryProps {
  error: Error | string | null;
  onRetry?: () => void | Promise<void>;
  onReset?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  showRetryCount?: boolean;
  autoRetry?: boolean;
  autoRetryDelay?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "card" | "inline" | "banner";
  title?: string;
  description?: string;
  showRefreshButton?: boolean;
}

export function ErrorRecovery({
  error,
  onRetry,
  onReset,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  showRetryCount = true,
  autoRetry = false,
  autoRetryDelay = 3000,
  className,
  size = "md",
  variant = "card",
  title,
  description,
  showRefreshButton = true,
}: ErrorRecoveryProps) {
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number | null>(
    null
  );

  const errorMessage = error instanceof Error ? error.message : error;
  const canRetry = retryCount < maxRetries && onRetry;
  const isNetworkError =
    errorMessage?.toLowerCase().includes("network") ||
    errorMessage?.toLowerCase().includes("fetch");

  // Auto-retry countdown
  useEffect(() => {
    if (autoRetry && canRetry && !isRetrying && error) {
      setAutoRetryCountdown(Math.ceil(autoRetryDelay / 1000));

      const interval = setInterval(() => {
        setAutoRetryCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            if (onRetry) {
              onRetry();
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setAutoRetryCountdown(null);
    }
  }, [autoRetry, canRetry, isRetrying, error, autoRetryDelay, onRetry]);

  const handleRetry = async () => {
    if (onRetry && !isRetrying) {
      setAutoRetryCountdown(null);
      await onRetry();
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const getErrorIcon = () => {
    if (isNetworkError) {
      return <HiSignal className="h-5 w-5" />;
    }
    return <HiExclamationTriangle className="h-5 w-5" />;
  };

  const getErrorTitle = () => {
    if (title) return title;
    if (isNetworkError) return "Connection Problem";
    return "Something went wrong";
  };

  const getErrorDescription = () => {
    if (description) return description;
    if (isNetworkError) {
      return "Please check your internet connection and try again.";
    }
    return "An unexpected error occurred. Please try again.";
  };

  const sizeClasses = {
    sm: "text-sm p-3",
    md: "text-base p-4",
    lg: "text-lg p-6",
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  if (!error) return null;

  const content = (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 text-red-500">
        {React.cloneElement(getErrorIcon(), {
          className: iconSizeClasses[size],
        })}
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "font-semibold text-red-800 dark:text-red-200",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-lg"
          )}
        >
          {getErrorTitle()}
        </h3>

        <p
          className={cn(
            "text-red-700 dark:text-red-300 mt-1",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base"
          )}
        >
          {getErrorDescription()}
        </p>

        {process.env.NODE_ENV === "development" && errorMessage && (
          <details className="mt-2">
            <summary className="text-xs text-red-600 cursor-pointer">
              Error Details
            </summary>
            <pre className="mt-1 text-xs text-red-600 bg-red-100 dark:bg-red-900/40 p-2 rounded overflow-auto">
              {errorMessage}
            </pre>
          </details>
        )}

        <div className="flex items-center gap-2 mt-3">
          {canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying || autoRetryCountdown !== null}
              size={size === "lg" ? "default" : "sm"}
              variant="outline"
              className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100 focus:ring-red-500"
            >
              {isRetrying ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Retrying...</span>
                </>
              ) : autoRetryCountdown !== null ? (
                <>
                  <HiArrowPath className="h-4 w-4 animate-spin" />
                  <span className="ml-2">
                    Auto-retry in {autoRetryCountdown}s
                  </span>
                </>
              ) : (
                <>
                  <HiArrowPath className="h-4 w-4" />
                  <span className="ml-2">Try Again</span>
                </>
              )}
            </Button>
          )}

          {showRetryCount && retryCount > 0 && (
            <span className="text-xs text-red-600">
              Attempt {retryCount}/{maxRetries}
            </span>
          )}

          {!canRetry && retryCount >= maxRetries && (
            <span className="text-xs text-red-600">Max retries reached</span>
          )}

          {showRefreshButton && (
            <Button
              onClick={handleRefresh}
              size={size === "lg" ? "default" : "sm"}
              variant="ghost"
              className="text-red-600 hover:text-red-800"
            >
              Refresh Page
            </Button>
          )}

          {onReset && (
            <Button
              onClick={onReset}
              size={size === "lg" ? "default" : "sm"}
              variant="ghost"
              className="text-red-600 hover:text-red-800"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md",
          sizeClasses[size],
          className
        )}
      >
        {content}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400",
          sizeClasses[size],
          className
        )}
      >
        {content}
      </div>
    );
  }

  // Default card variant
  return (
    <Card
      className={cn(
        "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800",
        className
      )}
    >
      <CardContent className={sizeClasses[size]}>{content}</CardContent>
    </Card>
  );
}

// Specialized error recovery components
export function NetworkErrorRecovery(
  props: Omit<ErrorRecoveryProps, "title" | "description">
) {
  return (
    <ErrorRecovery
      {...props}
      title="Connection Problem"
      description="Please check your internet connection and try again."
      autoRetry={true}
      autoRetryDelay={5000}
    />
  );
}

export function DataLoadErrorRecovery(
  props: Omit<ErrorRecoveryProps, "title" | "description">
) {
  return (
    <ErrorRecovery
      {...props}
      title="Failed to Load Data"
      description="We couldn't load the requested data. This might be a temporary issue."
      autoRetry={true}
      autoRetryDelay={3000}
    />
  );
}

export function ComponentErrorRecovery(
  props: Omit<ErrorRecoveryProps, "title" | "description">
) {
  return (
    <ErrorRecovery
      {...props}
      title="Component Error"
      description="This component encountered an error. Try refreshing or contact support if the problem persists."
      showRefreshButton={true}
    />
  );
}
