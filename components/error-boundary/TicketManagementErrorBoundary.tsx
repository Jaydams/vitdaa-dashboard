"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  RefreshCw,
  Ticket,
  Database,
  Wifi,
  WifiOff,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  ticketId?: string;
  operationType?: "load" | "save" | "delete" | "update" | "sync";
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRecovery?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  lastErrorTime: number;
  errorCategory: "data" | "network" | "validation" | "permission" | "unknown";
  isRecovering: boolean;
}

export class TicketManagementErrorBoundary extends Component<Props, State> {
  private maxRetries = 5;
  private retryDelay = 2000; // 2 seconds
  private retryTimeout?: NodeJS.Timeout;
  private errorThreshold = 3;
  private timeWindow = 60000; // 1 minute
  private errorTimes: number[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      lastErrorTime: 0,
      errorCategory: "unknown",
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Categorize error for better recovery strategies
    let errorCategory: State["errorCategory"] = "unknown";

    if (
      error.message.includes("Network") ||
      error.message.includes("fetch") ||
      error.message.includes("timeout")
    ) {
      errorCategory = "network";
    } else if (
      error.message.includes("validation") ||
      error.message.includes("invalid")
    ) {
      errorCategory = "validation";
    } else if (
      error.message.includes("permission") ||
      error.message.includes("unauthorized")
    ) {
      errorCategory = "permission";
    } else if (
      error.message.includes("data") ||
      error.message.includes("store") ||
      error.message.includes("ticket")
    ) {
      errorCategory = "data";
    }

    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
      errorCategory,
      isRecovering: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();

    // Track error frequency
    this.errorTimes.push(now);
    this.errorTimes = this.errorTimes.filter(
      (time) => now - time < this.timeWindow
    );

    console.error("Ticket Management Error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error with ticket management context
    this.logTicketError(error, errorInfo);

    // Show contextual error notification
    this.showErrorNotification();

    // Attempt automatic recovery for recoverable errors
    if (this.canAutoRecover()) {
      this.scheduleAutoRecovery();
    }
  }

  private logTicketError(error: Error, errorInfo: ErrorInfo) {
    const context = {
      component: "TicketManagement",
      ticketId: this.props.ticketId,
      operationType: this.props.operationType,
      errorCount: this.errorTimes.length,
      retryCount: this.state.retryCount,
      errorCategory: this.state.errorCategory,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: "TicketManagementErrorBoundary",
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🎫 Ticket Management Error");
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
      (this.state.errorCategory === "network" ||
        this.state.errorCategory === "data")
    );
  }

  private scheduleAutoRecovery() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Exponential backoff for retries
    const delay = this.retryDelay * Math.pow(2, this.state.retryCount);

    this.retryTimeout = setTimeout(() => {
      console.log(
        `Auto-recovering ticket management (attempt ${
          this.state.retryCount + 1
        })`
      );
      this.handleRetry();
    }, delay);
  }

  private showErrorNotification() {
    const { operationType, ticketId } = this.props;
    const { errorCategory } = this.state;

    const operationMessages = {
      load: `Failed to load ticket ${ticketId || ""}`,
      save: `Failed to save ticket ${ticketId || ""}`,
      delete: `Failed to delete ticket ${ticketId || ""}`,
      update: `Failed to update ticket ${ticketId || ""}`,
      sync: "Failed to sync tickets with server",
    };

    const categoryMessages = {
      data: "Data integrity issue detected",
      network: "Network connection problem",
      validation: "Invalid ticket data",
      permission: "Permission denied",
      unknown: "Unexpected error occurred",
    };

    const message = operationType
      ? `${operationMessages[operationType]}. ${categoryMessages[errorCategory]}`
      : `Ticket management error: ${categoryMessages[errorCategory]}`;

    toast.error(message, {
      duration: 6000,
      action: {
        label: "Retry",
        onClick: this.handleRetry,
      },
    });
  }

