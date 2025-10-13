"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Calculator } from "lucide-react";
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

export class AccountantDashboardErrorBoundary extends Component<Props, State> {
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
    const context = this.props.context || "Accountant Dashboard";
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
          dashboard_type: "accountant",
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
          id: "readonly_mode",
          title: "Switch to Read-Only Mode",
          description: "View financial data without modification capabilities",
          action: async () => {
            localStorage.setItem("accountant_readonly_mode", "true");
            toast.info(
              "Switched to read-only mode. You can view data but not make changes."
            );
          },
          priority: "high",
          requiresOnline: false,
        },
        {
          id: "export_current_data",
          title: "Export Current Data",
          description: "Download currently loaded financial data",
          action: async () => {
            // Export current financial data
            const financialData = sessionStorage.getItem(
              "financial_data_cache"
            );
            if (financialData) {
              const blob = new Blob([financialData], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `financial_data_backup_${
                new Date().toISOString().split("T")[0]
              }.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success("Financial data exported successfully.");
            } else {
              toast.warning("No financial data available to export.");
            }
          },
          priority: "normal",
          requiresOnline: false,
        },
        {
          id: "reload_financial_data",
          title: "Reload Financial Data",
          description: "Refresh all financial reports and transactions",
          action: async () => {
            // Clear cached financial data and reload
            sessionStorage.removeItem("financial_data_cache");
            sessionStorage.removeItem("reports_cache");
            sessionStorage.removeItem("transactions_cache");
            window.location.reload();
          },
          priority: "normal",
          requiresOnline: true,
        },
      ];

      const result = await this.recoveryService.recoverFromError(
        error,
        {
          component: "AccountantDashboard",
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
        <Card className="w-full border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
              <Calculator className="h-5 w-5" />
              Accountant Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  We encountered an error in the accountant dashboard. This
                  might affect financial reporting, transaction processing, and
                  analytics features.
                </p>

                {this.state.isRecovering && (
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-2 font-medium">
                    🔄 Attempting automatic recovery...
                  </p>
                )}
              </div>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-md">
                <summary className="text-sm font-medium text-purple-800 dark:text-purple-200 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-purple-700 dark:text-purple-300 whitespace-pre-wrap overflow-auto max-h-40">
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
                    className="border-purple-300 text-purple-700 hover:bg-purple-100"
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
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>

              {this.props.showNavigation !== false && (
                <AccountantNavigationButton />
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
function AccountantNavigationButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/")}
      variant="outline"
      size="sm"
      className="border-purple-300 text-purple-700 hover:bg-purple-100"
    >
      <Home className="h-4 w-4 mr-2" />
      Back to Dashboard
    </Button>
  );
}

// HOC for wrapping accountant components with error boundary
export function withAccountantErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <AccountantDashboardErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AccountantDashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withAccountantErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Specialized error boundaries for different accountant contexts
export function FinancialReportingErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AccountantDashboardErrorBoundary
      context="Financial Reporting"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </AccountantDashboardErrorBoundary>
  );
}

export function TransactionProcessingErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AccountantDashboardErrorBoundary
      context="Transaction Processing"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </AccountantDashboardErrorBoundary>
  );
}

export function RefundProcessingErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AccountantDashboardErrorBoundary
      context="Refund Processing"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </AccountantDashboardErrorBoundary>
  );
}
