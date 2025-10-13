"use client";

import { OfflineManager, PendingAction } from "@/lib/offline-manager";
import {
  analyzeError,
  logError,
  retryWithBackoff,
  ErrorInfo,
} from "@/lib/error-handling";

export interface FallbackOption {
  id: string;
  title: string;
  description: string;
  action: () => Promise<void> | void;
  priority: "low" | "normal" | "high";
  requiresOnline: boolean;
}

export interface RecoveryContext {
  component: string;
  action: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryResult {
  success: boolean;
  fallbackUsed?: string;
  error?: Error;
  retryCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Comprehensive error recovery service for staff dashboards
 */
export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private offlineManager: OfflineManager;
  private recoveryStrategies: Map<string, FallbackOption[]> = new Map();

  private constructor() {
    this.offlineManager = OfflineManager.getInstance();
    this.initializeDefaultStrategies();
  }

  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Main recovery method - attempts to recover from errors with fallback options
   */
  async recoverFromError(
    error: Error | unknown,
    context: RecoveryContext,
    customFallbacks?: FallbackOption[]
  ): Promise<RecoveryResult> {
    const errorInfo = analyzeError(error);

    // Log the error
    logError(error, context);

    try {
      // First, try automatic recovery based on error type
      const autoRecovery = await this.attemptAutoRecovery(errorInfo, context);
      if (autoRecovery.success) {
        return autoRecovery;
      }

      // If auto recovery fails, try fallback options
      const fallbacks =
        customFallbacks ||
        this.getFallbackOptions(context.component, errorInfo);
      const fallbackResult = await this.executeFallbacks(fallbacks, errorInfo);

      return fallbackResult;
    } catch (recoveryError) {
      console.error("Error during recovery process:", recoveryError);
      return {
        success: false,
        error:
          recoveryError instanceof Error
            ? recoveryError
            : new Error(String(recoveryError)),
      };
    }
  }

  /**
   * Queue action for offline execution
   */
  queueForOfflineExecution(
    actionType: string,
    payload: any,
    priority: "low" | "normal" | "high" | "critical" = "normal",
    maxRetries: number = 3
  ): string {
    return this.offlineManager.queueAction({
      type: actionType,
      payload,
      priority,
      maxRetries,
    });
  }

  /**
   * Register custom fallback strategies for specific components
   */
  registerFallbackStrategies(
    component: string,
    fallbacks: FallbackOption[]
  ): void {
    this.recoveryStrategies.set(component, fallbacks);
  }

  /**
   * Get recovery status and pending actions
   */
  getRecoveryStatus(): {
    isOnline: boolean;
    pendingActions: PendingAction[];
    isSyncing: boolean;
  } {
    return {
      isOnline: this.offlineManager.isOnline(),
      pendingActions: this.offlineManager.getPendingActions(),
      isSyncing: this.offlineManager.isSyncing(),
    };
  }

  /**
   * Force sync of pending actions
   */
  async forceSyncPendingActions(): Promise<void> {
    if (!this.offlineManager.isOnline()) {
      throw new Error("Cannot sync while offline");
    }
    return this.offlineManager.forcSync();
  }

  /**
   * Attempt automatic recovery based on error type
   */
  private async attemptAutoRecovery(
    errorInfo: ErrorInfo,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    switch (errorInfo.type) {
      case "network":
        return this.handleNetworkError(context);

      case "timeout":
        return this.handleTimeoutError(context);

      case "permission":
        return this.handlePermissionError(context);

      case "validation":
        return this.handleValidationError(context);

      default:
        return { success: false };
    }
  }

  /**
   * Handle network errors by queuing actions offline
   */
  private async handleNetworkError(
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // If we have action data, queue it for offline execution
    if (context.metadata?.actionData) {
      const actionId = this.queueForOfflineExecution(
        context.action,
        context.metadata.actionData,
        "normal"
      );

      return {
        success: true,
        fallbackUsed: "offline_queue",
        metadata: { actionId },
      };
    }

    return { success: false };
  }

  /**
   * Handle timeout errors with retry logic
   */
  private async handleTimeoutError(
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    if (context.metadata?.retryFunction) {
      try {
        await retryWithBackoff(context.metadata.retryFunction, {
          maxAttempts: 2,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2,
        });

        return { success: true, fallbackUsed: "retry" };
      } catch (retryError) {
        return { success: false, error: retryError as Error };
      }
    }

    return { success: false };
  }

  /**
   * Handle permission errors by redirecting to auth
   */
  private async handlePermissionError(
    _context: RecoveryContext
  ): Promise<RecoveryResult> {
    // Clear any cached auth data
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("staff_session");
    }

    // Redirect to login (this would be handled by the auth system)
    return {
      success: true,
      fallbackUsed: "auth_redirect",
    };
  }

  /**
   * Handle validation errors by providing user feedback
   */
  private async handleValidationError(
    _context: RecoveryContext
  ): Promise<RecoveryResult> {
    // Validation errors typically need user intervention
    return {
      success: true,
      fallbackUsed: "user_feedback",
    };
  }

