"use client";

import { toast } from "sonner";
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export interface NotificationConfig {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
}

/**
 * Enhanced notification system for order management
 */
export class OrderNotifications {
  // Success notifications
  static orderCreated(orderNumber?: string, config?: NotificationConfig) {
    const message = orderNumber
      ? `Order #${orderNumber} created successfully`
      : "Order created successfully";

    return toast.success(message, {
      description:
        config?.description ||
        "The order has been saved and is ready for processing",
      duration: config?.duration || 4000,
      action: config?.action,
      ...config,
    });
  }

  static orderUpdated(config?: NotificationConfig) {
    return toast.success("Order updated successfully", {
      description: config?.description || "All changes have been saved",
      duration: config?.duration || 3000,
      action: config?.action,
      ...config,
    });
  }

  static statusChanged(newStatus: string, config?: NotificationConfig) {
    return toast.success(`Status updated to ${newStatus}`, {
      description:
        config?.description || "Order status has been changed successfully",
      duration: config?.duration || 3000,
      action: config?.action,
      ...config,
    });
  }

  static orderVoided(orderNumber?: string, config?: NotificationConfig) {
    const message = orderNumber
      ? `Order #${orderNumber} has been voided`
      : "Order has been voided";

    return toast.success(message, {
      description:
        config?.description ||
        "The order has been permanently removed from the system",
      duration: config?.duration || 4000,
      action: config?.action,
      ...config,
    });
  }

  // Error notifications
  static orderCreationFailed(error?: string, config?: NotificationConfig) {
    return toast.error("Failed to create order", {
      description:
        config?.description || error || "Please check your input and try again",
      duration: config?.duration || 5000,
      action: config?.action,
      ...config,
    });
  }

  static orderUpdateFailed(error?: string, config?: NotificationConfig) {
    return toast.error("Failed to update order", {
      description:
        config?.description || error || "Your changes could not be saved",
      duration: config?.duration || 5000,
      action: config?.action,
      ...config,
    });
  }

  static statusChangeFailed(error?: string, config?: NotificationConfig) {
    return toast.error("Failed to update status", {
      description:
        config?.description ||
        error ||
        "The status change could not be processed",
      duration: config?.duration || 5000,
      action: config?.action,
      ...config,
    });
  }

  static orderVoidFailed(error?: string, config?: NotificationConfig) {
    return toast.error("Failed to void order", {
      description:
        config?.description ||
        error ||
        "The order could not be voided at this time",
      duration: config?.duration || 5000,
      action: config?.action,
      ...config,
    });
  }

  static networkError(config?: NotificationConfig) {
    return toast.error("Network connection error", {
      description:
        config?.description ||
        "Please check your internet connection and try again",
      duration: config?.duration || 6000,
      action: config?.action || {
        label: "Retry",
        onClick: () => window.location.reload(),
      },
      ...config,
    });
  }

  static permissionError(config?: NotificationConfig) {
    return toast.error("Permission denied", {
      description:
        config?.description ||
        "You don't have permission to perform this action",
      duration: config?.duration || 5000,
      action: config?.action,
      ...config,
    });
  }

  // Warning notifications
  static unsavedChanges(config?: NotificationConfig) {
    return toast.warning("You have unsaved changes", {
      description:
        config?.description || "Make sure to save your changes before leaving",
      duration: config?.duration || 5000,
      action: config?.action,
      ...config,
    });
  }

  static orderAlreadyProcessed(config?: NotificationConfig) {
    return toast.warning("Order already processed", {
      description:
        config?.description ||
        "This order cannot be modified as it has already been processed",
      duration: config?.duration || 4000,
      action: config?.action,
      ...config,
    });
  }

  static invalidStatusTransition(
    fromStatus: string,
    toStatus: string,
    config?: NotificationConfig
  ) {
    return toast.warning("Invalid status change", {
      description:
        config?.description ||
        `Cannot change status from ${fromStatus} to ${toStatus}`,
      duration: config?.duration || 4000,
      action: config?.action,
      ...config,
    });
  }

  // Info notifications
  static orderLoading(config?: NotificationConfig) {
    return toast.loading("Loading order details...", {
      description: config?.description,
      duration: config?.duration || Infinity,
      ...config,
    });
  }

  static savingChanges(config?: NotificationConfig) {
    return toast.loading("Saving changes...", {
      description:
        config?.description || "Please wait while we save your changes",
      duration: config?.duration || Infinity,
      ...config,
    });
  }

  static processingOrder(config?: NotificationConfig) {
    return toast.loading("Processing order...", {
      description: config?.description || "Creating your order, please wait",
      duration: config?.duration || Infinity,
      ...config,
    });
  }

  // Batch operations
  static batchUpdateStarted(count: number, config?: NotificationConfig) {
    return toast.info(`Updating ${count} orders...`, {
      description: config?.description || "This may take a few moments",
      duration: config?.duration || 4000,
      action: config?.action,
      ...config,
    });
  }

