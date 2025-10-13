"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Users } from "lucide-react";
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

export class ReceptionDashboardErrorBoundary extends Component<Props, State> {
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
    const context = this.props.context || "Reception Dashboard";
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
          dashboard_type: "reception",
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
          id: "cache_current_order",
          title: "Save Current Order",
          description: "Save any order in progress locally",
          action: async () => {
            // Cache current order data
            const orderData = sessionStorage.getItem("current_order");
            if (orderData) {
              localStorage.setItem("cached_order_" + Date.now(), orderData);
              toast.info(
                "Current order saved locally. You can continue when the system recovers."
              );
            }
          },
          priority: "high",
          requiresOnline: false,
        },
        {
          id: "switch_to_manual_mode",
          title: "Switch to Manual Mode",
          description: "Use simplified order entry",
          action: async () => {
            localStorage.setItem("reception_manual_mode", "true");
            toast.info(
              "Switched to manual mode. Orders will sync when online."
            );
          },
          priority: "normal",
          requiresOnline: false,
        },
        {
          id: "reload_customer_data",
          title: "Reload Customer Data",
          description: "Refresh customer and table information",
          action: async () => {
            // Clear cached data and reload
            sessionStorage.removeItem("customers_cache");
            sessionStorage.removeItem("tables_cache");
            window.location.reload();
          },
          priority: "normal",
          requiresOnline: true,
        },
      ];

      const result = await this.recoveryService.recoverFromError(
        error,
        {
          component: "ReceptionDashboard",
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
        <Card className="w-full border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Users className="h-5 w-5" />
              Reception Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  We encountered an error in the reception dashboard. This might
                  affect order creation, table management, and customer service
                  operations.
                </p>

                {this.state.isRecovering && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                    🔄 Attempting automatic recovery...
                  </p>
                )}
              </div>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-md">
                <summary className="text-sm font-medium text-blue-800 dark:text-blue-200 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-blue-700 dark:text-blue-300 whitespace-pre-wrap overflow-auto max-h-40">
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
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
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
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>

              {this.props.showNavigation !== false && (
                <ReceptionNavigationButton />
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Navigation button component that uses router
function ReceptionNavigationButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/")}
      variant="outline"
      size="sm"
      className="border-blue-300 text-blue-700 hover:bg-blue-100"
    >
      <Home className="h-4 w-4 mr-2" />
      Back to Dashboard
    </Button>
  );
}

// HOC for wrapping reception components with error boundary
export function withReceptionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <ReceptionDashboardErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ReceptionDashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withReceptionErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Specialized error boundaries for different reception contexts
export function OrderCreationErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ReceptionDashboardErrorBoundary
      context="Order Creation"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </ReceptionDashboardErrorBoundary>
  );
}

export function TableManagementErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ReceptionDashboardErrorBoundary
      context="Table Management"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </ReceptionDashboardErrorBoundary>
  );
}

export function CustomerManagementErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ReceptionDashboardErrorBoundary
      context="Customer Management"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </ReceptionDashboardErrorBoundary>
  );
}
