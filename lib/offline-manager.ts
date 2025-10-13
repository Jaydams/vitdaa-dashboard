"use client";

import { NetworkMonitor } from "@/lib/error-handling";

export interface PendingAction {
  id: string;
  type: string;
  payload: any;
  priority: "low" | "normal" | "high" | "critical";
  maxRetries: number;
  currentRetries: number;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
  status: "pending" | "retrying" | "failed" | "completed";
}

export interface OfflineQueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  persistToStorage: boolean;
  autoSync: boolean;
}

const DEFAULT_CONFIG: OfflineQueueConfig = {
  maxQueueSize: 100,
  maxRetries: 3,
  retryDelay: 5000,
  persistToStorage: true,
  autoSync: true,
};

/**
 * Manages offline actions and synchronization for staff dashboards
 */
export class OfflineManager {
  private static instance: OfflineManager;
  private config: OfflineQueueConfig;
  private queue: Map<string, PendingAction> = new Map();
  private networkMonitor: NetworkMonitor;
  private syncInProgress = false;
  private syncListeners: Set<(isSyncing: boolean) => void> = new Set();
  private queueListeners: Set<(queue: PendingAction[]) => void> = new Set();
  private storageKey = "vitdaa_offline_queue";

  private constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.networkMonitor = NetworkMonitor.getInstance();

    // Load persisted queue
    if (this.config.persistToStorage) {
      this.loadPersistedQueue();
    }

    // Set up network monitoring
    this.networkMonitor.addListener(this.handleNetworkChange);

    // Set up periodic sync
    if (this.config.autoSync) {
      this.startPeriodicSync();
    }
  }

  static getInstance(config?: Partial<OfflineQueueConfig>): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager(config);
    }
    return OfflineManager.instance;
  }

  /**
   * Queue an action for offline execution
   */
  queueAction(
    action: Omit<
      PendingAction,
      "id" | "createdAt" | "currentRetries" | "status"
    >
  ): string {
    const id = this.generateActionId();
    const pendingAction: PendingAction = {
      id,
      ...action,
      createdAt: new Date().toISOString(),
      currentRetries: 0,
      status: "pending",
    };

    // Check queue size limit
    if (this.queue.size >= this.config.maxQueueSize) {
      this.removeOldestAction();
    }

    this.queue.set(id, pendingAction);
    this.persistQueue();
    this.notifyQueueListeners();

    // Try to sync immediately if online
    if (this.isOnline() && this.config.autoSync) {
      this.syncQueue();
    }

    return id;
  }

  /**
   * Remove an action from the queue
   */
  removeAction(actionId: string): boolean {
    const removed = this.queue.delete(actionId);
    if (removed) {
      this.persistQueue();
      this.notifyQueueListeners();
    }
    return removed;
  }

  /**
   * Get all pending actions
   */
  getPendingActions(): PendingAction[] {
    return Array.from(this.queue.values()).sort((a, b) => {
      // Sort by priority first, then by creation time
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Get action by ID
   */
  getAction(actionId: string): PendingAction | undefined {
    return this.queue.get(actionId);
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.networkMonitor.isOnline;
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }

  /**
   * Force sync all pending actions
   */
  async forcSync(): Promise<void> {
    if (!this.isOnline()) {
      throw new Error("Cannot sync while offline");
    }
    return this.syncQueue();
  }

  /**
   * Clear all pending actions
   */
  clearQueue(): void {
    this.queue.clear();
    this.persistQueue();
    this.notifyQueueListeners();
  }

  /**
   * Add listener for sync status changes
   */
  addSyncListener(listener: (isSyncing: boolean) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * Add listener for queue changes
   */
  addQueueListener(listener: (queue: PendingAction[]) => void): () => void {
    this.queueListeners.add(listener);
    return () => this.queueListeners.delete(listener);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OfflineQueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): OfflineQueueConfig {
    return { ...this.config };
  }

  /**
   * Handle network status changes
   */
  private handleNetworkChange = (isOnline: boolean): void => {
    if (isOnline && this.config.autoSync && this.queue.size > 0) {
      // Delay sync slightly to ensure connection is stable
      setTimeout(() => {
        this.syncQueue();
      }, 1000);
    }
  };

  /**
   * Sync all pending actions
   */
  private async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline() || this.queue.size === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifySyncListeners(true);

    try {
      const actions = this.getPendingActions();
      const syncPromises = actions.map((action) => this.syncAction(action));

      await Promise.allSettled(syncPromises);
    } catch (error) {
      console.error("Error during queue sync:", error);
    } finally {
      this.syncInProgress = false;
      this.notifySyncListeners(false);
    }
  }

  /**
   * Sync a single action
   */
  private async syncAction(action: PendingAction): Promise<void> {
    try {
      // Update action status
      action.status = "retrying";
      action.lastAttempt = new Date().toISOString();
      this.queue.set(action.id, action);

      // Execute the action based on type
      await this.executeAction(action);

      // Mark as completed and remove from queue
      action.status = "completed";
      this.removeAction(action.id);
    } catch (error) {
      action.currentRetries++;
      action.error = error instanceof Error ? error.message : String(error);

      if (action.currentRetries >= action.maxRetries) {
        action.status = "failed";
        console.error(
          `Action ${action.id} failed after ${action.maxRetries} attempts:`,
          error
        );
      } else {
        action.status = "pending";
        // Schedule retry
        setTimeout(() => {
          if (this.isOnline() && this.queue.has(action.id)) {
            this.syncAction(action);
          }
        }, this.config.retryDelay * action.currentRetries);
      }

      this.queue.set(action.id, action);
      this.persistQueue();
      this.notifyQueueListeners();
    }
  }

  /**
   * Execute an action based on its type
   */
  private async executeAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case "create_order":
        return this.executeCreateOrder(action.payload);

      case "update_order_status":
        return this.executeUpdateOrderStatus(action.payload);

      case "update_inventory":
        return this.executeUpdateInventory(action.payload);

      case "create_inventory_request":
        return this.executeCreateInventoryRequest(action.payload);

      case "process_payment":
        return this.executeProcessPayment(action.payload);

      case "assign_table":
        return this.executeAssignTable(action.payload);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute create order action
   */
  private async executeCreateOrder(payload: any): Promise<void> {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create order: ${response.statusText}`);
    }
  }

  /**
   * Execute update order status action
   */
  private async executeUpdateOrderStatus(payload: any): Promise<void> {
    const { orderId, status } = payload;
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update order status: ${response.statusText}`);
    }
  }

  /**
   * Execute update inventory action
   */
  private async executeUpdateInventory(payload: any): Promise<void> {
    const { itemId, quantity } = payload;
    const response = await fetch(`/api/inventory/items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update inventory: ${response.statusText}`);
    }
  }

  /**
   * Execute create inventory request action
   */
  private async executeCreateInventoryRequest(payload: any): Promise<void> {
    const response = await fetch("/api/inventory/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create inventory request: ${response.statusText}`
      );
    }
  }

  /**
   * Execute process payment action
   */
  private async executeProcessPayment(payload: any): Promise<void> {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to process payment: ${response.statusText}`);
    }
  }

  /**
   * Execute assign table action
   */
  private async executeAssignTable(payload: any): Promise<void> {
    const { tableId, customerId } = payload;
    const response = await fetch(`/api/tables/${tableId}/assign`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to assign table: ${response.statusText}`);
    }
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Remove oldest action when queue is full
   */
  private removeOldestAction(): void {
    const actions = this.getPendingActions();
    if (actions.length > 0) {
      // Remove the oldest non-critical action
      const nonCritical = actions.filter((a) => a.priority !== "critical");
      const toRemove =
        nonCritical.length > 0
          ? nonCritical[nonCritical.length - 1]
          : actions[actions.length - 1];
      this.removeAction(toRemove.id);
    }
  }

  /**
   * Persist queue to local storage
   */
  private persistQueue(): void {
    if (!this.config.persistToStorage || typeof window === "undefined") {
      return;
    }

    try {
      const queueData = Array.from(this.queue.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(queueData));
    } catch (error) {
      console.warn("Failed to persist offline queue:", error);
    }
  }

  /**
   * Load persisted queue from local storage
   */
  private loadPersistedQueue(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const queueData: [string, PendingAction][] = JSON.parse(stored);
        this.queue = new Map(queueData);

        // Clean up old actions (older than 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const [id, action] of this.queue) {
          if (new Date(action.createdAt).getTime() < oneDayAgo) {
            this.queue.delete(id);
          }
        }

        this.persistQueue();
      }
    } catch (error) {
      console.warn("Failed to load persisted offline queue:", error);
      // Clear corrupted data
      localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.isOnline() && this.queue.size > 0 && !this.syncInProgress) {
        this.syncQueue();
      }
    }, 30000); // Sync every 30 seconds
  }

  /**
   * Notify sync listeners
   */
  private notifySyncListeners(isSyncing: boolean): void {
    this.syncListeners.forEach((listener) => listener(isSyncing));
  }

  /**
   * Notify queue listeners
   */
  private notifyQueueListeners(): void {
    const actions = this.getPendingActions();
    this.queueListeners.forEach((listener) => listener(actions));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.syncListeners.clear();
    this.queueListeners.clear();
    this.networkMonitor.cleanup();
  }
}

