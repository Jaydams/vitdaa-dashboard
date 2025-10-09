"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface OptimisticUpdateConfig<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollbackData: T) => void;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

export interface OptimisticUpdateState {
  isUpdating: boolean;
  error: Error | null;
  lastUpdate: Date | null;
}

/**
 * Hook for managing optimistic updates with automatic rollback on error
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  config: OptimisticUpdateConfig<T> = {}
) {
  const [data, setData] = useState<T>(initialData);
  const [state, setState] = useState<OptimisticUpdateState>({
    isUpdating: false,
    error: null,
    lastUpdate: null,
  });

  const rollbackRef = useRef<T | null>(null);

  const updateOptimistically = useCallback(
    async (
      optimisticData: T,
      asyncOperation: () => Promise<T | void>,
      operationConfig?: Partial<OptimisticUpdateConfig<T>>
    ) => {
      const mergedConfig = { ...config, ...operationConfig };

      // Store current data for potential rollback
      rollbackRef.current = data;

      // Apply optimistic update
      setData(optimisticData);
      setState((prev) => ({
        ...prev,
        isUpdating: true,
        error: null,
      }));

      try {
        // Execute the async operation
        const result = await asyncOperation();

        // Update with actual result if provided
        if (result !== undefined) {
          setData(result);
        }

        setState((prev) => ({
          ...prev,
          isUpdating: false,
          lastUpdate: new Date(),
        }));

        // Show success feedback
        if (mergedConfig.showToast !== false && mergedConfig.successMessage) {
          toast.success(mergedConfig.successMessage);
        }

        // Call success callback
        if (mergedConfig.onSuccess) {
          mergedConfig.onSuccess(result || optimisticData);
        }

        return result || optimisticData;
      } catch (error) {
        // Rollback to previous state
        const rollbackData = rollbackRef.current || initialData;
        setData(rollbackData);

        const errorObj =
          error instanceof Error ? error : new Error(String(error));

        setState((prev) => ({
          ...prev,
          isUpdating: false,
          error: errorObj,
        }));

        // Show error feedback
        if (mergedConfig.showToast !== false) {
          const errorMessage =
            mergedConfig.errorMessage || errorObj.message || "Update failed";
          toast.error(errorMessage);
        }

        // Call error callback
        if (mergedConfig.onError) {
          mergedConfig.onError(errorObj, rollbackData);
        }

        throw errorObj;
      } finally {
        rollbackRef.current = null;
      }
    },
    [data, config, initialData]
  );

  const resetState = useCallback(() => {
    setState({
      isUpdating: false,
      error: null,
      lastUpdate: null,
    });
  }, []);

  const setDataDirectly = useCallback((newData: T) => {
    setData(newData);
    setState((prev) => ({
      ...prev,
      lastUpdate: new Date(),
    }));
  }, []);

  return {
    data,
    state,
    updateOptimistically,
    resetState,
    setData: setDataDirectly,
    isUpdating: state.isUpdating,
    error: state.error,
    lastUpdate: state.lastUpdate,
  };
}

/**
 * Specialized hook for order status updates
 */
export function useOptimisticOrderStatus(
  initialStatus: string,
  orderId: string,
  updateFunction: (orderId: string, status: string) => Promise<void>
) {
  return useOptimisticUpdate(initialStatus, {
    successMessage: "Order status updated successfully",
    errorMessage: "Failed to update order status",
    showToast: true,
  });
}

/**
 * Hook for managing multiple optimistic updates (e.g., batch operations)
 */
export function useBatchOptimisticUpdates<T extends Record<string, any>>(
  initialData: T[]
) {
  const [data, setData] = useState<T[]>(initialData);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const updateItem = useCallback(
    async (
      id: string,
      optimisticUpdate: Partial<T>,
      asyncOperation: () => Promise<T | void>
    ) => {
      // Add to pending updates
      setPendingUpdates((prev) => new Set(prev).add(id));
      setErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.delete(id);
        return newErrors;
      });

      // Store original item for rollback
      const originalItem = data.find((item) => item.id === id);
      if (!originalItem) {
        throw new Error(`Item with id ${id} not found`);
      }

      // Apply optimistic update
      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...optimisticUpdate } : item
        )
      );

      try {
        const result = await asyncOperation();

        // Update with actual result if provided
        if (result) {
          setData((prev) =>
            prev.map((item) => (item.id === id ? result : item))
          );
        }

        toast.success("Update successful");
      } catch (error) {
        // Rollback to original state
        setData((prev) =>
          prev.map((item) => (item.id === id ? originalItem : item))
        );

        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        setErrors((prev) => new Map(prev).set(id, errorObj));
        toast.error(`Update failed: ${errorObj.message}`);

        throw errorObj;
      } finally {
        setPendingUpdates((prev) => {
          const newPending = new Set(prev);
          newPending.delete(id);
          return newPending;
        });
      }
    },
    [data]
  );

  const isItemUpdating = useCallback(
    (id: string) => {
      return pendingUpdates.has(id);
    },
    [pendingUpdates]
  );

  const getItemError = useCallback(
    (id: string) => {
      return errors.get(id) || null;
    },
    [errors]
  );

  return {
    data,
    updateItem,
    isItemUpdating,
    getItemError,
    hasAnyPendingUpdates: pendingUpdates.size > 0,
    pendingCount: pendingUpdates.size,
  };
}

/**
 * Hook for form optimistic updates with validation
 */
export function useOptimisticForm<T extends Record<string, any>>(
  initialData: T,
  validationSchema?: (data: T) => boolean | string
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const updateField = useCallback(
    (field: keyof T, value: any) => {
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };

        // Validate if schema provided
        if (validationSchema) {
          const validation = validationSchema(newData);
          if (typeof validation === "string") {
            setValidationError(validation);
          } else if (!validation) {
            setValidationError("Validation failed");
          } else {
            setValidationError(null);
          }
        }

        setIsDirty(true);
        return newData;
      });
    },
    [validationSchema]
  );

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setIsDirty(false);
    setValidationError(null);
  }, [initialData]);

  const submitOptimistically = useCallback(
    async (
      submitFunction: (data: T) => Promise<T | void>,
      config?: OptimisticUpdateConfig<T>
    ) => {
      if (validationError) {
        throw new Error(validationError);
      }

      try {
        const result = await submitFunction(formData);

        if (result) {
          setFormData(result);
        }

        setIsDirty(false);

        if (config?.successMessage) {
          toast.success(config.successMessage);
        }

        return result || formData;
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));

        if (config?.errorMessage) {
          toast.error(config.errorMessage);
        }

        throw errorObj;
      }
    },
    [formData, validationError]
  );

  return {
    formData,
    isDirty,
    validationError,
    isValid: !validationError,
    updateField,
    resetForm,
    submitOptimistically,
  };
}
