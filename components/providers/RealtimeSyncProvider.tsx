"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useRealtimeSync,
  type UseRealtimeSyncOptions,
} from "@/hooks/use-realtime-sync";
import type { DashboardEvent } from "@/lib/realtime-sync-manager";
import type { StaffRole } from "@/types/staff.d";

interface RealtimeSyncContextValue {
  isConnected: boolean;
  isOnline: boolean;
  reconnectAttempts: number;
  queueSize: number;
  lastEvent?: DashboardEvent;
  error?: string;
  subscribe: (
    eventType: string,
    handler: (event: DashboardEvent) => void
  ) => void;
  unsubscribe: (
    eventType: string,
    handler: (event: DashboardEvent) => void
  ) => void;
  queueAction: (type: string, payload: any, maxRetries?: number) => void;
  clearError: () => void;
  // Global notifications
  notifications: DashboardEvent[];
  addNotification: (event: DashboardEvent) => void;
  removeNotification: (eventId: string) => void;
  clearNotifications: () => void;
}

const RealtimeSyncContext = createContext<RealtimeSyncContextValue | null>(
  null
);

interface RealtimeSyncProviderProps {
  children: React.ReactNode;
  staffId: string;
  businessId: string;
  role: StaffRole;
  dashboardType: "reception" | "kitchen" | "bar" | "accountant";
  onError?: (error: Error, context: string) => void;
}

/**
 * Provider component for real-time synchronization
 * Manages global sync state and notifications across the application
 */
export function RealtimeSyncProvider({
  children,
  staffId,
  businessId,
  role,
  dashboardType,
  onError,
}: RealtimeSyncProviderProps) {
  const [notifications, setNotifications] = useState<DashboardEvent[]>([]);

  const syncOptions: UseRealtimeSyncOptions = {
    staffId,
    businessId,
    role,
    dashboardType,
    onError,
  };

  const sync = useRealtimeSync(syncOptions);

  // Auto-add high priority events as notifications
  useEffect(() => {
    if (
      sync.lastEvent &&
      (sync.lastEvent.priority === "high" ||
        sync.lastEvent.priority === "urgent")
    ) {
      addNotification(sync.lastEvent);
    }
  }, [sync.lastEvent]);

  const addNotification = (event: DashboardEvent) => {
    setNotifications((prev) => {
      // Avoid duplicates
      const exists = prev.some(
        (n) =>
          n.type === event.type &&
          n.payload.id === event.payload.id &&
          n.timestamp === event.timestamp
      );

      if (!exists) {
        return [event, ...prev.slice(0, 9)]; // Keep max 10 notifications
      }
      return prev;
    });
  };

  const removeNotification = (eventId: string) => {
    setNotifications((prev) => prev.filter((n) => n.payload.id !== eventId));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const contextValue: RealtimeSyncContextValue = {
    ...sync,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };

  return (
    <RealtimeSyncContext.Provider value={contextValue}>
      {children}
    </RealtimeSyncContext.Provider>
  );
}

/**
 * Hook to access the realtime sync context
 */
export function useRealtimeSyncContext() {
  const context = useContext(RealtimeSyncContext);
  if (!context) {
    throw new Error(
      "useRealtimeSyncContext must be used within a RealtimeSyncProvider"
    );
  }
  return context;
}

/**
 * Component to display connection status
 */
export function ConnectionStatus() {
  const { isConnected, isOnline, reconnectAttempts, queueSize, error } =
    useRealtimeSyncContext();

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span>Connection Error: {error}</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-200 rounded-md text-orange-700 text-sm">
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        <span>Offline {queueSize > 0 && `(${queueSize} queued)`}</span>
      </div>
    );
  }

  if (!isConnected && reconnectAttempts > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span>Reconnecting... (attempt {reconnectAttempts})</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Connected</span>
      </div>
    );
  }

  return null;
}

/**
 * Component to display real-time notifications
 */
export function RealtimeNotifications() {
  const { notifications, removeNotification, clearNotifications } =
    useRealtimeSyncContext();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification, index) => (
        <NotificationCard
          key={`${notification.timestamp}-${index}`}
          event={notification}
          onDismiss={() => removeNotification(notification.payload.id)}
        />
      ))}

      {notifications.length > 1 && (
        <button
          onClick={clearNotifications}
          className="w-full px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
        >
          Clear All ({notifications.length})
        </button>
      )}
    </div>
  );
}

/**
 * Individual notification card component
 */
function NotificationCard({
  event,
  onDismiss,
}: {
  event: DashboardEvent;
  onDismiss: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    // Auto-dismiss after 5 seconds for normal priority, 10 seconds for high/urgent
    const timeout = setTimeout(
      () => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow fade out animation
      },
      event.priority === "high" || event.priority === "urgent" ? 10000 : 5000
    );

    return () => clearTimeout(timeout);
  }, [event.priority, onDismiss]);

  const getNotificationStyle = () => {
    switch (event.priority) {
      case "urgent":
        return "bg-red-50 border-red-200 text-red-800";
      case "high":
        return "bg-orange-50 border-orange-200 text-orange-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getNotificationTitle = () => {
    switch (event.type) {
      case "order_created":
        return "New Order";
      case "order_updated":
        return "Order Updated";
      case "inventory_changed":
        return "Inventory Alert";
      case "table_assigned":
        return "Table Assigned";
      case "table_updated":
        return "Table Updated";
      case "request_approved":
        return "Request Approved";
      case "request_denied":
        return "Request Denied";
      case "payment_processed":
        return "Payment Processed";
      default:
        return "Notification";
    }
  };

  const getNotificationMessage = () => {
    switch (event.type) {
      case "order_created":
        return `Order #${event.payload.invoice_no} created`;
      case "order_updated":
        return `Order #${event.payload.invoice_no} status: ${event.payload.status}`;
      case "inventory_changed":
        return `${event.payload.name} stock updated`;
      case "table_assigned":
        return `Table ${event.payload.table_number} assigned`;
      case "request_approved":
        return `Inventory request approved`;
      case "request_denied":
        return `Inventory request denied`;
      case "payment_processed":
        return `Payment of $${event.payload.amount} processed`;
      default:
        return "Update received";
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }
        ${getNotificationStyle()}
        border rounded-lg p-4 shadow-lg max-w-sm
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm">{getNotificationTitle()}</h4>
          <p className="text-sm mt-1 opacity-90">{getNotificationMessage()}</p>
          <p className="text-xs mt-2 opacity-70">
            {new Date(event.timestamp).toLocaleTimeString()}
          </p>
        </div>

        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
