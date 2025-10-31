"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
  onRecoverySuccess?: () => void;
}

export interface ErrorRecoveryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
  canRetry: boolean;
  nextRetryIn: number;
}

export interface ErrorRecoveryActions {
  retry: () => Promise<void>;
  reset: () => void;
  executeWithRecovery: <T>(operation: () => Promise<T>) => Promise<T>;
  setRecoveryOptions: (options: Partial<ErrorRecoveryOptions>) => void;
}

export function useErrorRecovery(
  initialOptions: ErrorRecoveryOptions = {}
): [ErrorRecoveryState, ErrorRecoveryActions] {
  const defaultOptions: Required<ErrorRecoveryOptions> = {
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: true,
    retryCondition: (error: Error, attempt: number) => {
      // Default: retry network errors and timeouts, but not validation errors
      const retryableErrors = ["network", "timeout", "fetch", "connection"];
      return (
        retryableErrors.some((type) =>
          error.message.toLowerCase().includes(type)
        ) && attempt < 3
      );
    },
    onRetry: () => {},
    onMaxRetriesReached: () => {},
    onRecoverySuccess: () => {},
  };

  const [options, setOptions] = useState<Required<ErrorRecoveryOptions>>({
    ...defaultOptions,
    ...initialOptions,
  });

  const [state, setState] = useState<ErrorRecoveryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    canRetry: true,
    nextRetryIn: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const calculateRetryDelay = useCallback(
    (attempt: number): number => {
      if (!options.exponentialBackoff) {
        return options.retryDelay;
      }

      // Exponential backoff with jitter
      const baseDelay = options.retryDelay;
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter

      return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    },
    [options.retryDelay, options.exponentialBackoff]
  );

  const startCountdown = useCallback((delay: number) => {
    setState((prev) => ({ ...prev, nextRetryIn: Math.ceil(delay / 1000) }));

    countdownIntervalRef.current = setInterval(() => {
      setState((prev) => {
        const newCountdown = prev.nextRetryIn - 1;
        if (newCountdown <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return { ...prev, nextRetryIn: 0 };
        }
        return { ...prev, nextRetryIn: newCountdown };
      });
    }, 1000);
  }, []);

  const executeWithRecovery = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      lastOperationRef.current = operation;

      try {
        setState((prev) => ({ ...prev, lastError: null }));
        const result = await operation();

        // Success - reset retry count and call success callback
        if (state.retryCount > 0) {
          setState((prev) => ({ ...prev, retryCount: 0, canRetry: true }));
          options.onRecoverySuccess();
          toast.success("Operation recovered successfully");
        }

        return result;
      } catch (error) {
        const err = error as Error;
        console.error("Operation failed:", err);

        setState((prev) => ({
          ...prev,
          lastError: err,
          canRetry: options.retryCondition(err, prev.retryCount + 1),
        }));

        // Check if we should retry
        const shouldRetry = options.retryCondition(err, state.retryCount + 1);

        if (shouldRetry && state.retryCount < options.maxRetries) {
          const nextAttempt = state.retryCount + 1;
          const delay = calculateRetryDelay(nextAttempt);

          setState((prev) => ({
            ...prev,
            isRetrying: true,
            retryCount: nextAttempt,
          }));

          options.onRetry(nextAttempt, err);

          toast.error(
            `Operation failed. Retrying in ${Math.ceil(
              delay / 1000
            )} seconds... (${nextAttempt}/${options.maxRetries})`,
            {
              duration: delay,
            }
          );

          startCountdown(delay);

          return new Promise((resolve, reject) => {
            retryTimeoutRef.current = setTimeout(async () => {
              try {
                setState((prev) => ({
                  ...prev,
                  isRetrying: false,
                  nextRetryIn: 0,
                }));
                const result = await executeWithRecovery(operation);
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, delay);
          });
        } else {
          // Max retries reached or not retryable
          setState((prev) => ({
            ...prev,
            isRetrying: false,
            canRetry: false,
            nextRetryIn: 0,
          }));

          options.onMaxRetriesReached(err);

          if (state.retryCount >= options.maxRetries) {
            toast.error(
              `Operation failed after ${options.maxRetries} attempts. Please try again later or contact support.`
            );
          } else {
            toast.error(
              "Operation failed and cannot be retried automatically."
            );
          }

          throw err;
        }
      }
    },
    [state.retryCount, options, calculateRetryDelay, startCountdown]
  );

  const retry = useCallback(async (): Promise<void> => {
    if (!lastOperationRef.current) {
      throw new Error("No operation to retry");
    }

    if (!state.canRetry) {
      throw new Error("Cannot retry this operation");
    }

    await executeWithRecovery(lastOperationRef.current);
  }, [executeWithRecovery, state.canRetry]);

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      canRetry: true,
      nextRetryIn: 0,
    });

    lastOperationRef.current = null;

    toast.success("Error recovery reset");
  }, []);

  const setRecoveryOptions = useCallback(
    (newOptions: Partial<ErrorRecoveryOptions>) => {
      setOptions((prev) => ({ ...prev, ...newOptions }));
    },
    []
  );

  const actions: ErrorRecoveryActions = {
    retry,
    reset,
    executeWithRecovery,
    setRecoveryOptions,
  };

  return [state, actions];
}

