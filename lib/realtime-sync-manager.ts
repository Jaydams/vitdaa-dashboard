import { createClient } from "./supabase/client";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Order, OrderStatus } from "@/types/order.d";
import type { Staff } from "@/types/staff.d";

// Event types for real-time synchronization
export interface DashboardEvent {
  type:
    | "order_updated"
    | "order_created"
    | "inventory_changed"
    | "table_assigned"
    | "table_updated"
    | "request_approved"
    | "request_denied"
    | "payment_processed"
    | "staff_activity"
    | "notification_sent";
  payload: any;
  timestamp: string;
  source_staff_id: string;
  business_id: string;
  target_dashboards: string[];
  priority: "low" | "normal" | "high" | "urgent";
}

// Conflict resolution types
export interface DataConflict {
  id: string;
  resource_type: string;
  resource_id: string;
  local_version: any;
  remote_version: any;
  timestamp: string;
  resolution_strategy: "local_wins" | "remote_wins" | "merge" | "manual";
}

// Offline action queue types
export interface PendingAction {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  retry_count: number;
  max_retries: number;
  staff_id: string;
  business_id: string;
}

// Subscription configuration
export interface SubscriptionConfig {
  staffId: string;
  businessId: string;
  role: string;
  dashboardType: "reception" | "kitchen" | "bar" | "accountant";
}

// Event handlers
export type EventHandler = (event: DashboardEvent) => void;
export type ConflictHandler = (conflict: DataConflict) => Promise<any>;
export type ErrorHandler = (error: Error, context: string) => void;

/**
 * Real-time synchronization manager for staff dashboards
 * Handles WebSocket connections, event broadcasting, conflict resolution, and offline queuing
 */
export class RealTimeSyncManager {
  private supabaseClient: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private conflictResolver: ConflictResolver;
  private offlineQueue: OfflineActionQueue;
  private isOnline: boolean = true;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(
    private config: SubscriptionConfig,
    private onError?: ErrorHandler
  ) {
    this.supabaseClient = createClient();
    this.conflictResolver = new ConflictResolver();
    this.offlineQueue = new OfflineActionQueue();

    // Monitor online/offline status
    this.setupNetworkMonitoring();

    // Initialize real-time subscriptions
    this.initializeSubscriptions();
  }

  /**
   * Initialize real-time subscriptions based on staff role and dashboard type
   */
  private async initializeSubscriptions(): Promise<void> {
    try {
      // Subscribe to order updates (all roles need this)
      await this.subscribeToOrders();

      // Subscribe to inventory updates (kitchen, bar, admin)
      if (["kitchen", "bar", "accountant"].includes(this.config.role)) {
        await this.subscribeToInventory();
      }

      // Subscribe to table updates (reception, waiter)
      if (["reception", "waiter"].includes(this.config.role)) {
        await this.subscribeToTables();
      }

      // Subscribe to payment updates (reception, accountant)
      if (["reception", "accountant"].includes(this.config.role)) {
        await this.subscribeToPayments();
      }

      // Subscribe to inventory requests (kitchen, admin)
      if (["kitchen", "accountant"].includes(this.config.role)) {
        await this.subscribeToInventoryRequests();
      }

      // Subscribe to staff activity (all roles for notifications)
      await this.subscribeToStaffActivity();
    } catch (error) {
      this.handleError(error as Error, "initializeSubscriptions");
    }
  }