  private handleRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
        isRecovering: true,
      }));

      // Call recovery callback if provided
      if (this.props.onRecovery) {
        this.props.onRecovery();
      }

      toast.success(
        `Retrying ticket operation... (${this.state.retryCount + 1}/${
          this.maxRetries
        })`,
        {
          duration: 2000,
        }
      );

      // Reset recovering state after a short delay
      setTimeout(() => {
        this.setState({ isRecovering: false });
      }, 1000);
    } else {
      toast.error(
        "Maximum retry attempts reached. Please try refreshing or contact support."
      );
    }
  };

  private handleReset = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      lastErrorTime: 0,
      errorCategory: "unknown",
      isRecovering: false,
    });
    this.errorTimes = [];

    toast.success("Ticket management reset successfully");
  };

  private handleFallbackMode = () => {
    // Navigate to simplified ticket view
    const fallbackUrl = "/staff/reception?mode=simple&tickets=readonly";
    window.location.href = fallbackUrl;

    toast.info("Switching to simplified ticket view");
  };

  private getTicketErrorFallback() {
    const { operationType, ticketId } = this.props;
    const { errorCategory, isRecovering } = this.state;
    const isFrequentErrors = this.errorTimes.length >= this.errorThreshold;
    const canRetry = this.state.retryCount < this.maxRetries;

    const operationLabels = {
      load: "Loading Ticket",
      save: "Saving Ticket",
      delete: "Deleting Ticket",
      update: "Updating Ticket",
      sync: "Syncing Tickets",
    };

    const categoryIcons = {
      data: Database,
      network: Wifi,
      validation: AlertCircle,
      permission: AlertTriangle,
      unknown: AlertTriangle,
    };

    const CategoryIcon = categoryIcons[errorCategory];

    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
              <CategoryIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Ticket Management Error
                {isRecovering && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Recovering...
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {operationType && operationLabels[operationType]}
                {ticketId && ` (Ticket: ${ticketId})`}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Category and Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="destructive" className="capitalize">
              {errorCategory} Error
            </Badge>
            <Badge variant="outline">
              Attempt {this.state.retryCount + 1}/{this.maxRetries + 1}
            </Badge>
            {isFrequentErrors && (
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                Frequent Errors
              </Badge>
            )}
            {operationType && (
              <Badge variant="secondary" className="capitalize">
                {operationType} Operation
              </Badge>
            )}
          </div>

          {/* Error Impact Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Impact:</strong>
              {errorCategory === "data" && " Ticket data may be inconsistent. "}
              {errorCategory === "network" &&
                " Server synchronization affected. "}
              {errorCategory === "validation" &&
                " Invalid ticket information detected. "}
              {errorCategory === "permission" && " Access restrictions apply. "}
              {errorCategory === "unknown" && " Unexpected system behavior. "}
              {operationType === "save" && "Changes may not be saved."}
              {operationType === "load" && "Ticket details unavailable."}
              {operationType === "delete" && "Ticket may not be deleted."}
              {operationType === "sync" && "Data may be out of sync."}
            </AlertDescription>
          </Alert>

          {/* Frequent Errors Warning */}
          {isFrequentErrors && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>System Instability:</strong> Multiple errors detected in
                ticket management. Consider using manual processes or contacting
                technical support.
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery Actions */}
          <div className="space-y-3">
            <h4 className="font-medium text-red-800 dark:text-red-200">
              Recovery Options:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {canRetry && !isFrequentErrors && (
                <Button
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRecovering ? "animate-spin" : ""}`}
                  />
                  {isRecovering ? "Retrying..." : "Retry Operation"}
                </Button>
              )}

              <Button
                onClick={this.handleReset}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
                Reset State
              </Button>

              <Button
                onClick={this.handleFallbackMode}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Ticket className="h-4 w-4" />
                Simple Mode
              </Button>

              <Button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
            </div>
          </div>

          {/* Category-Specific Guidance */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Recommended Actions:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              {errorCategory === "network" && (
                <>
                  <li>Check internet connection</li>
                  <li>Wait for automatic retry</li>
                  <li>Use offline mode if available</li>
                </>
              )}
              {errorCategory === "data" && (
                <>
                  <li>Verify ticket information</li>
                  <li>Check for duplicate entries</li>
                  <li>Contact support if data appears corrupted</li>
                </>
              )}
              {errorCategory === "validation" && (
                <>
                  <li>Review ticket details for errors</li>
                  <li>Ensure all required fields are filled</li>
                  <li>Check data format requirements</li>
                </>
              )}
              {errorCategory === "permission" && (
                <>
                  <li>Verify user permissions</li>
                  <li>Contact administrator</li>
                  <li>Try logging out and back in</li>
                </>
              )}
              {errorCategory === "unknown" && (
                <>
                  <li>Try refreshing the page</li>
                  <li>Clear browser cache</li>
                  <li>Contact technical support</li>
                </>
              )}
            </ul>
          </div>

          {/* Development Error Details */}
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <summary className="text-sm font-medium cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-32 whitespace-pre-wrap">
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
            <div>
              Category: {errorCategory} | Operation:{" "}
              {operationType || "general"}
            </div>
            {this.errorTimes.length > 1 && (
              <div>{this.errorTimes.length} errors in last minute</div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Ticket management specific error UI
      return this.getTicketErrorFallback();
    }

    return this.props.children;
  }
}

// HOC for wrapping ticket management components with error boundary
export function withTicketManagementErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (
    props: P & { ticketId?: string; operationType?: Props["operationType"] }
  ) => (
    <TicketManagementErrorBoundary
      ticketId={props.ticketId}
      operationType={props.operationType}
      {...errorBoundaryProps}
    >
      <Component {...props} />
    </TicketManagementErrorBoundary>
  );

  WrappedComponent.displayName = `withTicketManagementErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}
