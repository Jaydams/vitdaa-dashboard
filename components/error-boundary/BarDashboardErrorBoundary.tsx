"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Coffee } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ErrorRecoveryService,
  FallbackOption,
} from "@/lib/error-recovery-service";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  showNavigation?: boolean;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRecovering: boolean;
}

export class BarDashboardErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private recoveryService: ErrorRecoveryService;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      isRecovering: false,
    };
    this.recoveryService = ErrorRecoveryService.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      retryCount: 0,
      isRecovering: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context = this.props.context || "Bar Dashboard";
    console.error(
      `${context} Error Boundary caught an error:`,
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

    // Attempt automatic recovery
    this.attemptRecovery(error, errorInfo);

    // Log error to monitoring service
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "exception", {
        description: error.toString(),
        fatal: false,
        custom_map: {
          component: context,
          error_boundary: true,
          dashboard_type: "bar",
        },
      });
    }

    // Show toast notification for user feedback
    toast.error(`An error occurred in ${context}. Attempting recovery...`);
  }

  private async attemptRecovery(error: Error, errorInfo: ErrorInfo) {
    this.setState({ isRecovering: true });

    try {
      const customFallbacks: FallbackOption[] = [
        {
          id: "switch_to_offline_mode",
          title: "Switch to Offline Mode",
          description: "Continue working with cached data",
          action: async () => {
            // Enable offline mode for bar operations
            localStorage.setItem("bar_offline_mode", "true");
            toast.info(
              "Switched to offline mode. Your actions will sync when online."
            );
          },
          priority: "high",
          requiresOnline: false,
        },
        {
          id: "reload_bar_data",
          title: "Reload Bar Data",
          description: "Refresh bar orders and inventory data",
          action: async () => {
            // This would trigger a data reload
            window.location.hash = "#reload-bar-data";
            window.location.reload();
          },
          priority: "normal",
          requiresOnline: true,
        },
      ];

      const result = await this.recoveryService.recoverFromError(
        error,
        {
          component: "BarDashboard",
          action: "error_boundary_recovery",
          metadata: {
            errorInfo: errorInfo.componentStack,
            retryCount: this.state.retryCount,
          },
        },
        customFallbacks
      );

      if (result.success) {
        toast.success("Recovery successful!");
        // Don't automatically retry, let user decide
      } else {
        toast.error("Automatic recovery failed. Manual intervention required.");
      }
    } catch (recoveryError) {
      console.error("Recovery attempt failed:", recoveryError);
      toast.error("Recovery attempt failed.");
    } finally {
      this.setState({ isRecovering: false });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
        isRecovering: false,
      }));

      toast.info("Retrying...");
    } else {
      toast.error("Maximum retry attempts reached. Please refresh the page.");
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="w-full border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Coffee className="h-5 w-5" />
              Bar Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  We encountered an error in the bar dashboard. This might
                  affect beverage order processing and inventory management.
                </p>

                {this.state.isRecovering && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 font-medium">
                    🔄 Attempting automatic recovery...
                  </p>
                )}
              </div>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="p-3 bg-orange-100 dark:bg-orange-900/40 rounded-md">
                <summary className="text-sm font-medium text-orange-800 dark:text-orange-200 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-orange-700 dark:text-orange-300 whitespace-pre-wrap overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {this.props.showRetry !== false &&
                this.state.retryCount < this.maxRetries && (
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    disabled={this.state.isRecovering}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        this.state.isRecovering ? "animate-spin" : ""
                      }`}
                    />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>

              {this.props.showNavigation !== false && <BarNavigationButton />}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Navigation button component that uses router
function BarNavigationButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/")}
      variant="outline"
      size="sm"
      className="border-orange-300 text-orange-700 hover:bg-orange-100"
    >
      <Home className="h-4 w-4 mr-2" />
      Back to Dashboard
    </Button>
  );
}

// HOC for wrapping bar components with error boundary
export function withBarErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <BarDashboardErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </BarDashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withBarErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Specialized error boundaries for different bar contexts
export function BarOrderProcessingErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <BarDashboardErrorBoundary
      context="Bar Order Processing"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </BarDashboardErrorBoundary>
  );
}

export function BarInventoryErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <BarDashboardErrorBoundary
      context="Bar Inventory Management"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </BarDashboardErrorBoundary>
  );
}