// Specialized hook for network operations
export function useNetworkRecovery() {
  return useErrorRecovery({
    maxRetries: 5,
    retryDelay: 1000,
    exponentialBackoff: true,
    retryCondition: (error: Error, attempt: number) => {
      const networkErrors = [
        "network",
        "fetch",
        "timeout",
        "connection",
        "offline",
      ];
      const isNetworkError = networkErrors.some((type) =>
        error.message.toLowerCase().includes(type)
      );
      return isNetworkError && attempt <= 5;
    },
    onRetry: (attempt: number, error: Error) => {
      console.log(`Network retry attempt ${attempt}:`, error.message);
    },
    onMaxRetriesReached: (error: Error) => {
      console.error("Network operation failed after all retries:", error);
      toast.error(
        "Network connection issues persist. Please check your connection."
      );
    },
  });
}

// Specialized hook for payment operations
export function usePaymentRecovery() {
  return useErrorRecovery({
    maxRetries: 2, // Lower for payment operations
    retryDelay: 3000,
    exponentialBackoff: false, // Fixed delay for payments
    retryCondition: (error: Error, attempt: number) => {
      // Only retry network/timeout errors for payments, not validation or security errors
      const retryableErrors = ["network", "timeout", "connection"];
      const nonRetryableErrors = [
        "validation",
        "security",
        "unauthorized",
        "forbidden",
      ];

      const isRetryable = retryableErrors.some((type) =>
        error.message.toLowerCase().includes(type)
      );
      const isNonRetryable = nonRetryableErrors.some((type) =>
        error.message.toLowerCase().includes(type)
      );

      return isRetryable && !isNonRetryable && attempt <= 2;
    },
    onRetry: (attempt: number, error: Error) => {
      console.log(`Payment retry attempt ${attempt}:`, error.message);
      toast.warning("Payment failed. Retrying...", { duration: 3000 });
    },
    onMaxRetriesReached: (error: Error) => {
      console.error("Payment operation failed after all retries:", error);
      toast.error(
        "Payment processing failed. Please try manual payment or contact support."
      );
    },
  });
}

// Specialized hook for data operations (tickets, orders)
export function useDataRecovery() {
  return useErrorRecovery({
    maxRetries: 4,
    retryDelay: 1500,
    exponentialBackoff: true,
    retryCondition: (error: Error, attempt: number) => {
      const retryableErrors = [
        "network",
        "timeout",
        "connection",
        "server",
        "database",
      ];
      const nonRetryableErrors = [
        "validation",
        "permission",
        "not found",
        "404",
      ];

      const isRetryable = retryableErrors.some((type) =>
        error.message.toLowerCase().includes(type)
      );
      const isNonRetryable = nonRetryableErrors.some((type) =>
        error.message.toLowerCase().includes(type)
      );

      return isRetryable && !isNonRetryable && attempt <= 4;
    },
    onRetry: (attempt: number, error: Error) => {
      console.log(`Data operation retry attempt ${attempt}:`, error.message);
    },
    onMaxRetriesReached: (error: Error) => {
      console.error("Data operation failed after all retries:", error);
      toast.error(
        "Data operation failed. Changes may not be saved. Please try again or contact support."
      );
    },
  });
}
