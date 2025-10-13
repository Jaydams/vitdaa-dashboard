import { useEffect, useRef, useState, useCallback } from "react";
import {
  RealTimeSyncManager,
  type DashboardEvent,
  type SubscriptionConfig,
} from "@/lib/realtime-sync-manager";
import type { StaffRole } from "@/types/staff.d";

export interface UseRealtimeSyncOptions {
  staffId: string;
  businessId: string;
  role: StaffRole;
  dashboardType: "reception" | "kitchen" | "bar" | "accountant";
  onError?: (error: Error, context: string) => void;
}

interface RealtimeSyncState {
  isConnected: boolean;
  isOnline: boolean;
  reconnectAttempts: number;
  queueSize: number;
  lastEvent?: DashboardEvent;
  error?: string;
}

/**
 * React hook for managing real-time synchronization in staff dashboards
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions) {
  const syncManagerRef = useRef<RealTimeSyncManager | null>(null);
  const [state, setState] = useState<RealtimeSyncState>({
    isConnected: false,
    isOnline: true,
    reconnectAttempts: 0,
    queueSize: 0,
  });

  // Event handlers map
  const eventHandlersRef = useRef<
    Map<string, ((event: DashboardEvent) => void)[]>
  >(new Map());

  /**
   * Initialize the sync manager
   */
  useEffect(() => {
    const config: SubscriptionConfig = {
      staffId: options.staffId,
      businessId: options.businessId,
      role: options.role,
      dashboardType: options.dashboardType,
    };

    const handleError = (error: Error, context: string) => {
      setState((prev) => ({ ...prev, error: error.message }));
      options.onError?.(error, context);
    };

    syncManagerRef.current = new RealTimeSyncManager(config, handleError);

    // Set up status monitoring
    const statusInterval = setInterval(() => {
      if (syncManagerRef.current) {
        const status = syncManagerRef.current.getStatus();
        setState((prev) => ({
          ...prev,
          isOnline: status.isOnline,
          reconnectAttempts: status.reconnectAttempts,
          queueSize: status.queueSize,
          isConnected: status.isOnline && status.reconnectAttempts === 0,
        }));
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(statusInterval);
      if (syncManagerRef.current) {
        syncManagerRef.current.destroy();
        syncManagerRef.current = null;
      }
    };
  }, [
    options.staffId,
    options.businessId,
    options.role,
    options.dashboardType,
  ]);

  /**
   * Subscribe to specific event types
   */
  const subscribe = useCallback(
    (eventType: string, handler: (event: DashboardEvent) => void) => {
      if (!syncManagerRef.current) return;

      // Add to local handlers map
      if (!eventHandlersRef.current.has(eventType)) {
        eventHandlersRef.current.set(eventType, []);
      }
      eventHandlersRef.current.get(eventType)!.push(handler);

      // Register with sync manager
      syncManagerRef.current.on(eventType, (event) => {
        setState((prev) => ({ ...prev, lastEvent: event }));
        handler(event);
      });
    },
    []
  );

  /**
   * Unsubscribe from event types
   */
  const unsubscribe = useCallback(
    (eventType: string, handler: (event: DashboardEvent) => void) => {
      if (!syncManagerRef.current) return;

      // Remove from local handlers map
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }

      // Unregister from sync manager
      syncManagerRef.current.off(eventType, handler);
    },
    []
  );

  /**
   * Queue an action for offline processing
   */
  const queueAction = useCallback(
    (type: string, payload: any, maxRetries: number = 3) => {
      if (!syncManagerRef.current) return;

      syncManagerRef.current.queueAction({
        type,
        payload,
        max_retries: maxRetries,
        staff_id: options.staffId,
        business_id: options.businessId,
      });
    },
    [options.staffId, options.businessId]
  );

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: undefined }));
  }, []);

  return {
    // State
    isConnected: state.isConnected,
    isOnline: state.isOnline,
    reconnectAttempts: state.reconnectAttempts,
    queueSize: state.queueSize,
    lastEvent: state.lastEvent,
    error: state.error,

    // Methods
    subscribe,
    unsubscribe,
    queueAction,
    clearError,
  };
}

/**
 * Hook for subscribing to specific order events
 */
export function useOrderSync(options: UseRealtimeSyncOptions) {
  const sync = useRealtimeSync(options);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderUpdates, setOrderUpdates] = useState<DashboardEvent[]>([]);

  useEffect(() => {
    const handleOrderEvent = (event: DashboardEvent) => {
      if (event.type === "order_created" || event.type === "order_updated") {
        setOrderUpdates((prev) => [event, ...prev.slice(0, 9)]); // Keep last 10 updates

        // Update orders list
        setOrders((prev) => {
          const existingIndex = prev.findIndex(
            (order) => order.id === event.payload.id
          );
          if (existingIndex >= 0) {
            // Update existing order
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...event.payload,
            };
            return updated;
          } else if (event.type === "order_created") {
            // Add new order
            return [event.payload, ...prev];
          }
          return prev;
        });
      }
    };

    sync.subscribe("order_created", handleOrderEvent);
    sync.subscribe("order_updated", handleOrderEvent);

    return () => {
      sync.unsubscribe("order_created", handleOrderEvent);
      sync.unsubscribe("order_updated", handleOrderEvent);
    };
  }, [sync]);

  return {
    ...sync,
    orders,
    orderUpdates,
    setOrders, // Allow manual order list management
  };
}