  static batchUpdateCompleted(
    successCount: number,
    failCount: number,
    config?: NotificationConfig
  ) {
    if (failCount === 0) {
      return toast.success(`Successfully updated ${successCount} orders`, {
        description: config?.description || "All orders have been updated",
        duration: config?.duration || 4000,
        action: config?.action,
        ...config,
      });
    } else {
      return toast.warning(
        `Updated ${successCount} orders, ${failCount} failed`,
        {
          description:
            config?.description || "Some orders could not be updated",
          duration: config?.duration || 5000,
          action: config?.action,
          ...config,
        }
      );
    }
  }

  // Validation notifications
  static validationError(
    field: string,
    message: string,
    config?: NotificationConfig
  ) {
    return toast.error(`Validation error: ${field}`, {
      description: config?.description || message,
      duration: config?.duration || 4000,
      action: config?.action,
      ...config,
    });
  }

  static missingRequiredFields(fields: string[], config?: NotificationConfig) {
    const fieldList = fields.join(", ");
    return toast.error("Missing required fields", {
      description: config?.description || `Please fill in: ${fieldList}`,
      duration: config?.duration || 5000,
      action: config?.action,
      ...config,
    });
  }

  // Progress notifications
  static showProgress(
    message: string,
    progress: number,
    config?: NotificationConfig
  ) {
    return toast.loading(`${message} (${progress}%)`, {
      description: config?.description,
      duration: config?.duration || Infinity,
      ...config,
    });
  }

  // Confirmation dialogs (using toast for consistency)
  static confirmAction(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    config?: NotificationConfig
  ) {
    return toast.warning(message, {
      description: config?.description || "This action cannot be undone",
      duration: config?.duration || 10000,
      action: {
        label: "Confirm",
        onClick: onConfirm,
      },
      cancel: {
        label: "Cancel",
        onClick: onCancel || (() => {}),
      },
      ...config,
    });
  }

  // Utility methods
  static dismiss(toastId?: string | number) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  static dismissAll() {
    toast.dismiss();
  }

  // Custom notification with full control
  static custom(
    type: "success" | "error" | "warning" | "info" | "loading",
    message: string,
    config?: NotificationConfig
  ) {
    const toastFn = toast[type];
    return toastFn(message, config);
  }
}

/**
 * Hook for managing notification state and cleanup
 */
export function useOrderNotifications() {
  const activeToasts = new Set<string | number>();

  const addToast = (toastId: string | number) => {
    activeToasts.add(toastId);
  };

  const removeToast = (toastId: string | number) => {
    activeToasts.delete(toastId);
  };

  const clearAllToasts = () => {
    activeToasts.forEach((id) => toast.dismiss(id));
    activeToasts.clear();
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearAllToasts();
    };
  }, []);

  return {
    notifications: OrderNotifications,
    addToast,
    removeToast,
    clearAllToasts,
    activeCount: activeToasts.size,
  };
}

/**
 * Notification templates for common order operations
 */
export const OrderNotificationTemplates = {
  // Order creation flow
  createOrder: {
    loading: () =>
      OrderNotifications.processingOrder({
        description: "Validating order details and saving to database",
      }),
    success: (orderNumber: string) =>
      OrderNotifications.orderCreated(orderNumber, {
        action: {
          label: "View Order",
          onClick: () => (window.location.href = `/orders/${orderNumber}`),
        },
      }),
    error: (error: string) =>
      OrderNotifications.orderCreationFailed(error, {
        action: {
          label: "Try Again",
          onClick: () => window.location.reload(),
        },
      }),
  },

  // Status update flow
  updateStatus: {
    loading: (status: string) =>
      OrderNotifications.savingChanges({
        description: `Changing status to ${status}`,
      }),
    success: (status: string) => OrderNotifications.statusChanged(status),
    error: (error: string) =>
      OrderNotifications.statusChangeFailed(error, {
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
      }),
  },

  // Order void flow
  voidOrder: {
    confirm: (orderNumber: string, onConfirm: () => void) =>
      OrderNotifications.confirmAction(
        `Void Order #${orderNumber}?`,
        onConfirm,
        undefined,
        {
          description:
            "This will permanently delete the order and cannot be undone",
        }
      ),
    loading: () =>
      OrderNotifications.savingChanges({
        description: "Permanently deleting order from system",
      }),
    success: (orderNumber: string) =>
      OrderNotifications.orderVoided(orderNumber, {
        action: {
          label: "Back to Orders",
          onClick: () => (window.location.href = "/orders"),
        },
      }),
    error: (error: string) => OrderNotifications.orderVoidFailed(error),
  },

  // Form validation
  validation: {
    missingFields: (fields: string[]) =>
      OrderNotifications.missingRequiredFields(fields),
    invalidField: (field: string, message: string) =>
      OrderNotifications.validationError(field, message),
    unsavedChanges: () =>
      OrderNotifications.unsavedChanges({
        action: {
          label: "Save Now",
          onClick: () => {
            // This would be handled by the component
            console.log("Save action triggered");
          },
        },
      }),
  },
};

// React import for the hook
import React from "react";
