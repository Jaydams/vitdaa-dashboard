/**
 * Error handling utilities for menu grid components
 */

export interface ErrorInfo {
  message: string;
  type: "network" | "permission" | "timeout" | "validation" | "unknown";
  severity: "low" | "medium" | "high";
  recoverable: boolean;
  retryable: boolean;
}

/**
 * Analyzes an error and returns structured error information
 */
export function analyzeError(error: Error | unknown): ErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Network errors
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("offline")
  ) {
    return {
      message:
        "Network connection issue. Please check your internet connection.",
      type: "network",
      severity: "medium",
      recoverable: true,
      retryable: true,
    };
  }

  // Permission errors
  if (
    lowerMessage.includes("permission") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("401") ||
    lowerMessage.includes("403")
  ) {
    return {
      message: "You do not have permission to access this resource.",
      type: "permission",
      severity: "high",
      recoverable: false,
      retryable: false,
    };
  }

  // Timeout errors
  if (
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("408")
  ) {
    return {
      message: "The request took too long to complete. Please try again.",
      type: "timeout",
      severity: "medium",
      recoverable: true,
      retryable: true,
    };
  }

  // Validation errors
  if (
    lowerMessage.includes("validation") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("400")
  ) {
    return {
      message: "Invalid data provided. Please check your input.",
      type: "validation",
      severity: "low",
      recoverable: true,
      retryable: false,
    };
  }

  // Default unknown error
  return {
    message: "An unexpected error occurred. Please try again.",
    type: "unknown",
    severity: "low",
    recoverable: true,
    retryable: true,
  };
}

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Calculates retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay =
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Determines if an error should be retried
 */
export function shouldRetry(
  error: Error | unknown,
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  if (attempt >= config.maxAttempts) {
    return false;
  }

  const errorInfo = analyzeError(error);
  return errorInfo.retryable;
}

/**
 * Generic retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!shouldRetry(error, attempt, config)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      if (attempt < config.maxAttempts) {
        const delay = calculateRetryDelay(attempt, config);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Error logging utility
 */
export function logError(
  error: Error | unknown,
  context: {
    component?: string;
    action?: string;
    userId?: string;
    metadata?: Record<string, any>;
  } = {}
): void {
  const errorInfo = analyzeError(error);

  // Console logging for development
  if (process.env.NODE_ENV === "development") {
    console.group(`🚨 Error in ${context.component || "Unknown Component"}`);
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    console.error("Context:", context);
    console.groupEnd();
  }

  // Analytics/monitoring service logging
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "exception", {
      description: errorInfo.message,
      fatal: errorInfo.severity === "high",
      custom_map: {
        error_type: errorInfo.type,
        severity: errorInfo.severity,
        component: context.component,
        action: context.action,
        recoverable: errorInfo.recoverable,
        retryable: errorInfo.retryable,
        ...context.metadata,
      },
    });
  }

  // Additional monitoring services can be added here
  // Example: Sentry, LogRocket, etc.
}

/**
 * Network status utilities
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private listeners: Set<(online: boolean) => void> = new Set();
  private _isOnline: boolean = true;

  private constructor() {
    if (typeof window !== "undefined") {
      this._isOnline = navigator.onLine;

      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  private handleOnline = () => {
    this._isOnline = true;
    this.notifyListeners(true);
  };

  private handleOffline = () => {
    this._isOnline = false;
    this.notifyListeners(false);
  };

  private notifyListeners(online: boolean) {
    this.listeners.forEach((listener) => listener(online));
  }

  addListener(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  cleanup() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    this.listeners.clear();
  }
}

/**
 * Hook for monitoring network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const monitor = NetworkMonitor.getInstance();
    setIsOnline(monitor.isOnline);

    const unsubscribe = monitor.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  return isOnline;
}

// React import for the hook
import React from "react";
