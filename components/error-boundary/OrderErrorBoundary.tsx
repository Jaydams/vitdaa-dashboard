"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
}

export class OrderErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context = this.props.context || "Order Component";
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

    // Log error to monitoring service
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "exception", {
        description: error.toString(),
        fatal: false,
        custom_map: {
          component: context,
          error_boundary: true,
        },
      });
    }

    // Show toast notification for user feedback
    toast.error(`An error occurred in ${context}. Please try refreshing.`);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
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
        <Card className="w-full border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-700 dark:text-red-300">
              We encountered an error while loading this{" "}
              {this.props.context || "component"}. This might be a temporary
              issue.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="p-3 bg-red-100 dark:bg-red-900/40 rounded-md">
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
              {this.props.showRetry !== false &&
                this.state.retryCount < this.maxRetries && (
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>

              {this.props.showNavigation !== false && <NavigationButton />}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Navigation button component that uses router
function NavigationButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/orders")}
      variant="outline"
      size="sm"
      className="border-red-300 text-red-700 hover:bg-red-100"
    >
      <Home className="h-4 w-4 mr-2" />
      Back to Orders
    </Button>
  );
}

// HOC for wrapping order components with error boundary
export function withOrderErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <OrderErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </OrderErrorBoundary>
  );

  WrappedComponent.displayName = `withOrderErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Specialized error boundaries for different order contexts
export function CreateOrderErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OrderErrorBoundary
      context="Order Creation Form"
      showNavigation={true}
      showRetry={true}
    >
      {children}
    </OrderErrorBoundary>
  );
}

export function OrderDetailsErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OrderErrorBoundary
      context="Order Details"
      showNavigation={true}
      showRetry={true}
    >
      {children}
    </OrderErrorBoundary>
  );
}

export function OrderTableErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <OrderErrorBoundary
      context="Orders Table"
      showNavigation={false}
      showRetry={true}
    >
      {children}
    </OrderErrorBoundary>
  );
}
