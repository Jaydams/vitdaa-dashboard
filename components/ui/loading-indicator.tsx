"use client";

import React from "react";
import { HiArrowPath, HiSignal, HiCheckCircle } from "react-icons/hi2";
import { cn } from "@/lib/utils";

export interface LoadingIndicatorProps {
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  success?: boolean;
  message?: string;
  position?: "top" | "bottom" | "inline";
  variant?: "default" | "minimal" | "detailed";
  showIcon?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
}

export function LoadingIndicator({
  isLoading = false,
  isRefreshing = false,
  error = null,
  success = false,
  message,
  position = "top",
  variant = "default",
  showIcon = true,
  autoHide = true,
  autoHideDelay = 3000,
  className,
}: LoadingIndicatorProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [shouldShow, setShouldShow] = React.useState(false);

  // Determine what to show
  React.useEffect(() => {
    if (isLoading || isRefreshing || error || success) {
      setShouldShow(true);
      setIsVisible(true);
    } else {
      setShouldShow(false);
      // Delay hiding for smooth transition
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isRefreshing, error, success]);

  // Auto-hide success messages
  React.useEffect(() => {
    if (success && autoHide) {
      const timer = setTimeout(() => {
        setShouldShow(false);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [success, autoHide, autoHideDelay]);

  const getContent = () => {
    if (error) {
      return {
        icon: <HiSignal className="h-4 w-4" />,
        text: message || "Connection error",
        bgColor: "bg-red-500",
        textColor: "text-white",
      };
    }

    if (success) {
      return {
        icon: <HiCheckCircle className="h-4 w-4" />,
        text: message || "Updated successfully",
        bgColor: "bg-green-500",
        textColor: "text-white",
      };
    }

    if (isRefreshing) {
      return {
        icon: <HiArrowPath className="h-4 w-4 animate-spin" />,
        text: message || "Refreshing data...",
        bgColor: "bg-blue-500",
        textColor: "text-white",
      };
    }

    if (isLoading) {
      return {
        icon: (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ),
        text: message || "Loading...",
        bgColor: "bg-blue-500",
        textColor: "text-white",
      };
    }

    return null;
  };

  const content = getContent();

  if (!content || !isVisible) {
    return null;
  }

  const positionClasses = {
    top: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
    bottom: "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50",
    inline: "relative",
  };

  const variantClasses = {
    default: "px-4 py-2 rounded-lg shadow-lg",
    minimal: "px-3 py-1 rounded-md shadow-md",
    detailed: "px-6 py-3 rounded-xl shadow-xl",
  };

  return (
    <div
      className={cn(
        positionClasses[position],
        variantClasses[variant],
        content.bgColor,
        content.textColor,
        "flex items-center gap-2 text-sm font-medium transition-all duration-300",
        shouldShow ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        className
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {showIcon && content.icon}
      <span>{content.text}</span>
    </div>
  );
}

// Specialized loading indicators
export function TopLoadingIndicator(
  props: Omit<LoadingIndicatorProps, "position">
) {
  return <LoadingIndicator {...props} position="top" />;
}

export function InlineLoadingIndicator(
  props: Omit<LoadingIndicatorProps, "position">
) {
  return <LoadingIndicator {...props} position="inline" />;
}

export function MinimalLoadingIndicator(
  props: Omit<LoadingIndicatorProps, "variant">
) {
  return <LoadingIndicator {...props} variant="minimal" />;
}

// Progress bar component for longer operations
export interface ProgressIndicatorProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressIndicator({
  progress,
  message = "Loading...",
  showPercentage = true,
  className,
}: ProgressIndicatorProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {message}
        </span>
        {showPercentage && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
