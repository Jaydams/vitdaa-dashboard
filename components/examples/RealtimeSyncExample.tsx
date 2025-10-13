"use client";

import React from "react";
import {
  RealtimeSyncProvider,
  ConnectionStatus,
  RealtimeNotifications,
} from "@/components/providers/RealtimeSyncProvider";
import { useOrderSync, useInventorySync } from "@/hooks/use-realtime-sync";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import type { StaffRole } from "@/types/staff.d";

interface RealtimeSyncExampleProps {
  staffId: string;
  businessId: string;
  role: StaffRole;
  dashboardType: "reception" | "kitchen" | "bar" | "accountant";
}

/**
 * Example component demonstrating real-time synchronization usage
 */
export function RealtimeSyncExample({
  staffId,
  businessId,
  role,
  dashboardType,
}: RealtimeSyncExampleProps) {
  return (
    <RealtimeSyncProvider
      staffId={staffId}
      businessId={businessId}
      role={role}
      dashboardType={dashboardType}
      onError={(error, context) => {
        console.error(`Real-time sync error [${context}]:`, error);
      }}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Real-time Dashboard</h1>
          <ConnectionStatus />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OrderSyncExample />
          <InventorySyncExample />
        </div>

        <NotificationExample staffId={staffId} businessId={businessId} />
      </div>

      {/* Global notifications */}
      <RealtimeNotifications />
    </RealtimeSyncProvider>
  );
}

/**
 * Example component showing order synchronization
 */
function OrderSyncExample() {
  const orderSync = useOrderSync({
    staffId: "example-staff-id",
    businessId: "example-business-id",
    role: "reception",
    dashboardType: "reception",
  });

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h2 className="text-lg font-semibold mb-4">Order Sync</h2>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Connection Status:</span>
          <span
            className={
              orderSync.isConnected ? "text-green-600" : "text-red-600"
            }
          >
            {orderSync.isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Orders Count:</span>
          <span>{orderSync.orders.length}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Recent Updates:</span>
          <span>{orderSync.orderUpdates.length}</span>
        </div>
      </div>

      {orderSync.orderUpdates.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Recent Order Updates:</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {orderSync.orderUpdates.slice(0, 5).map((update, index) => (
              <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                <div className="font-medium">{update.type}</div>
                <div className="text-gray-600">
                  Order #{update.payload.invoice_no} - {update.payload.status}
                </div>
                <div className="text-gray-500">
                  {new Date(update.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example component showing inventory synchronization
 */
function InventorySyncExample() {
  const inventorySync = useInventorySync({
    staffId: "example-staff-id",
    businessId: "example-business-id",
    role: "kitchen",
    dashboardType: "kitchen",
  });

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h2 className="text-lg font-semibold mb-4">Inventory Sync</h2>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Connection Status:</span>
          <span
            className={
              inventorySync.isConnected ? "text-green-600" : "text-red-600"
            }
          >
            {inventorySync.isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Inventory Items:</span>
          <span>{inventorySync.inventory.length}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Low Stock Alerts:</span>
          <span
            className={
              inventorySync.lowStockAlerts.length > 0
                ? "text-red-600"
                : "text-green-600"
            }
          >
            {inventorySync.lowStockAlerts.length}
          </span>
        </div>
      </div>

      {inventorySync.lowStockAlerts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Low Stock Alerts:</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {inventorySync.lowStockAlerts.map((alert, index) => (
              <div
                key={index}
                className="text-xs p-2 bg-red-50 rounded border border-red-200"
              >
                <div className="font-medium text-red-800">{alert.name}</div>
                <div className="text-red-600">
                  Stock: {alert.current_stock} / Min: {alert.minimum_stock}
                </div>
                <button
                  onClick={() => inventorySync.clearLowStockAlert(alert.id)}
                  className="text-red-500 hover:text-red-700 text-xs mt-1"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example component showing notification management
 */
function NotificationExample({
  staffId,
  businessId,
}: {
  staffId: string;
  businessId: string;
}) {
  const notifications = useRealtimeNotifications({
    businessId,
    staffId,
    autoFetch: true,
    maxNotifications: 10,
  });

  const handleSendTestNotification = async () => {
    await notifications.sendNotification({
      type: "system",
      title: "Test Notification",
      message: "This is a test notification from the real-time sync system",
      priority: "normal",
      targetRoles: ["reception"],
    });
  };

  const handleBroadcastAlert = async () => {
    await notifications.broadcastNotification({
      type: "alert",
      title: "System Alert",
      message: "This is a system-wide alert notification",
      priority: "high",
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h2 className="text-lg font-semibold mb-4">Notifications</h2>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm">Unread Count:</span>
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
            {notifications.unreadCount}
          </span>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSendTestNotification}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Send Test Notification
          </button>

          <button
            onClick={handleBroadcastAlert}
            className="w-full px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Broadcast Alert
          </button>

          {notifications.unreadCount > 0 && (
            <button
              onClick={() => notifications.markAsRead()}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {notifications.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            Error: {notifications.error}
            <button
              onClick={notifications.clearError}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {notifications.notifications.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Recent Notifications:</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {notifications.notifications
                .slice(0, 5)
                .map((notification: any, index: number) => (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded border ${
                      notification.is_read
                        ? "bg-gray-50 border-gray-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="font-medium">
                      {notification.notification?.title}
                    </div>
                    <div className="text-gray-600">
                      {notification.notification?.message}
                    </div>
                    <div className="text-gray-500 mt-1">
                      {new Date(notification.delivered_at).toLocaleTimeString()}
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() =>
                          notifications.markAsRead([
                            notification.notification_id,
                          ])
                        }
                        className="text-blue-500 hover:text-blue-700 text-xs mt-1"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RealtimeSyncExample;