/**
 * React hook for using offline manager
 */
export function useOfflineManager() {
  const [isOnline, setIsOnline] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [pendingActions, setPendingActions] = React.useState<PendingAction[]>(
    []
  );

  React.useEffect(() => {
    const manager = OfflineManager.getInstance();

    // Set initial state
    setIsOnline(manager.isOnline());
    setIsSyncing(manager.isSyncing());
    setPendingActions(manager.getPendingActions());

    // Subscribe to changes
    const unsubscribeSync = manager.addSyncListener(setIsSyncing);
    const unsubscribeQueue = manager.addQueueListener(setPendingActions);
    const unsubscribeNetwork =
      manager["networkMonitor"].addListener(setIsOnline);

    return () => {
      unsubscribeSync();
      unsubscribeQueue();
      unsubscribeNetwork();
    };
  }, []);

  const queueAction = React.useCallback(
    (
      type: string,
      payload: any,
      priority: "low" | "normal" | "high" | "critical" = "normal",
      maxRetries: number = 3
    ) => {
      const manager = OfflineManager.getInstance();
      return manager.queueAction({ type, payload, priority, maxRetries });
    },
    []
  );

  const removeAction = React.useCallback((actionId: string) => {
    const manager = OfflineManager.getInstance();
    return manager.removeAction(actionId);
  }, []);

  const forceSync = React.useCallback(async () => {
    const manager = OfflineManager.getInstance();
    return manager.forcSync();
  }, []);

  const clearQueue = React.useCallback(() => {
    const manager = OfflineManager.getInstance();
    manager.clearQueue();
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingActions,
    queueAction,
    removeAction,
    forceSync,
    clearQueue,
  };
}

// React import for the hook
import React from "react";
