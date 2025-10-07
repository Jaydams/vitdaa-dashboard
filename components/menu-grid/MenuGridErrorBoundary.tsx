"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * Error boundary specifically designed for menu grid components
 * Provides contextual error handling and recovery options
 */
export class MenuGridErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "Menu Grid Error Boundary caught an error:",
      error,
      errorInfo
    );

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to monitoring service
    this.logError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Menu Grid Error");
      console.error("Error:", error);
      console.error("Component Stack:", errorInfo.componentStack);
      console.groupEnd();
    }

    // Log to analytics/monitoring service
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "exception", {
        description: `Menu Grid Error: ${error.toString()}`,
        fatal: false,
        custom_map: {
          component: "MenuGrid",
          retry_count: this.state.retryCount,
        },
      });
    }
  };

  private handleRetry = async () => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      try {
        await this.props.onRetry();
      } catch (retryError) {
        console.error("Retry failed:", retryError);
      }
    }

    // Delay before resetting error state
    this.retryTimeout = setTimeout(() => {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }, 1000);
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private getErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return "Unable to load menu items due to a network issue. Please check your connection and try again.";
    }

    if (message.includes("permission") || message.includes("unauthorized")) {
      return "You don't have permission to view menu items. Please contact your administrator.";
    }

    if (message.includes("timeout")) {
      return "The request took too long to complete. Please try again.";
    }

    return "An unexpected error occurred while loading menu items. Please try again.";
  };

  private getErrorSeverity = (error: Error): "low" | "medium" | "high" => {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("timeout")) {
      return "medium";
    }

    if (message.includes("permission") || message.includes("unauthorized")) {
      return "high";
    }

    return "low";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity(this.state.error!);
      const canRetry = this.state.retryCount < this.maxRetries;

      // Default error UI
      return (
        <Card
          className={cn(
            "w-full border-2",
            severity === "high"
              ? "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
              : severity === "medium"
              ? "border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800"
              : "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800",
            this.props.className
          )}
        >
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Error Icon */}
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  severity === "high"
                    ? "bg-red-100 dark:bg-red-900/40"
                    : severity === "medium"
                    ? "bg-orange-100 dark:bg-orange-900/40"
                    : "bg-yellow-100 dark:bg-yellow-900/40"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "h-8 w-8",
                    severity === "high"
                      ? "text-red-600 dark:text-red-400"
                      : severity === "medium"
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  )}
                />
              </div>

              {/* Error Message */}
              <div className="space-y-2 max-w-md">
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    severity === "high"
                      ? "text-red-800 dark:text-red-200"
                      : severity === "medium"
                      ? "text-orange-800 dark:text-orange-200"
                      : "text-yellow-800 dark:text-yellow-200"
                  )}
                >
                  Menu Items Unavailable
                </h3>
                <p
                  className={cn(
                    "text-sm",
                    severity === "high"
                      ? "text-red-700 dark:text-red-300"
                      : severity === "medium"
                      ? "text-orange-700 dark:text-orange-300"
                      : "text-yellow-700 dark:text-yellow-300"
                  )}
                >
                  {this.getErrorMessage(this.state.error!)}
                </p>
              </div>

              {/* Development Error Details */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="w-full max-w-2xl">
                  <summary
                    className={cn(
                      "text-sm font-medium cursor-pointer p-3 rounded-md",
                      severity === "high"
                        ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                        : severity === "medium"
                        ? "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200"
                        : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200"
                    )}
                  >
                    Error Details (Development)
                  </summary>
                  <pre
                    className={cn(
                      "mt-2 p-3 text-xs whitespace-pre-wrap overflow-auto rounded-md max-h-40",
                      severity === "high"
                        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                        : severity === "medium"
                        ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                        : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                    )}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    disabled={this.state.isRetrying}
                    variant="outline"
                    className={cn(
                      "min-w-[120px]",
                      severity === "high"
                        ? "border-red-300 text-red-700 hover:bg-red-100 focus:ring-red-500"
                        : severity === "medium"
                        ? "border-orange-300 text-orange-700 hover:bg-orange-100 focus:ring-orange-500"
                        : "border-yellow-300 text-yellow-700 hover:bg-yellow-100 focus:ring-yellow-500"
                    )}
                  >
                    {this.state.isRetrying ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again ({this.maxRetries -
                          this.state.retryCount}{" "}
                        left)
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>

                {severity === "high" && (
                  <Button
                    onClick={() =>
                      (window.location.href = "/dashboard/settings")
                    }
                    variant="outline"
                    className="min-w-[120px] border-blue-300 text-blue-700 hover:bg-blue-100 focus:ring-blue-500"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                )}
              </div>

              {/* Retry Limit Reached */}
              {!canRetry && (
                <div
                  className={cn(
                    "p-3 rounded-md text-sm",
                    severity === "high"
                      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                      : severity === "medium"
                      ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                      : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                  )}
                >
                  Maximum retry attempts reached. Please refresh the page or
                  contact support if the issue persists.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping menu grid components with error boundary
 */
export function withMenuGridErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <MenuGridErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </MenuGridErrorBoundary>
  );

  WrappedComponent.displayName = `withMenuGridErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

/**
 * Lightweight error fallback for individual menu items
 */
export function MenuItemErrorFallback({
  error,
  onRetry,
  className,
}: {
  error?: Error;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden h-full flex flex-col min-h-[280px] sm:min-h-[300px] lg:min-h-[320px] border-red-200 bg-red-50 dark:bg-red-900/20",
        className
      )}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-3 h-full">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
            Failed to load item
          </h4>
          <p className="text-xs text-red-600 dark:text-red-400">
            {error?.message || "Something went wrong"}
          </p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="text-xs border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