  /**
   * Subscribe to order updates
   */
  private async subscribeToOrders(): Promise<void> {
    const channel = this.supabaseClient
      .channel(`orders:${this.config.businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${this.config.businessId}`,
        },
        (payload) => {
          this.handleOrderUpdate(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `order_id=in.(select id from orders where business_id='${this.config.businessId}')`,
        },
        (payload) => {
          this.handleOrderItemUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set("orders", channel);
  }

  /**
   * Subscribe to inventory updates
   */
  private async subscribeToInventory(): Promise<void> {
    const channel = this.supabaseClient
      .channel(`inventory:${this.config.businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_items",
          filter: `business_id=eq.${this.config.businessId}`,
        },
        (payload) => {
          this.handleInventoryUpdate(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_transactions",
          filter: `business_id=eq.${this.config.businessId}`,
        },
        (payload) => {
          this.handleInventoryTransactionUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set("inventory", channel);
  }

  /**
   * Subscribe to table updates
   */
  private async subscribeToTables(): Promise<void> {
    const channel = this.supabaseClient
      .channel(`tables:${this.config.businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
          filter: `business_id=eq.${this.config.businessId}`,
        },
        (payload) => {
          this.handleTableUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set("tables", channel);
  }

  /**
   * Subscribe to payment updates
   */
  private async subscribeToPayments(): Promise<void> {
    const channel = this.supabaseClient
      .channel(`payments:${this.config.businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `order_id=in.(select id from orders where business_id='${this.config.businessId}')`,
        },
        (payload) => {
          this.handlePaymentUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set("payments", channel);
  }

  /**
   * Subscribe to inventory request updates
   */
  private async subscribeToInventoryRequests(): Promise<void> {
    const channel = this.supabaseClient
      .channel(`inventory_requests:${this.config.businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_requests",
          filter: `business_id=eq.${this.config.businessId}`,
        },
        (payload) => {
          this.handleInventoryRequestUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set("inventory_requests", channel);
  }

  /**
   * Subscribe to staff activity updates
   */
  private async subscribeToStaffActivity(): Promise<void> {
    const channel = this.supabaseClient
      .channel(`staff_activity:${this.config.businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_activity_logs",
          filter: `business_id=eq.${this.config.businessId}`,
        },
        (payload) => {
          this.handleStaffActivityUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set("staff_activity", channel);
  }

  /**
   * Handle order updates and broadcast to relevant dashboards
   */
  private handleOrderUpdate(payload: any): void {
    const event: DashboardEvent = {
      type: payload.eventType === "INSERT" ? "order_created" : "order_updated",
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString(),
      source_staff_id: payload.new?.updated_by || "system",
      business_id: this.config.businessId,
      target_dashboards: this.getTargetDashboards(
        "order",
        payload.new || payload.old
      ),
      priority: this.getEventPriority("order", payload.new || payload.old),
    };

    this.broadcastEvent(event);
  }

  /**
   * Handle order item updates
   */
  private handleOrderItemUpdate(payload: any): void {
    const event: DashboardEvent = {
      type: "order_updated",
      payload: {
        type: "order_item",
        data: payload.new || payload.old,
      },
      timestamp: new Date().toISOString(),
      source_staff_id: payload.new?.updated_by || "system",
      business_id: this.config.businessId,
      target_dashboards: ["kitchen", "bar", "reception"],
      priority: "normal",
    };

    this.broadcastEvent(event);
  }

  /**
   * Handle inventory updates
   */
  private handleInventoryUpdate(payload: any): void {
    const event: DashboardEvent = {
      type: "inventory_changed",
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString(),
      source_staff_id: payload.new?.updated_by || "system",
      business_id: this.config.businessId,
      target_dashboards: ["kitchen", "bar", "accountant"],
      priority: this.getInventoryPriority(payload.new || payload.old),
    };

    this.broadcastEvent(event);
  }

  /**
   * Handle inventory transaction updates
   */
  private handleInventoryTransactionUpdate(payload: any): void {
    const event: DashboardEvent = {
      type: "inventory_changed",
      payload: {
        type: "transaction",
        data: payload.new || payload.old,
      },
      timestamp: new Date().toISOString(),
      source_staff_id: payload.new?.staff_id || "system",
      business_id: this.config.businessId,
      target_dashboards: ["kitchen", "bar", "accountant"],
      priority: "normal",
    };

    this.broadcastEvent(event);
  }

  /**
   * Handle table updates
   */
  private handleTableUpdate(payload: any): void {
    const event: DashboardEvent = {
      type: payload.eventType === "UPDATE" ? "table_updated" : "table_assigned",
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString(),
      source_staff_id: payload.new?.assigned_by || "system",
      business_id: this.config.businessId,
      target_dashboards: ["reception", "waiter"],
      priority: "normal",
    };

    this.broadcastEvent(event);
  }

  /**
   * Handle payment updates
   */
  private handlePaymentUpdate(payload: any): void {
    const event: DashboardEvent = {
      type: "payment_processed",
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString(),
      source_staff_id: payload.new?.processed_by || "system",
      business_id: this.config.businessId,
      target_dashboards: ["reception", "accountant"],
      priority: "high",
    };

    this.broadcastEvent(event);
  }

  /**
   * Handle inventory request updates
   */
  private handleInventoryRequestUpdate(payload: any): void {
    const isApproval = payload.new?.status !== payload.old?.status;
    const event: DashboardEvent = {
      type: isApproval ? "request_approved" : "inventory_changed",
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString(),
      source_staff_id:
        payload.new?.approved_by_admin_id ||
        payload.new?.requested_by_staff_id ||
        "system",
      business_id: this.config.businessId,
      target_dashboards: ["kitchen", "accountant"],
      priority: isApproval ? "high" : "normal",
    };

    this.broadcastEvent(event);
  }

  /**
   * Handle staff activity updates
   */
  private handleStaffActivityUpdate(payload: any): void {
    const event: DashboardEvent = {
      type: "staff_activity",
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString(),
      source_staff_id: payload.new?.staff_id || "system",
      business_id: this.config.businessId,
      target_dashboards: ["accountant"], // Only accountant sees all staff activity
      priority: "low",
    };

    this.broadcastEvent(event);
  }

  /**
   * Determine target dashboards based on event type and data
   */
  private getTargetDashboards(eventType: string, data: any): string[] {
    switch (eventType) {
      case "order":
        const dashboards = ["reception"];

        // Add kitchen if order has food items
        if (data.items?.some((item: any) => item.category !== "beverage")) {
          dashboards.push("kitchen");
        }

        // Add bar if order has beverage items
        if (data.items?.some((item: any) => item.category === "beverage")) {
          dashboards.push("bar");
        }

        // Add accountant for payment-related updates
        if (data.payment_method || data.status === "completed") {
          dashboards.push("accountant");
        }

        return dashboards;

      default:
        return ["reception", "kitchen", "bar", "accountant"];
    }
  }

  /**
   * Determine event priority based on type and data
   */
  private getEventPriority(
    eventType: string,
    data: any
  ): "low" | "normal" | "high" | "urgent" {
    if (eventType === "order") {
      if (data.status === "cancelled" || data.status === "ready") {
        return "high";
      }
      if (data.dining_option === "delivery" && data.status === "processing") {
        return "high";
      }
    }

    return "normal";
  }

  /**
   * Determine inventory priority based on stock levels
   */
  private getInventoryPriority(
    data: any
  ): "low" | "normal" | "high" | "urgent" {
    if (data.current_stock <= data.minimum_stock) {
      return data.current_stock === 0 ? "urgent" : "high";
    }
    return "normal";
  }

  /**
   * Broadcast event to registered handlers
   */
  private broadcastEvent(event: DashboardEvent): void {
    // Check if this dashboard should receive this event
    if (!event.target_dashboards.includes(this.config.dashboardType)) {
      return;
    }

    // Get handlers for this event type
    const handlers = this.eventHandlers.get(event.type) || [];
    const allHandlers = this.eventHandlers.get("*") || [];

    // Execute all handlers
    [...handlers, ...allHandlers].forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        this.handleError(error as Error, `broadcastEvent:${event.type}`);
      }
    });
  }

  /**
   * Register event handler
   */
  public on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  public off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Queue action for offline processing
   */
  public queueAction(
    action: Omit<PendingAction, "id" | "timestamp" | "retry_count">
  ): void {
    this.offlineQueue.add({
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      retry_count: 0,
    });
  }

  /**
   * Process offline queue when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    const actions = this.offlineQueue.getAll();

    for (const action of actions) {
      try {
        await this.executeAction(action);
        this.offlineQueue.remove(action.id);
      } catch (error) {
        action.retry_count++;
        if (action.retry_count >= action.max_retries) {
          this.offlineQueue.remove(action.id);
          this.handleError(
            error as Error,
            `processOfflineQueue:${action.type}`
          );
        }
      }
    }
  }

  /**
   * Execute a queued action
   */
  private async executeAction(action: PendingAction): Promise<void> {
    // Implementation depends on action type
    // This would typically make API calls to sync the action
    switch (action.type) {
      case "order_update":
        // Update order via API
        break;
      case "inventory_update":
        // Update inventory via API
        break;
      // Add more action types as needed
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Monitor online/offline status
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.reconnectAttempts = 0;
        this.processOfflineQueue();
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }

    // Monitor Supabase connection status through channel events
    // We'll monitor connection status through successful/failed subscriptions
  }

  /**
   * Attempt to reconnect to Supabase
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handleError(
        new Error("Max reconnection attempts reached"),
        "attemptReconnect"
      );
      return;
    }

    this.reconnectAttempts++;

    setTimeout(async () => {
      try {
        // Reinitialize subscriptions
        await this.initializeSubscriptions();
      } catch (error) {
        this.handleError(error as Error, "attemptReconnect");
        this.attemptReconnect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Handle errors
   */
  private handleError(error: Error, context: string): void {
    console.error(`RealTimeSyncManager Error [${context}]:`, error);

    if (this.onError) {
      this.onError(error, context);
    }
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    isOnline: boolean;
    reconnectAttempts: number;
    queueSize: number;
  } {
    return {
      isOnline: this.isOnline,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.offlineQueue.size(),
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Unsubscribe from all channels
    this.channels.forEach((channel) => {
      this.supabaseClient.removeChannel(channel);
    });
    this.channels.clear();

    // Clear event handlers
    this.eventHandlers.clear();

    // Clear offline queue
    this.offlineQueue.clear();
  }
}

/**
 * Conflict resolution manager
 */
class ConflictResolver {
  /**
   * Resolve data conflicts using various strategies
   */
  public async resolve(conflict: DataConflict): Promise<any> {
    switch (conflict.resolution_strategy) {
      case "local_wins":
        return conflict.local_version;

      case "remote_wins":
        return conflict.remote_version;

      case "merge":
        return this.mergeVersions(
          conflict.local_version,
          conflict.remote_version
        );

      case "manual":
        // This would typically show a UI for manual resolution
        throw new Error("Manual conflict resolution required");

      default:
        // Default to remote wins for safety
        return conflict.remote_version;
    }
  }

  /**
   * Merge two versions of data
   */
  private mergeVersions(local: any, remote: any): any {
    // Simple merge strategy - can be enhanced based on data type
    return {
      ...local,
      ...remote,
      // Keep local timestamp if it's newer
      updated_at:
        new Date(local.updated_at) > new Date(remote.updated_at)
          ? local.updated_at
          : remote.updated_at,
    };
  }
}

/**
 * Offline action queue manager
 */
class OfflineActionQueue {
  private queue: PendingAction[] = [];

  public add(action: PendingAction): void {
    this.queue.push(action);
    this.persistQueue();
  }

  public remove(actionId: string): void {
    this.queue = this.queue.filter((action) => action.id !== actionId);
    this.persistQueue();
  }

  public getAll(): PendingAction[] {
    return [...this.queue];
  }

  public size(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
    this.persistQueue();
  }

  /**
   * Persist queue to localStorage for recovery after page refresh
   */
  private persistQueue(): void {
    try {
      localStorage.setItem("offline_action_queue", JSON.stringify(this.queue));
    } catch (error) {
      console.warn("Failed to persist offline queue:", error);
    }
  }

  /**
   * Load queue from localStorage
   */
  public loadPersistedQueue(): void {
    try {
      const stored = localStorage.getItem("offline_action_queue");
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load persisted queue:", error);
      this.queue = [];
    }
  }
}
