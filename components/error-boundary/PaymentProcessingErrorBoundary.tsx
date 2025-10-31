"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  RefreshCw,
  CreditCard,
  DollarSign,
  Shield,
  Wifi,
  WifiOff,
  Save,
  Phone,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  orderId?: string;
  paymentMethod?: "cash" | "card" | "wallet";
  amount?: number;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onPaymentSaved?: (orderData: any) => void;
  onFallbackMode?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  lastErrorTime: number;
  errorType:
    | "payment_gateway"
    | "network"
    | "validation"
    | "security"
    | "timeout"
    | "unknown";
  isRecovering: boolean;
  orderDataSaved: boolean;
}

export class PaymentProcessingErrorBoundary extends Component<Props, State> {
  private maxRetries = 3; // Lower for payment operations
  private retryDelay = 3000; // 3 seconds
  private retryTimeout?: NodeJS.Timeout;
  private errorThreshold = 2; // Lower threshold for payment errors
  private timeWindow = 120000; // 2 minutes
  private errorTimes: number[] = [];
  private criticalErrorTypes = ["security", "payment_gateway"];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      lastErrorTime: 0,
      errorType: "unknown",
      isRecovering: false,
      orderDataSaved: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Categorize payment-specific errors
    let errorType: State["errorType"] = "unknown";

    if (
      error.message.includes("payment") ||
      error.message.includes("gateway") ||
      error.message.includes("transaction")
    ) {
      errorType = "payment_gateway";
    } else if (
      error.message.includes("network") ||
      error.message.includes("fetch") ||
      error.message.includes("connection")
    ) {
      errorType = "network";
    } else if (
      error.message.includes("validation") ||
      error.message.includes("invalid") ||
      error.message.includes("amount")
    ) {
      errorType = "validation";
    } else if (
      error.message.includes("security") ||
      error.message.includes("unauthorized") ||
      error.message.includes("forbidden")
    ) {
      errorType = "security";
    } else if (
      error.message.includes("timeout") ||
      error.message.includes("slow")
    ) {
      errorType = "timeout";
    }

    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
      errorType,
      isRecovering: false,
      orderDataSaved: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();

    // Track error frequency
    this.errorTimes.push(now);
    this.errorTimes = this.errorTimes.filter(
      (time) => now - time < this.timeWindow
    );

    console.error("Payment Processing Error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error with payment context
    this.logPaymentError(error, errorInfo);

    // Attempt to save order data immediately for critical errors
    if (this.isCriticalError()) {
      this.attemptOrderDataSave();
    }

    // Show critical error notification
    this.showPaymentErrorNotification();

    // Only auto-retry for non-critical errors
    if (!this.isCriticalError() && this.canAutoRecover()) {
      this.scheduleAutoRecovery();
    }
  }

