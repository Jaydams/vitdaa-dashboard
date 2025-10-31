"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useNotifications } from "@/components/notifications/NotificationSystem";

export interface OperationStatus {
  id: string;
  name: string;
  status:
    | "idle"
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled";
  progress: number;
  total: number;
  message?: string;
  error?: Error;
  startTime?: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

export interface OperationOptions {
  showNotifications?: boolean;
  showProgress?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onProgress?: (progress: number, total: number, message?: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export function useOperationStatus(
  operationName: string,
  options: OperationOptions = {}
) {
  const {
    showNotifications = true,
    showProgress = true,
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 2000,
    timeout = 30000,
    onProgress,
    onComplete,
    onError,
    onCancel,
  } = options;

  const notifications = useNotifications();
  const [operations, setOperations] = useState<Map<string, OperationStatus>>(
    new Map()
  );
  const timeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `${operationName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }, [operationName]);

  // Create new operation
  const startOperation = useCallback(
    (
      operationFn: (
        updateProgress: (progress: number, message?: string) => void,
        signal: AbortSignal
      ) => Promise<any>,
      customOptions: Partial<OperationOptions> = {}
    ) => {
      const operationId = generateOperationId();
      const mergedOptions = { ...options, ...customOptions };

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const operation: OperationStatus = {
        id: operationId,
        name: operationName,
        status: "pending",
        progress: 0,
        total: 100,
        startTime: new Date(),
        metadata: {},
      };

      setOperations((prev) => new Map(prev.set(operationId, operation)));

      // Show initial notification
      let notificationId: string | undefined;
      if (showNotifications) {
        notificationId = notifications.showInfo(
          `Starting ${operationName}...`,
          {
            id: operationId,
            category: "system",
            persistent: true,
          }
        );
      }

      // Show progress notification
      let progressNotificationId: string | undefined;
      if (showProgress) {
        progressNotificationId = notifications.showProgress(
          `Processing ${operationName}`,
          {
            id: `${operationId}_progress`,
            progress: 0,
            category: "system",
          }
        );
      }

      // Progress update function
      const updateProgress = (progress: number, message?: string) => {
        setOperations((prev) => {
          const existing = prev.get(operationId);
          if (!existing) return prev;

          const updated = {
            ...existing,
            progress,
            message,
            status: "processing" as const,
          };

          const newMap = new Map(prev);
          newMap.set(operationId, updated);
          return newMap;
        });

        // Update progress notification
        if (progressNotificationId) {
          notifications.updateProgress(
            progressNotificationId,
            progress,
            message
          );
        }

        // Call custom progress handler
        onProgress?.(progress, 100, message);
      };

      // Set timeout
      if (timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          handleOperationError(
            operationId,
            new Error("Operation timed out"),
            0
          );
        }, timeout);
      }

      // Execute operation
      const executeOperation = async (retryCount = 0): Promise<any> => {
        try {
          updateProgress(0, "Initializing...");

          const result = await operationFn(
            updateProgress,
            abortControllerRef.current!.signal
          );

          // Clear timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // Mark as completed
          setOperations((prev) => {
            const existing = prev.get(operationId);
            if (!existing) return prev;

            const updated = {
              ...existing,
              status: "completed" as const,
              progress: 100,
              endTime: new Date(),
              message: "Operation completed successfully",
            };

            const newMap = new Map(prev);
            newMap.set(operationId, updated);
            return newMap;
          });

          // Complete progress notification
          if (progressNotificationId) {
            notifications.completeProgress(
              progressNotificationId,
              `${operationName} completed successfully`
            );
          }

          // Show success notification
          if (showNotifications) {
            notifications.showSuccess(
              `${operationName} completed successfully`,
              {
                category: "system",
                duration: 3000,
              }
            );
          }

          onComplete?.(result);
          return result;
        } catch (error) {
          const err = error as Error;

          // Check if operation was cancelled
          if (err.name === "AbortError") {
            handleOperationCancel(operationId);
            return;
          }

          // Handle retry logic
          if (autoRetry && retryCount < maxRetries) {
            const nextRetryCount = retryCount + 1;

            // Update status to show retry
            setOperations((prev) => {
              const existing = prev.get(operationId);
              if (!existing) return prev;

              const updated = {
                ...existing,
                status: "pending" as const,
                message: `Retrying... (${nextRetryCount}/${maxRetries})`,
                error: err,
              };

              const newMap = new Map(prev);
              newMap.set(operationId, updated);
              return newMap;
            });

            // Show retry notification
            if (showNotifications) {
              notifications.showWarning(
                `${operationName} failed. Retrying... (${nextRetryCount}/${maxRetries})`,
                {
                  category: "system",
                  duration: retryDelay,
                }
              );
            }

            // Schedule retry
            retryTimeoutRef.current = setTimeout(() => {
              executeOperation(nextRetryCount);
            }, retryDelay);

            return;
          }

          // Handle final failure
          handleOperationError(operationId, err, retryCount);
          throw err;
        }
      };

      return executeOperation();
    },
    [
      operationName,
      options,
      showNotifications,
      showProgress,
      autoRetry,
      maxRetries,
      retryDelay,
      timeout,
      notifications,
      onProgress,
      onComplete,
      onError,
      generateOperationId,
    ]
  );

  // Handle operation error
  const handleOperationError = useCallback(
    (operationId: string, error: Error, retryCount: number) => {
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Update operation status
      setOperations((prev) => {
        const existing = prev.get(operationId);
        if (!existing) return prev;

        const updated = {
          ...existing,
          status: "failed" as const,
          error,
          endTime: new Date(),
          message: error.message,
          metadata: {
            ...existing.metadata,
            retryCount,
          },
        };

        const newMap = new Map(prev);
        newMap.set(operationId, updated);
        return newMap;
      });

      // Fail progress notification
      const progressNotificationId = `${operationId}_progress`;
      notifications.failProgress(
        progressNotificationId,
        `${operationName} failed: ${error.message}`
      );

      // Show error notification
      if (showNotifications) {
        notifications.showError(`${operationName} failed: ${error.message}`, {
          category: "system",
          priority: "high",
          persistent: true,
          action: {
            label: "Retry",
            onClick: () => {
              // Restart the operation
              // Note: This would need the original operation function
            },
          },
        });
      }

      onError?.(error);
    },
    [operationName, showNotifications, notifications, onError]
  );

  // Handle operation cancellation
  const handleOperationCancel = useCallback(
    (operationId: string) => {
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Update operation status
      setOperations((prev) => {
        const existing = prev.get(operationId);
        if (!existing) return prev;

        const updated = {
          ...existing,
          status: "cancelled" as const,
          endTime: new Date(),
          message: "Operation cancelled by user",
        };

        const newMap = new Map(prev);
        newMap.set(operationId, updated);
        return newMap;
      });

      // Dismiss progress notification
      const progressNotificationId = `${operationId}_progress`;
      notifications.dismissNotification(progressNotificationId);

      // Show cancellation notification
      if (showNotifications) {
        notifications.showInfo(`${operationName} cancelled`, {
          category: "system",
          duration: 2000,
        });
      }

      onCancel?.();
    },
    [operationName, showNotifications, notifications, onCancel]
  );

  // Cancel current operation
  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Get current operation status
  const getCurrentOperation = useCallback(() => {
    const currentOps = Array.from(operations.values());
    return (
      currentOps.find(
        (op) => op.status === "pending" || op.status === "processing"
      ) || null
    );
  }, [operations]);

  // Get operation history
  const getOperationHistory = useCallback(() => {
    return Array.from(operations.values()).sort(
      (a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
    );
  }, [operations]);

  // Clear completed operations
  const clearHistory = useCallback(() => {
    setOperations((prev) => {
      const newMap = new Map();
      for (const [id, operation] of prev) {
        if (
          operation.status === "pending" ||
          operation.status === "processing"
        ) {
          newMap.set(id, operation);
        }
      }
      return newMap;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    startOperation,
    cancelOperation,
    getCurrentOperation,
    getOperationHistory,
    clearHistory,
    isOperationRunning: getCurrentOperation() !== null,
  };
}
