"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOfflineManager } from "@/lib/offline-manager";
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  dashboardType: "reception" | "kitchen" | "bar" | "accountant" | "admin";
  staffId?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableOfflineSupport?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  lastErrorTime: number;
}

export class StaffDashboardErrorBoundary extends Component<Props, State> {
  private maxRetries = 5;
  private errorThreshold = 3; // Max errors in time window
  private timeWindow = 60000; // 1 minute
  private errorTimes: number[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();

    // Track error frequency
    this.errorTimes.push(now);
    this.errorTimes = this.errorTimes.filter(
      (time) => now - time < this.timeWindow
    );

    console.error(
      `${this.props.dashboardType} Dashboard Error:`,
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

    // Log error with dashboard context
    this.logDashboardError(error, errorInfo);
  }

  private logDashboardError(error: Error, errorInfo: ErrorInfo) {
    const context = {
      component: `${this.props.dashboardType}Dashboard`,
      staffId: this.props.staffId,
      errorCount: this.errorTimes.length,
      retryCount: this.state.retryCount,
      metadata: {
        dashboardType: this.props.dashboardType,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    };

    // Log to console in development
    if (
      typeof window !== "undefined" &&
      window.location.hostname === "localhost"
    ) {
      console.group(`🚨 ${this.props.dashboardType} Dashboard Error`);
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

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      lastErrorTime: 0,
    });
    this.errorTimes = [];
  };

  private getDashboardSpecificFallback() {
    const { dashboardType } = this.props;
    const isFrequentErrors = this.errorTimes.length >= this.errorThreshold;
    const canRetry = this.state.retryCount < this.maxRetries;

    const dashboardConfig = {
      reception: {
        title: "Reception Dashboard Error",
        description:
          "The reception dashboard encountered an error. Customer service operations may be affected.",
        criticalFeatures: [
          "Order Creation",
          "Table Management",
          "Payment Processing",
        ],
        fallbackActions: [
          "Switch to manual order taking",
          "Use backup payment system",
        ],
      },
      kitchen: {
        title: "Kitchen Dashboard Error",
        description:
          "The kitchen dashboard encountered an error. Food preparation tracking may be affected.",
        criticalFeatures: [
          "Order Processing",
          "Inventory Requests",
          "Status Updates",
        ],
        fallbackActions: [
          "Use printed order tickets",
          "Manual inventory tracking",
        ],
      },
      bar: {
        title: "Bar Dashboard Error",
        description:
          "The bar dashboard encountered an error. Beverage service tracking may be affected.",
        criticalFeatures: [
          "Drink Orders",
          "Bar Inventory",
          "Service Coordination",
        ],
        fallbackActions: [
          "Use manual order system",
          "Check inventory manually",
        ],
      },
      accountant: {
        title: "Accountant Dashboard Error",
        description:
          "The financial dashboard encountered an error. Financial operations may be affected.",
        criticalFeatures: [
          "Financial Reports",
          "Transaction Processing",
          "Refund Management",
        ],
        fallbackActions: [
          "Use backup reporting system",
          "Manual transaction tracking",
        ],
      },
      admin: {
        title: "Admin Dashboard Error",
        description:
          "The admin dashboard encountered an error. Management operations may be affected.",
        criticalFeatures: [
          "Inventory Approval",
          "Staff Management",
          "System Configuration",
        ],
        fallbackActions: [
          "Use manual approval process",
          "Contact system administrator",
        ],
      },
    };

    const config = dashboardConfig[dashboardType];

    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
                {config.title}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                {config.description}
              </p>

              {isFrequentErrors && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-md">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    ⚠️ Frequent Errors Detected
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                    Multiple errors occurred recently. Consider using fallback
                    procedures:
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                    {config.fallbackActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-4">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Affected Features:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {config.criticalFeatures.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {typeof window !== "undefined" &&
                window.location.hostname === "localhost" &&
                this.state.error && (
                  <details className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-md">
                    <summary className="text-sm font-medium text-red-800 dark:text-red-200 cursor-pointer">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-auto max-h-40">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}

              <div className="flex items-center gap-3 flex-wrap">
                {canRetry && !isFrequentErrors && (
                  <Button
                    onClick={this.handleRetry}
                    size="sm"
                    className="bg-red-100 border-red-300 text-red-700 hover:bg-red-200 focus:ring-red-500"
                  >
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}

                <Button
                  onClick={this.handleReset}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Reset Dashboard
                </Button>

                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-800"
                >
                  Refresh Page
                </Button>

                <Button
                  onClick={() => (window.location.href = "/dashboard")}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-800"
                >
                  Go to Main Dashboard
                </Button>
              </div>

              <div className="mt-4 text-xs text-red-600 dark:text-red-400">
                Error #{this.state.retryCount + 1} • Last occurred:{" "}
                {new Date(this.state.lastErrorTime).toLocaleTimeString()}
                {this.errorTimes.length > 1 && (
                  <> • {this.errorTimes.length} errors in last minute</>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Dashboard-specific error UI
      return this.getDashboardSpecificFallback();
    }

    return this.props.children;
  }
}

// Network-aware error boundary wrapper
export function NetworkAwareErrorBoundary({
  children,
  ...props
}: Props & { children: ReactNode }) {
  return (
    <NetworkStatusProvider>
      <StaffDashboardErrorBoundary {...props}>
        {children}
      </StaffDashboardErrorBoundary>
    </NetworkStatusProvider>
  );
}

// Network status provider component
function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const { isOnline, pendingActions } = useOfflineManager();

  return (
    <div className="relative">
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 text-sm font-medium text-center">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>
              You're offline. Actions will be queued and synced when connection
              is restored.
            </span>
            {pendingActions.length > 0 && (
              <span className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-xs">
                {pendingActions.length} queued
              </span>
            )}
          </div>
        </div>
      )}
      <div className={!isOnline ? "pt-12" : ""}>{children}</div>
    </div>
  );
}

// HOC for wrapping dashboard components with enhanced error boundary
export function withStaffDashboardErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  dashboardType: Props["dashboardType"],
  errorBoundaryProps?: Omit<Props, "children" | "dashboardType">
) {
  const WrappedComponent = (props: P & { staffId?: string }) => (
    <NetworkAwareErrorBoundary
      dashboardType={dashboardType}
      staffId={props.staffId}
      enableOfflineSupport={true}
      {...errorBoundaryProps}
    >
      <Component {...props} />
    </NetworkAwareErrorBoundary>
  );

  WrappedComponent.displayName = `withStaffDashboardErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}