  private logPaymentError(error: Error, errorInfo: ErrorInfo) {
    const context = {
      component: "PaymentProcessing",
      orderId: this.props.orderId,
      paymentMethod: this.props.paymentMethod,
      amount: this.props.amount,
      errorCount: this.errorTimes.length,
      retryCount: this.state.retryCount,
      errorType: this.state.errorType,
      isCritical: this.isCriticalError(),
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: "PaymentProcessingErrorBoundary",
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("💳 Payment Processing Error");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Context:", context);
      console.groupEnd();
    }

    // Log to monitoring service with high priority for payment errors
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "exception", {
        description: error.toString(),
        fatal:
          this.isCriticalError() ||
          this.errorTimes.length >= this.errorThreshold,
        custom_map: {
          ...context.metadata,
          payment_error: true,
          critical_error: this.isCriticalError(),
        },
      });
    }
  }

  private isCriticalError(): boolean {
    return this.criticalErrorTypes.includes(this.state.errorType);
  }

  private canAutoRecover(): boolean {
    return (
      this.state.retryCount < this.maxRetries &&
      this.errorTimes.length < this.errorThreshold &&
      !this.isCriticalError() &&
      (this.state.errorType === "network" || this.state.errorType === "timeout")
    );
  }

  private scheduleAutoRecovery() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Longer delay for payment operations
    const delay = this.retryDelay * Math.pow(1.5, this.state.retryCount);

    this.retryTimeout = setTimeout(() => {
      console.log(
        `Auto-recovering payment processing (attempt ${
          this.state.retryCount + 1
        })`
      );
      this.handleRetry();
    }, delay);
  }

  private attemptOrderDataSave() {
    try {
      // Attempt to save order data to prevent loss
      const orderData = {
        orderId: this.props.orderId,
        paymentMethod: this.props.paymentMethod,
        amount: this.props.amount,
        timestamp: new Date().toISOString(),
        status: "payment_failed",
        errorType: this.state.errorType,
      };

      // Save to localStorage as backup
      localStorage.setItem(
        `failed_payment_${this.props.orderId}`,
        JSON.stringify(orderData)
      );

      // Call callback if provided
      if (this.props.onPaymentSaved) {
        this.props.onPaymentSaved(orderData);
      }

      this.setState({ orderDataSaved: true });

      toast.success("Order data saved. Payment can be retried later.");
    } catch (saveError) {
      console.error("Failed to save order data:", saveError);
      toast.error(
        "Failed to save order data. Please note order details manually."
      );
    }
  }

  private showPaymentErrorNotification() {
    const { paymentMethod, amount, orderId } = this.props;
    const { errorType } = this.state;

    const errorMessages = {
      payment_gateway:
        "Payment gateway error. Transaction may not have been processed.",
      network: "Network connection issue during payment processing.",
      validation: "Payment validation failed. Please check payment details.",
      security: "Security error detected. Payment has been blocked for safety.",
      timeout: "Payment processing timed out. Transaction status unknown.",
      unknown: "Unexpected error during payment processing.",
    };

    const isCritical = this.isCriticalError();

    toast.error(errorMessages[errorType], {
      duration: isCritical ? 10000 : 6000,
      action: isCritical
        ? undefined
        : {
            label: "Retry",
            onClick: this.handleRetry,
          },
    });

    // Additional critical error notification
    if (isCritical) {
      toast.error(
        "CRITICAL: Payment processing stopped for security. Contact support immediately.",
        {
          duration: 15000,
        }
      );
    }
  }

  private handleRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    if (this.state.retryCount < this.maxRetries && !this.isCriticalError()) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
        isRecovering: true,
      }));

      toast.success(
        `Retrying payment... (${this.state.retryCount + 1}/${this.maxRetries})`,
        {
          duration: 3000,
        }
      );

      // Reset recovering state after delay
      setTimeout(() => {
        this.setState({ isRecovering: false });
      }, 2000);
    } else {
      const reason = this.isCriticalError()
        ? "Critical error detected"
        : "Maximum retry attempts reached";
      toast.error(`${reason}. Please use manual payment processing.`);
    }
  };

  private handleManualPayment = () => {
    // Switch to manual payment mode
    if (this.props.onFallbackMode) {
      this.props.onFallbackMode();
    } else {
      // Default fallback - navigate to manual payment page
      const fallbackUrl = `/staff/payment/manual?order=${this.props.orderId}&amount=${this.props.amount}`;
      window.location.href = fallbackUrl;
    }

    toast.info("Switching to manual payment processing");
  };

  private handleContactSupport = () => {
    // Open support contact method
    const supportMessage = `Payment Error - Order: ${this.props.orderId}, Amount: ${this.props.amount}, Error: ${this.state.errorType}`;
    const phoneNumber = "+1234567890"; // Replace with actual support number

    if (navigator.userAgent.includes("Mobile")) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      // Copy support info to clipboard
      navigator.clipboard.writeText(
        `Support: ${phoneNumber}\n${supportMessage}`
      );
      toast.success("Support information copied to clipboard");
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
      errorType: "unknown",
      isRecovering: false,
      orderDataSaved: false,
    });
    this.errorTimes = [];

    toast.success("Payment processing reset");
  };

  private getPaymentErrorFallback() {
    const { paymentMethod, amount, orderId } = this.props;
    const { errorType, isRecovering, orderDataSaved } = this.state;
    const isCritical = this.isCriticalError();
    const isFrequentErrors = this.errorTimes.length >= this.errorThreshold;
    const canRetry = this.state.retryCount < this.maxRetries && !isCritical;

    const errorTypeIcons = {
      payment_gateway: CreditCard,
      network: Wifi,
      validation: AlertCircle,
      security: Shield,
      timeout: AlertTriangle,
      unknown: AlertTriangle,
    };

    const ErrorIcon = errorTypeIcons[errorType];

    return (
      <Card
        className={`w-full border-red-200 ${
          isCritical
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-red-50 dark:bg-red-900/20"
        } dark:border-red-800`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${
                isCritical
                  ? "bg-red-200 dark:bg-red-900/50"
                  : "bg-red-100 dark:bg-red-900/40"
              } rounded-full`}
            >
              <ErrorIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Processing Error
                {isCritical && (
                  <Badge className="bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200">
                    CRITICAL
                  </Badge>
                )}
                {isRecovering && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Recovering...
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Order: {orderId} | Amount: ${amount} | Method: {paymentMethod}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="destructive" className="capitalize">
              {errorType.replace("_", " ")} Error
            </Badge>
            <Badge variant="outline">
              Attempt {this.state.retryCount + 1}/{this.maxRetries + 1}
            </Badge>
            {isCritical && (
              <Badge className="bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200">
                Security Alert
              </Badge>
            )}
            {orderDataSaved && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Data Saved
              </Badge>
            )}
            {isFrequentErrors && (
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                System Issues
              </Badge>
            )}
          </div>

          {/* Critical Error Alert */}
          {isCritical && (
            <Alert className="border-red-300 bg-red-100 dark:bg-red-900/30">
              <Shield className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                <strong>SECURITY ALERT:</strong> Payment processing has been
                stopped for security reasons.
                {errorType === "security" && " Unauthorized access detected."}
                {errorType === "payment_gateway" &&
                  " Payment gateway security error."}
                Contact support immediately.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Impact Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Payment Status:</strong>
              {errorType === "payment_gateway" &&
                " Transaction may have failed or be pending. Check with payment provider."}
              {errorType === "network" &&
                " Payment status unknown due to connection issues."}
              {errorType === "validation" &&
                " Payment was rejected due to invalid data."}
              {errorType === "security" &&
                " Payment blocked for security reasons."}
              {errorType === "timeout" &&
                " Payment may be processing. Check transaction status."}
              {errorType === "unknown" &&
                " Payment status uncertain. Verify with payment system."}
            </AlertDescription>
          </Alert>

          {/* Order Data Status */}
          {orderDataSaved && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <Save className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Order data has been saved. Payment can be retried later or
                processed manually.
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery Actions */}
          <div className="space-y-3">
            <h4 className="font-medium text-red-800 dark:text-red-200">
              {isCritical ? "Security Actions:" : "Recovery Options:"}
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
                  {isRecovering ? "Retrying..." : "Retry Payment"}
                </Button>
              )}

              <Button
                onClick={this.handleManualPayment}
                className="flex items-center gap-2"
                variant={isCritical ? "default" : "outline"}
              >
                <DollarSign className="h-4 w-4" />
                Manual Payment
              </Button>

              {isCritical && (
                <Button
                  onClick={this.handleContactSupport}
                  className="flex items-center gap-2"
                  variant="destructive"
                >
                  <Phone className="h-4 w-4" />
                  Contact Support
                </Button>
              )}

              {!isCritical && (
                <Button
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Payment
                </Button>
              )}

              <Button
                onClick={() => (window.location.href = "/staff/reception")}
                className="flex items-center gap-2"
                variant="outline"
              >
                <CreditCard className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Error-Specific Guidance */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Next Steps:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              {errorType === "payment_gateway" && (
                <>
                  <li>Check payment gateway status</li>
                  <li>Verify transaction in payment dashboard</li>
                  <li>Use backup payment method if available</li>
                  <li>Process payment manually if needed</li>
                </>
              )}
              {errorType === "network" && (
                <>
                  <li>Check internet connection</li>
                  <li>Wait for connection to stabilize</li>
                  <li>Retry payment when online</li>
                  <li>Use offline payment method if available</li>
                </>
              )}
              {errorType === "validation" && (
                <>
                  <li>Verify payment amount and details</li>
                  <li>Check customer payment information</li>
                  <li>Ensure payment method is valid</li>
                  <li>Try alternative payment method</li>
                </>
              )}
              {errorType === "security" && (
                <>
                  <li>Do not retry payment automatically</li>
                  <li>Contact security team immediately</li>
                  <li>Document the incident</li>
                  <li>Use secure manual payment process</li>
                </>
              )}
              {errorType === "timeout" && (
                <>
                  <li>Check payment provider status</li>
                  <li>Verify if payment was processed</li>
                  <li>Wait before retrying</li>
                  <li>Contact payment support if needed</li>
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
              Type: {errorType} | Critical: {isCritical ? "Yes" : "No"}
            </div>
            {this.errorTimes.length > 1 && (
              <div>
                {this.errorTimes.length} payment errors in last 2 minutes
              </div>
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

      // Payment processing specific error UI
      return this.getPaymentErrorFallback();
    }

    return this.props.children;
  }
}

// HOC for wrapping payment components with error boundary
export function withPaymentProcessingErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (
    props: P & {
      orderId?: string;
      paymentMethod?: Props["paymentMethod"];
      amount?: number;
    }
  ) => (
    <PaymentProcessingErrorBoundary
      orderId={props.orderId}
      paymentMethod={props.paymentMethod}
      amount={props.amount}
      {...errorBoundaryProps}
    >
      <Component {...props} />
    </PaymentProcessingErrorBoundary>
  );

  WrappedComponent.displayName = `withPaymentProcessingErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}