/**
 * Hook for subscribing to inventory events
 */
export function useInventorySync(options: UseRealtimeSyncOptions) {
  const sync = useRealtimeSync(options);
  const [inventory, setInventory] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);

  useEffect(() => {
    const handleInventoryEvent = (event: DashboardEvent) => {
      if (event.type === "inventory_changed") {
        // Update inventory list
        setInventory((prev) => {
          const existingIndex = prev.findIndex(
            (item) => item.id === event.payload.id
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...event.payload,
            };
            return updated;
          }
          return prev;
        });

        // Check for low stock alerts
        if (event.priority === "high" || event.priority === "urgent") {
          setLowStockAlerts((prev) => {
            const exists = prev.some((alert) => alert.id === event.payload.id);
            if (!exists) {
              return [event.payload, ...prev];
            }
            return prev;
          });
        }
      }
    };

    sync.subscribe("inventory_changed", handleInventoryEvent);

    return () => {
      sync.unsubscribe("inventory_changed", handleInventoryEvent);
    };
  }, [sync]);

  return {
    ...sync,
    inventory,
    lowStockAlerts,
    setInventory,
    clearLowStockAlert: (itemId: string) => {
      setLowStockAlerts((prev) => prev.filter((alert) => alert.id !== itemId));
    },
  };
}

/**
 * Hook for subscribing to table events
 */
export function useTableSync(options: UseRealtimeSyncOptions) {
  const sync = useRealtimeSync(options);
  const [tables, setTables] = useState<any[]>([]);
  const [tableUpdates, setTableUpdates] = useState<DashboardEvent[]>([]);

  useEffect(() => {
    const handleTableEvent = (event: DashboardEvent) => {
      if (event.type === "table_assigned" || event.type === "table_updated") {
        setTableUpdates((prev) => [event, ...prev.slice(0, 9)]);

        // Update tables list
        setTables((prev) => {
          const existingIndex = prev.findIndex(
            (table) => table.id === event.payload.id
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...event.payload,
            };
            return updated;
          }
          return prev;
        });
      }
    };

    sync.subscribe("table_assigned", handleTableEvent);
    sync.subscribe("table_updated", handleTableEvent);

    return () => {
      sync.unsubscribe("table_assigned", handleTableEvent);
      sync.unsubscribe("table_updated", handleTableEvent);
    };
  }, [sync]);

  return {
    ...sync,
    tables,
    tableUpdates,
    setTables,
  };
}

/**
 * Hook for subscribing to payment events
 */
export function usePaymentSync(options: UseRealtimeSyncOptions) {
  const sync = useRealtimeSync(options);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentNotifications, setPaymentNotifications] = useState<
    DashboardEvent[]
  >([]);

  useEffect(() => {
    const handlePaymentEvent = (event: DashboardEvent) => {
      if (event.type === "payment_processed") {
        setPaymentNotifications((prev) => [event, ...prev.slice(0, 4)]); // Keep last 5 notifications

        // Update payments list
        setPayments((prev) => {
          const existingIndex = prev.findIndex(
            (payment) => payment.id === event.payload.id
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...event.payload,
            };
            return updated;
          } else {
            return [event.payload, ...prev];
          }
        });
      }
    };

    sync.subscribe("payment_processed", handlePaymentEvent);

    return () => {
      sync.unsubscribe("payment_processed", handlePaymentEvent);
    };
  }, [sync]);

  return {
    ...sync,
    payments,
    paymentNotifications,
    setPayments,
    clearPaymentNotification: (paymentId: string) => {
      setPaymentNotifications((prev) =>
        prev.filter((notification) => notification.payload.id !== paymentId)
      );
    },
  };
}

/**
 * Hook for subscribing to inventory request events
 */
export function useInventoryRequestSync(options: UseRealtimeSyncOptions) {
  const sync = useRealtimeSync(options);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestNotifications, setRequestNotifications] = useState<
    DashboardEvent[]
  >([]);

  useEffect(() => {
    const handleRequestEvent = (event: DashboardEvent) => {
      if (
        event.type === "request_approved" ||
        event.type === "request_denied"
      ) {
        setRequestNotifications((prev) => [event, ...prev.slice(0, 4)]);

        // Update requests list
        setRequests((prev) => {
          const existingIndex = prev.findIndex(
            (request) => request.id === event.payload.id
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...event.payload,
            };
            return updated;
          }
          return prev;
        });
      }
    };

    sync.subscribe("request_approved", handleRequestEvent);
    sync.subscribe("request_denied", handleRequestEvent);

    return () => {
      sync.unsubscribe("request_approved", handleRequestEvent);
      sync.unsubscribe("request_denied", handleRequestEvent);
    };
  }, [sync]);

  return {
    ...sync,
    requests,
    requestNotifications,
    setRequests,
    clearRequestNotification: (requestId: string) => {
      setRequestNotifications((prev) =>
        prev.filter((notification) => notification.payload.id !== requestId)
      );
    },
  };
}