  /**
   * Execute fallback options in priority order
   */
  private async executeFallbacks(
    fallbacks: FallbackOption[],
    errorInfo: ErrorInfo
  ): Promise<RecoveryResult> {
    // Filter fallbacks based on online status
    const availableFallbacks = fallbacks.filter(
      (fallback) => !fallback.requiresOnline || this.offlineManager.isOnline()
    );

    // Sort by priority
    availableFallbacks.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const fallback of availableFallbacks) {
      try {
        await fallback.action();
        return {
          success: true,
          fallbackUsed: fallback.id,
        };
      } catch (fallbackError) {
        console.warn(`Fallback ${fallback.id} failed:`, fallbackError);
        continue;
      }
    }

    return { success: false };
  }

  /**
   * Get fallback options for a component and error type
   */
  private getFallbackOptions(
    component: string,
    errorInfo: ErrorInfo
  ): FallbackOption[] {
    const componentFallbacks = this.recoveryStrategies.get(component) || [];
    const defaultFallbacks = this.getDefaultFallbacks(errorInfo);

    return [...componentFallbacks, ...defaultFallbacks];
  }

  /**
   * Get default fallback options based on error type
   */
  private getDefaultFallbacks(errorInfo: ErrorInfo): FallbackOption[] {
    const fallbacks: FallbackOption[] = [];

    // Add refresh page fallback for critical errors
    if (errorInfo.severity === "high") {
      fallbacks.push({
        id: "refresh_page",
        title: "Refresh Page",
        description: "Reload the page to reset the application state",
        action: () => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        },
        priority: "low",
        requiresOnline: false,
      });
    }

    // Add retry fallback for retryable errors
    if (errorInfo.retryable) {
      fallbacks.push({
        id: "generic_retry",
        title: "Try Again",
        description: "Retry the last action",
        action: () => Promise.resolve(),
        priority: "normal",
        requiresOnline: true,
      });
    }

    return fallbacks;
  }

  /**
   * Initialize default recovery strategies for common components
   */
  private initializeDefaultStrategies(): void {
    // Reception Dashboard fallbacks
    this.registerFallbackStrategies("ReceptionDashboard", [
      {
        id: "cache_order",
        title: "Save Order Locally",
        description: "Save the order locally and sync when online",
        action: async () => {
          // This would cache the order data locally
          console.log("Caching order locally");
        },
        priority: "high",
        requiresOnline: false,
      },
      {
        id: "manual_order_entry",
        title: "Manual Order Entry",
        description: "Switch to manual order entry mode",
        action: async () => {
          // This would enable a simplified order entry mode
          console.log("Switching to manual order entry");
        },
        priority: "normal",
        requiresOnline: false,
      },
    ]);

    // Kitchen Dashboard fallbacks
    this.registerFallbackStrategies("KitchenDashboard", [
      {
        id: "offline_order_tracking",
        title: "Offline Order Tracking",
        description: "Continue tracking orders offline",
        action: async () => {
          console.log("Enabling offline order tracking");
        },
        priority: "high",
        requiresOnline: false,
      },
      {
        id: "manual_inventory_log",
        title: "Manual Inventory Log",
        description: "Log inventory changes manually",
        action: async () => {
          console.log("Switching to manual inventory logging");
        },
        priority: "normal",
        requiresOnline: false,
      },
    ]);

    // Bar Dashboard fallbacks
    this.registerFallbackStrategies("BarDashboard", [
      {
        id: "offline_drink_tracking",
        title: "Offline Drink Tracking",
        description: "Track drink orders offline",
        action: async () => {
          console.log("Enabling offline drink tracking");
        },
        priority: "high",
        requiresOnline: false,
      },
    ]);

    // Accountant Dashboard fallbacks
    this.registerFallbackStrategies("AccountantDashboard", [
      {
        id: "readonly_mode",
        title: "Read-Only Mode",
        description: "Switch to read-only mode for viewing data",
        action: async () => {
          console.log("Switching to read-only mode");
        },
        priority: "normal",
        requiresOnline: false,
      },
      {
        id: "export_current_data",
        title: "Export Current Data",
        description: "Export currently loaded data for offline analysis",
        action: async () => {
          console.log("Exporting current data");
        },
        priority: "low",
        requiresOnline: false,
      },
    ]);
  }
}

/**
 * React hook for using error recovery service
 */
export function useErrorRecovery() {
  const service = ErrorRecoveryService.getInstance();

  const recoverFromError = React.useCallback(
    (
      error: Error | unknown,
      context: RecoveryContext,
      customFallbacks?: FallbackOption[]
    ) => {
      return service.recoverFromError(error, context, customFallbacks);
    },
    []
  );

  const queueAction = React.useCallback(
    (
      actionType: string,
      payload: any,
      priority?: "low" | "normal" | "high" | "critical"
    ) => {
      return service.queueForOfflineExecution(actionType, payload, priority);
    },
    []
  );

  const getStatus = React.useCallback(() => {
    return service.getRecoveryStatus();
  }, []);

  const forceSync = React.useCallback(() => {
    return service.forceSyncPendingActions();
  }, []);

  return {
    recoverFromError,
    queueAction,
    getStatus,
    forceSync,
    registerFallbacks: service.registerFallbackStrategies.bind(service),
  };
}

// React import for the hook
import React from "react";
