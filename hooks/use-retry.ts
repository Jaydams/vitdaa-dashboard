"use client";

import React, { useState, useCallback } from "react";

interface UseRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
}

interface UseRetryReturn {
  retry: () => Promise<void>;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
  reset: () => void;
}

export function useRetry(
  asyncFunction: () => Promise<any>,
  options: UseRetryOptions = {}
): UseRetryReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const canRetry = retryCount < maxRetries;

  const retry = useCallback(async () => {
    if (!canRetry || isRetrying) {
      return;
    }

    setIsRetrying(true);

    try {
      // Calculate delay with optional exponential backoff
      const delay = exponentialBackoff
        ? retryDelay * Math.pow(2, retryCount)
        : retryDelay;

      // Wait for the delay
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Increment retry count
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      // Call the onRetry callback
      if (onRetry) {
        onRetry(newRetryCount);
      }

      // Execute the async function
      await asyncFunction();
    } catch (error) {
      console.error(`Retry attempt ${retryCount + 1} failed:`, error);

      // Check if we've reached max retries
      if (retryCount + 1 >= maxRetries && onMaxRetriesReached) {
        onMaxRetriesReached();
      }

      throw error;
    } finally {
      setIsRetrying(false);
    }
  }, [
    asyncFunction,
    canRetry,
    isRetrying,
    retryCount,
    retryDelay,
    exponentialBackoff,
    maxRetries,
    onRetry,
    onMaxRetriesReached,
  ]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retry,
    isRetrying,
    retryCount,
    canRetry,
    reset,
  };
}

// Hook for automatic retry with React Query
export function useAutoRetry(
  queryFn: () => Promise<any>,
  options: UseRetryOptions & { enabled?: boolean } = {}
) {
  const { enabled = true, ...retryOptions } = options;
  const retryHook = useRetry(queryFn, retryOptions);

  // Auto-retry on mount if enabled
  React.useEffect(() => {
    if (enabled && retryHook.canRetry) {
      // Initial attempt is handled by React Query
      // This hook is for manual retries
    }
  }, [enabled, retryHook.canRetry]);

  return retryHook;
}
