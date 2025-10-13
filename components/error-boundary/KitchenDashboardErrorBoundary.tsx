"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ChefHat } from "lucide-react";
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

export class KitchenDashboardErrorBoundary extends Component<Props, State> {
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
    const context = this.props.context || "Kitchen Dashboard";
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
          dashboard_type: "kitchen",
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
          id: "offline_order_tracking",
          title: "Enable Offline Order Tracking",
          description: "Continue tracking orders without real-time sync",
          action: async () => {
            localStorage.setItem("kitchen_offline_mode", "true");
            // Cache current order states
            const orderStates = sessionStorage.getItem("kitchen_order_states");
            if (orderStates) {
              localStorage.setItem("cached_kitchen_orders", orderStates);
            }
            toast.info(
              "Offline mode enabled. Order updates will sync when online."
            );
          },
          priority: "high",
          requiresOnline: false,
        },
        {
          id: "manual_inventory_log",
          title: "Switch to Manual Inventory Log",
          description: "Log inventory changes manually",
          action: async () => {
            localStorage.setItem("kitchen_manual_inventory", "true");
            toast.info(
              "Manual inventory logging enabled. Changes will sync later."
            );
          },
          priority: "normal",
          requiresOnline: false,
        },
        {
          id: "reload_kitchen_data",
          title: "Reload Kitchen Data",
          description: "Refresh orders and inventory information",
          action: async () => {
            // Clear cached data and reload
            sessionStorage.removeItem("kitchen_orders_cache");
            sessionStorage.removeItem("kitchen_inventory_cache");
            window.location.reload();
          },
          priority: "normal",
          requiresOnline: true,
        },
      ];

      const result = await this.recoveryService.recoverFromError(
        error,
        {
          component: "KitchenDashboard",
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
        <Card className="w-full border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <ChefHat className="h-5 w-5" />
              Kitchen Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300">
                  We encountered an error in the kitchen dashboard. This might
                  affect order processing, inventory management, and food
                  preparation tracking.
                </p>

                {this.state.isRecovering && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                    🔄 Attempting automatic recovery...
                  </p>
                )}
              </div>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="p-3 bg-green-100 dark:bg-green-900/40 rounded-md">
                <summary className="text-sm font-medium text-green-800 dark:text-green-200 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-green-700 dark:text-green-300 whitespace-pre-wrap overflow-auto max-h-40">
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
                    className="border-green-300 text-green-700 hover:bg-green-100"
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
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>

              {this.props.showNavigation !== false && (
                <KitchenNavigationButton />
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
function KitchenNavigationButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/")}
      variant="outline"
      size="sm"
      className="border-green-300 text-green-700 hover:bg-green-100"
    >
      <Home className="h-4 w-4 mr-2" />
      Back to Dashboard
    </Button>
  );
}

// HOC for wrapping kitchen components with error boundary
export function withKitchenErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <KitchenDashboardErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </KitchenDashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withKitchenErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Specialized error boundaries for different kitchen contexts
export function KitchenOrderProcessingErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <KitchenDashboardErrorBoundary
      context="Kitchen Order Processing"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </KitchenDashboardErrorBoundary>
  );
}

export function KitchenInventoryErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <KitchenDashboardErrorBoundary
      context="Kitchen Inventory Management"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </KitchenDashboardErrorBoundary>
  );
}

export function InventoryRequestErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <KitchenDashboardErrorBoundary
      context="Inventory Request System"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </KitchenDashboardErrorBoundary>
  );
}
