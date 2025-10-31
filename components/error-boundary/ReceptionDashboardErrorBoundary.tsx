"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ShoppingCart,
  Ticket,
  Wifi,
  WifiOff,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useOrderStore } from "@/stores/order-store";

interface Props {
  children: ReactNode;
  staffId?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableAutoRecovery?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  lastErrorTime: number;
  errorType: "component" | "state" | "network" | "unknown";
}

export class ReceptionDashboardErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private autoRecoveryTimeout?: NodeJS.Timeout;
  private errorThreshold = 2; // Max errors before showing degraded mode
  private timeWindow = 30000; // 30 seconds
  private errorTimes: number[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      lastErrorTime: 0,
      errorType: "unknown",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Analyze error type for better recovery strategies
    let errorType: State["errorType"] = "unknown";

    if (error.message.includes("Network") || error.message.includes("fetch")) {
      errorType = "network";
    } else if (
      error.message.includes("Zustand") ||
      error.message.includes("store")
    ) {
      errorType = "state";
    } else if (error.stack?.includes("Component")) {
      errorType = "component";
    }

    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();

    // Track error frequency
    this.errorTimes.push(now);
    this.errorTimes = this.errorTimes.filter(
      (time) => now - time < this.timeWindow
    );

    console.error("Reception Dashboard Error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error with reception dashboard context
    this.logReceptionError(error, errorInfo);

    // Attempt auto-recovery for certain error types
    if (this.props.enableAutoRecovery && this.canAutoRecover()) {
      this.scheduleAutoRecovery();
    }

    // Show user-friendly error notification
    this.showErrorNotification();
  }

  private logReceptionError(error: Error, errorInfo: ErrorInfo) {
    const context = {
      component: "ReceptionDashboard",
      staffId: this.props.staffId,
      errorCount: this.errorTimes.length,
      retryCount: this.state.retryCount,
      errorType: this.state.errorType,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: "ReceptionDashboardErrorBoundary",
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Reception Dashboard Error");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Context:", context);
      console.groupEnd();
    }

    // Log to monitoring service
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "exception", {
        description: error.toString(),
        fatal: this.errorTimes.length >= this.errorThreshold,
        custom_map: context.metadata,
      });
    }
  }

  private canAutoRecover(): boolean {
    return (
      this.state.retryCount < this.maxRetries &&
      this.errorTimes.length < this.errorThreshold &&
      (this.state.errorType === "network" ||
        this.state.errorType === "component")
    );
  }

  private scheduleAutoRecovery() {
    // Clear any existing timeout
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }

    // Schedule auto-recovery based on error type
    const delay = this.state.errorType === "network" ? 5000 : 3000;

    this.autoRecoveryTimeout = setTimeout(() => {
      console.log("Attempting auto-recovery for reception dashboard...");
      this.handleRetry();
    }, delay);
  }

  private showErrorNotification() {
    const errorMessages = {
      component:
        "A component error occurred. The dashboard will attempt to recover automatically.",
      state:
        "Order state error detected. Your current order data has been preserved.",
      network: "Network connection issue. Retrying automatically...",
      unknown: "An unexpected error occurred in the reception dashboard.",
    };

    toast.error(errorMessages[this.state.errorType], {
      duration: 5000,
      action: {
        label: "Retry",
        onClick: this.handleRetry,
      },
    });
  }

  private handleRetry = () => {
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }

    if (this.state.retryCount < this.maxRetries) {
      console.log(
        `Retrying reception dashboard (attempt ${this.state.retryCount + 1}/${
          this.maxRetries
        })`
      );

      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));

      toast.success("Retrying dashboard...", { duration: 2000 });
    } else {
      toast.error("Maximum retry attempts reached. Please refresh the page.");
    }
  };

  private handleReset = () => {
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      lastErrorTime: 0,
      errorType: "unknown",
    });
    this.errorTimes = [];

    toast.success("Dashboard reset successfully");
  };

  private handleSaveAndExit = async () => {
    // Attempt to save current order state before exiting
    try {
      // Access the store state directly without using the hook
      const orderStore = useOrderStore.getState();
      if (orderStore.currentOrder && orderStore.currentOrder.items.length > 0) {
        // Save as open ticket
        await orderStore.saveAsOpenTicket();
        toast.success("Current order saved as open ticket");
      }
    } catch (error) {
      console.error("Failed to save order state:", error);
      toast.error("Failed to save current order");
    }

    // Navigate to main dashboard
    window.location.href = "/dashboard";
  };

  private getDegradedModeFallback() {
    const isFrequentErrors = this.errorTimes.length >= this.errorThreshold;
    const canRetry = this.state.retryCount < this.maxRetries;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-2xl mx-auto border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-800 dark:text-red-200">
                  Reception Dashboard Error
                </CardTitle>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  The reception dashboard encountered an error and needs
                  attention
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Type Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="capitalize">
                {this.state.errorType} Error
              </Badge>
              <Badge variant="outline">
                Attempt {this.state.retryCount + 1}/{this.maxRetries + 1}
              </Badge>
              {isFrequentErrors && (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                  Frequent Errors
                </Badge>
              )}
            </div>

            {/* Critical Features Status */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Affected Features:</strong> Order Creation, Open Tickets
                Management, Payment Processing
              </AlertDescription>
            </Alert>

            {/* Degraded Mode Warning */}
            {isFrequentErrors && (
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <strong>Degraded Mode:</strong> Multiple errors detected.
                  Consider using manual order processing or switching to a
                  different terminal.
                </AlertDescription>
              </Alert>
            )}

            {/* Fallback Actions */}
            <div className="space-y-3">
              <h4 className="font-medium text-red-800 dark:text-red-200">
                Available Actions:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {canRetry && !isFrequentErrors && (
                  <Button
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                )}

                <Button
                  onClick={this.handleSaveAndExit}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Save className="h-4 w-4" />
                  Save & Exit
                </Button>

                <Button
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Dashboard
                </Button>

                <Button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>

                <Button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <Home className="h-4 w-4" />
                  Main Dashboard
                </Button>

                <Button
                  onClick={() =>
                    (window.location.href = "/staff/reception?fallback=true")
                  }
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Simple Mode
                </Button>
              </div>
            </div>

            {/* Manual Fallback Instructions */}
            {isFrequentErrors && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  Manual Fallback Procedures:
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                  <li>Use paper order forms for new orders</li>
                  <li>Process payments using backup POS terminal</li>
                  <li>Manually track table assignments</li>
                  <li>Contact technical support if issues persist</li>
                </ul>
              </div>
            )}

            {/* Development Error Details */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                <summary className="text-sm font-medium cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Error Metadata */}
            <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
              <div>
                Error occurred:{" "}
                {new Date(this.state.lastErrorTime).toLocaleString()}
              </div>
              <div>Error type: {this.state.errorType}</div>
              {this.errorTimes.length > 1 && (
                <div>
                  {this.errorTimes.length} errors in last{" "}
                  {this.timeWindow / 1000} seconds
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  componentWillUnmount() {
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Reception dashboard specific error UI
      return this.getDegradedModeFallback();
    }

    return this.props.children;
  }
}

// HOC for wrapping reception dashboard components with error boundary
export function withReceptionDashboardErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P & { staffId?: string }) => (
    <ReceptionDashboardErrorBoundary
      staffId={props.staffId}
      enableAutoRecovery={true}
      {...errorBoundaryProps}
    >
      <Component {...props} />
    </ReceptionDashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withReceptionDashboardErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}
