"use client";

import React from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FormErrorDisplayProps {
  errors: Record<string, string> | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: "inline" | "card" | "toast";
  showRetry?: boolean;
  showDismiss?: boolean;
}

export function FormErrorDisplay({
  errors,
  onRetry,
  onDismiss,
  className = "",
  variant = "inline",
  showRetry = false,
  showDismiss = true,
}: FormErrorDisplayProps) {
  if (!errors) return null;

  const errorMessages = React.useMemo(() => {
    if (typeof errors === "string") {
      return [errors];
    }

    if (typeof errors === "object") {
      return Object.entries(errors).map(([field, message]) => {
        // Format field names to be more user-friendly
        const formattedField = field
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .replace(/([a-z])([A-Z])/g, "$1 $2");

        return `${formattedField}: ${message}`;
      });
    }

    return ["An unexpected error occurred"];
  }, [errors]);

  const content = (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {errorMessages.length === 1 ? (
            <p className="text-sm text-destructive">{errorMessages[0]}</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Please fix the following errors:
              </p>
              <ul className="text-sm text-destructive space-y-1 ml-2">
                {errorMessages.map((message, index) => (
                  <li key={index} className="list-disc list-inside">
                    {message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {showDismiss && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-1 text-destructive hover:text-destructive/80"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showRetry && onRetry && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <Card className={`border-destructive/50 bg-destructive/5 ${className}`}>
        <CardContent className="pt-4">{content}</CardContent>
      </Card>
    );
  }

  if (variant === "toast") {
    return (
      <div className={`fixed top-4 right-4 z-50 max-w-md ${className}`}>
        <Alert variant="destructive" className="shadow-lg">
          <AlertDescription>{content}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Default inline variant
  return (
    <Alert variant="destructive" className={className}>
      <AlertDescription>{content}</AlertDescription>
    </Alert>
  );
}

// Field-specific error display component
interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className = "" }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p className={`text-sm text-destructive mt-1 ${className}`}>{error}</p>
  );
}

// Multiple field errors display
interface FieldErrorsProps {
  errors: Record<string, string>;
  fields: string[];
  className?: string;
}

export function FieldErrors({
  errors,
  fields,
  className = "",
}: FieldErrorsProps) {
  const relevantErrors = fields.map((field) => errors[field]).filter(Boolean);

  if (relevantErrors.length === 0) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      {relevantErrors.map((error, index) => (
        <FieldError key={index} error={error} />
      ))}
    </div>
  );
}

// Success message display component
interface SuccessDisplayProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function SuccessDisplay({
  message,
  onDismiss,
  className = "",
  autoHide = false,
  autoHideDelay = 3000,
}: SuccessDisplayProps) {
  React.useEffect(() => {
    if (autoHide && onDismiss) {
      const timer = setTimeout(onDismiss, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  return (
    <Alert
      className={`border-green-500/50 bg-green-50 dark:bg-green-950/20 ${className}`}
    >
      <AlertDescription className="flex items-center justify-between">
        <span className="text-green-700 dark:text-green-400">{message}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-1 text-green-700 hover:text-green-600 dark:text-green-400"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
