"use client";

import React from "react";
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
  CreditCard,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

export interface FallbackUIProps {
  type: "dashboard" | "tickets" | "payment" | "network" | "general";
  title?: string;
  description?: string;
  error?: Error;
  retryCount?: number;
  maxRetries?: number;
  isRetrying?: boolean;
  nextRetryIn?: number;
  canRetry?: boolean;
  onRetry?: () => void;
  onReset?: () => void;
  onGoHome?: () => void;
  onFallbackMode?: () => void;
  showErrorDetails?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive" | "secondary";
    icon?: React.ComponentType<{ className?: string }>;
  }>;
}

export function FallbackUI({
  type,
  title,
  description,
  error,
  retryCount = 0,
  maxRetries = 3,
  isRetrying = false,
  nextRetryIn = 0,
  canRetry = true,
  onRetry,
  onReset,
  onGoHome,
  onFallbackMode,
  showErrorDetails = false,
  actions = [],
}: FallbackUIProps) {
  const getTypeConfig = () => {
    const configs = {
      dashboard: {
        icon: ShoppingCart,
        defaultTitle: "Dashboard Error",
        defaultDescription:
          "The reception dashboard encountered an error and needs attention.",
        color: "red",
        fallbackActions: [
          { label: "Simple Mode", onClick: onFallbackMode, icon: ShoppingCart },
          { label: "Main Dashboard", onClick: onGoHome, icon: Home },
        ],
      },
      tickets: {
        icon: Ticket,
        defaultTitle: "Ticket Management Error",
        defaultDescription:
          "There was an issue managing tickets. Some operations may be unavailable.",
        color: "orange",
        fallbackActions: [
          { label: "Read-Only Mode", onClick: onFallbackMode, icon: Ticket },
          { label: "Refresh Data", onClick: onRetry, icon: RefreshCw },
        ],
      },
      payment: {
        icon: CreditCard,
        defaultTitle: "Payment Processing Error",
        defaultDescription:
          "Payment processing encountered an error. Transaction status may be uncertain.",
        color: "red",
        fallbackActions: [
          {
            label: "Manual Payment",
            onClick: onFallbackMode,
            icon: CreditCard,
          },
          { label: "Contact Support", onClick: () => {}, icon: AlertTriangle },
        ],
      },
      network: {
        icon: WifiOff,
        defaultTitle: "Network Connection Error",
        defaultDescription:
          "Unable to connect to the server. Some features may be limited.",
        color: "yellow",
        fallbackActions: [
          { label: "Offline Mode", onClick: onFallbackMode, icon: WifiOff },
          { label: "Check Connection", onClick: onRetry, icon: Wifi },
        ],
      },
      general: {
        icon: AlertTriangle,
        defaultTitle: "System Error",
        defaultDescription:
          "An unexpected error occurred. Please try again or contact support.",
        color: "red",
        fallbackActions: [
          { label: "Try Again", onClick: onRetry, icon: RefreshCw },
          { label: "Go Home", onClick: onGoHome, icon: Home },
        ],
      },
    };

    return configs[type];
  };

  const config = getTypeConfig();
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;

  const getColorClasses = (color: string) => {
    const colorMap = {
      red: {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        iconBg: "bg-red-100 dark:bg-red-900/40",
        iconColor: "text-red-600 dark:text-red-400",
        titleColor: "text-red-800 dark:text-red-200",
        textColor: "text-red-700 dark:text-red-300",
      },
      orange: {
        bg: "bg-orange-50 dark:bg-orange-900/20",
        border: "border-orange-200 dark:border-orange-800",
        iconBg: "bg-orange-100 dark:bg-orange-900/40",
        iconColor: "text-orange-600 dark:text-orange-400",
        titleColor: "text-orange-800 dark:text-orange-200",
        textColor: "text-orange-700 dark:text-orange-300",
      },
      yellow: {
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        border: "border-yellow-200 dark:border-yellow-800",
        iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        titleColor: "text-yellow-800 dark:text-yellow-200",
        textColor: "text-yellow-700 dark:text-yellow-300",
      },
    };

    return colorMap[color as keyof typeof colorMap] || colorMap.red;
  };

  const colors = getColorClasses(config.color);

  return (
    <Card className={`w-full ${colors.border} ${colors.bg}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${colors.iconBg} rounded-full`}>
            <Icon className={`h-6 w-6 ${colors.iconColor}`} />
          </div>
          <div className="flex-1">
            <CardTitle
              className={`${colors.titleColor} flex items-center gap-2`}
            >
              {displayTitle}
              {isRetrying && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Retrying...
                </Badge>
              )}
            </CardTitle>
            <p className={`text-sm ${colors.textColor} mt-1`}>
              {displayDescription}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {retryCount > 0 && (
            <Badge variant="outline">
              Attempt {retryCount}/{maxRetries}
            </Badge>
          )}

          {canRetry ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-3 w-3 mr-1" />
              Recoverable
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <XCircle className="h-3 w-3 mr-1" />
              Manual Action Required
            </Badge>
          )}

          {type === "network" && (
            <Badge variant="outline" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>

        {/* Retry Countdown */}
        {isRetrying && nextRetryIn > 0 && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Retrying in {nextRetryIn} seconds...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Impact Information */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Impact:</strong>
            {type === "dashboard" &&
              " Order creation and management features may be unavailable."}
            {type === "tickets" &&
              " Ticket operations may be limited or read-only."}
            {type === "payment" &&
              " Payment processing is currently unavailable."}
            {type === "network" &&
              " Real-time updates and server synchronization are disabled."}
            {type === "general" &&
              " Some system features may not work as expected."}
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="space-y-3">
          <h4 className={`font-medium ${colors.titleColor}`}>
            Available Actions:
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Retry Button */}
            {canRetry && onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Retrying..." : "Try Again"}
              </Button>
            )}

            {/* Reset Button */}
            {onReset && (
              <Button
                onClick={onReset}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            )}

            {/* Type-specific fallback actions */}
            {config.fallbackActions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                className="flex items-center gap-2"
                variant="outline"
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            ))}

            {/* Custom actions */}
            {actions.map((action, index) => (
              <Button
                key={`custom-${index}`}
                onClick={action.onClick}
                className="flex items-center gap-2"
                variant={action.variant || "outline"}
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Type-specific guidance */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Recommended Steps:
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            {type === "dashboard" && (
              <>
                <li>Try refreshing the page</li>
                <li>Use simple mode for basic operations</li>
                <li>Contact support if issues persist</li>
              </>
            )}
            {type === "tickets" && (
              <>
                <li>Check network connection</li>
                <li>Use read-only mode to view tickets</li>
                <li>Try manual ticket operations</li>
              </>
            )}
            {type === "payment" && (
              <>
                <li>Verify payment gateway status</li>
                <li>Use manual payment processing</li>
                <li>Contact payment support if needed</li>
              </>
            )}
            {type === "network" && (
              <>
                <li>Check internet connection</li>
                <li>Wait for connection to restore</li>
                <li>Use offline mode if available</li>
              </>
            )}
            {type === "general" && (
              <>
                <li>Try refreshing the page</li>
                <li>Clear browser cache</li>
                <li>Contact technical support</li>
              </>
            )}
          </ul>
        </div>

        {/* Error Details (Development) */}
        {showErrorDetails &&
          error &&
          process.env.NODE_ENV === "development" && (
            <details className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <summary className="text-sm font-medium cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                {error.toString()}
                {error.stack}
              </pre>
            </details>
          )}

        {/* Metadata */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
          <div>Error Type: {type}</div>
          {retryCount > 0 && (
            <div>
              Retry Attempts: {retryCount}/{maxRetries}
            </div>
          )}
          <div>Timestamp: {new Date().toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized fallback components for common scenarios
export function DashboardFallback(props: Omit<FallbackUIProps, "type">) {
  return <FallbackUI {...props} type="dashboard" />;
}

export function TicketsFallback(props: Omit<FallbackUIProps, "type">) {
  return <FallbackUI {...props} type="tickets" />;
}

export function PaymentFallback(props: Omit<FallbackUIProps, "type">) {
  return <FallbackUI {...props} type="payment" />;
}

export function NetworkFallback(props: Omit<FallbackUIProps, "type">) {
  return <FallbackUI {...props} type="network" />;
}

export function GeneralFallback(props: Omit<FallbackUIProps, "type">) {
  return <FallbackUI {...props} type="general" />;
}
