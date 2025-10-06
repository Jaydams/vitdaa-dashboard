"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  retryCount: number;
}

export interface LoadingStateOptions {
  maxRetries?: number;
  retryDelay?: number;
  autoRetry?: boolean;
  staleTime?: number; // Time in ms after which data is considered stale
}

export function useLoadingState(options: LoadingStateOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    autoRetry = false,
    staleTime = 5 * 60 * 1000, // 5 minutes default
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastUpdated: null,
    retryCount: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const asyncFunctionRef = useRef<(() => Promise<any>) | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const setLoading = useCallback((isLoading: boolean, isRefreshing = false) => {
    setState((prev) => ({
      ...prev,
      isLoading,
      isRefreshing,
      error: isLoading ? null : prev.error, // Clear error when starting new load
    }));
  }, []);

  const setError = useCallback((error: string | Error | null) => {
    const errorMessage = error instanceof Error ? error.message : error;
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isRefreshing: false,
      error: errorMessage,
    }));
  }, []);

  const setSuccess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastUpdated: new Date(),
      retryCount: 0, // Reset retry count on success
    }));
  }, []);

  const incrementRetryCount = useCallback(() => {
    setState((prev) => ({
      ...prev,
      retryCount: prev.retryCount + 1,
    }));
  }, []);

  const resetRetryCount = useCallback(() => {
    setState((prev) => ({
      ...prev,
      retryCount: 0,
    }));
  }, []);

  const canRetry = state.retryCount < maxRetries;

  const executeWithRetry = useCallback(
    async (asyncFunction: () => Promise<any>, isRefresh = false) => {
      asyncFunctionRef.current = asyncFunction;

      try {
        setLoading(true, isRefresh);
        const result = await asyncFunction();
        setSuccess();
        return result;
      } catch (error) {
        console.error("Loading failed:", error);
        setError(error as Error);
        incrementRetryCount();

        // Auto-retry if enabled and retries are available
        if (autoRetry && canRetry) {
          const delay = retryDelay * Math.pow(2, state.retryCount); // Exponential backoff
          retryTimeoutRef.current = setTimeout(() => {
            executeWithRetry(asyncFunction, isRefresh);
          }, delay);
        }

        throw error;
      }
    },
    [
      setLoading,
      setSuccess,
      setError,
      incrementRetryCount,
      canRetry,
      autoRetry,
      retryDelay,
      state.retryCount,
    ]
  );

  const manualRetry = useCallback(async () => {
    if (!asyncFunctionRef.current || !canRetry) {
      return;
    }

    try {
      await executeWithRetry(asyncFunctionRef.current, true);
    } catch (error) {
      // Error is already handled in executeWithRetry
    }
  }, [executeWithRetry, canRetry]);

  const refresh = useCallback(async () => {
    if (!asyncFunctionRef.current) {
      return;
    }

    try {
      await executeWithRetry(asyncFunctionRef.current, true);
    } catch (error) {
      // Error is already handled in executeWithRetry
    }
  }, [executeWithRetry]);

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setState({
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastUpdated: null,
      retryCount: 0,
    });
    asyncFunctionRef.current = null;
  }, []);

  // Check if data is stale
  const isStale = state.lastUpdated
    ? Date.now() - state.lastUpdated.getTime() > staleTime
    : true;

  return {
    ...state,
    canRetry,
    isStale,
    executeWithRetry,
    manualRetry,
    refresh,
    reset,
    setLoading,
    setError,
    setSuccess,
  };
}

// Hook for managing multiple loading states
export function useMultipleLoadingStates<T extends Record<string, any>>(
  keys: (keyof T)[],
  options: LoadingStateOptions = {}
) {
  const loadingStates = keys.reduce((acc, key) => {
    acc[key] = useLoadingState(options);
    return acc;
  }, {} as Record<keyof T, ReturnType<typeof useLoadingState>>);

  const isAnyLoading = Object.values(loadingStates).some(
    (state: any) => state.isLoading
  );
  const isAnyRefreshing = Object.values(loadingStates).some(
    (state: any) => state.isRefreshing
  );
  const hasAnyError = Object.values(loadingStates).some(
    (state: any) => state.error
  );

  const retryAll = useCallback(async () => {
    const promises = Object.values(loadingStates).map((state: any) =>
      state.canRetry ? state.manualRetry() : Promise.resolve()
    );
    await Promise.allSettled(promises);
  }, [loadingStates]);

  const refreshAll = useCallback(async () => {
    const promises = Object.values(loadingStates).map((state: any) =>
      state.refresh()
    );
    await Promise.allSettled(promises);
  }, [loadingStates]);

  const resetAll = useCallback(() => {
    Object.values(loadingStates).forEach((state: any) => state.reset());
  }, [loadingStates]);

  return {
    states: loadingStates,
    isAnyLoading,
    isAnyRefreshing,
    hasAnyError,
    retryAll,
    refreshAll,
    resetAll,
  };
}
