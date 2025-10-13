import { createClient } from "./supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Service for managing real-time notifications across staff dashboards
 */

export interface NotificationData {
  type:
    | "order"
    | "inventory"
    | "table"
    | "payment"
    | "request"
    | "alert"
    | "system";
  title: string;
  message: string;
  priority?: "low" | "normal" | "high" | "urgent";
  targetRoles?: string[];
  targetStaffIds?: string[];
  targetDashboards?: string[];
  data?: any;
  expiresAt?: string;
  actionRequired?: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  sound_enabled: boolean;
  popup_enabled: boolean;
  email_enabled: boolean;
  priority_filter: "low" | "normal" | "high" | "urgent";
  quiet_hours?: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

export class RealtimeNotificationService {
  private supabase: SupabaseClient;
  private businessId: string;
  private staffId: string;

  constructor(businessId: string, staffId: string) {
    this.supabase = createClient();
    this.businessId = businessId;
    this.staffId = staffId;
  }

  /**
   * Send a notification to specific staff members or roles
   */
  async sendNotification(
    notification: NotificationData
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const response = await fetch("/api/realtime/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId: this.businessId,
          notification,
          sendToAll: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error };
      }

      return { success: true, notificationId: result.notificationId };
    } catch (error) {
      console.error("Failed to send notification:", error);
      return { success: false, error: "Failed to send notification" };
    }
  }

  /**
   * Send a broadcast notification to all staff members
   */
  async broadcastNotification(
    notification: NotificationData
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const response = await fetch("/api/realtime/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId: this.businessId,
          notification,
          sendToAll: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error };
      }

      return { success: true, notificationId: result.notificationId };
    } catch (error) {
      console.error("Failed to broadcast notification:", error);
      return { success: false, error: "Failed to broadcast notification" };
    }
  }

  /**
   * Get notifications for the current staff member
   */
  async getNotifications(
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    success: boolean;
    notifications?: any[];
    unreadCount?: number;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (options.unreadOnly) params.append("unreadOnly", "true");
      if (options.limit) params.append("limit", options.limit.toString());
      if (options.offset) params.append("offset", options.offset.toString());

      const response = await fetch(
        `/api/realtime/notifications?${params.toString()}`
      );
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      };
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      return { success: false, error: "Failed to fetch notifications" };
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(
    notificationIds?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch("/api/realtime/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark_read",
          notificationIds,
          markAllAsRead: !notificationIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      return { success: false, error: "Failed to mark notifications as read" };
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  subscribeToNotifications(callback: (notification: any) => void): () => void {
    const channel = this.supabase
      .channel(`notifications:${this.staffId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_deliveries",
          filter: `staff_id=eq.${this.staffId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Get notification preferences for the current staff member
   */
  async getNotificationPreferences(): Promise<{
    success: boolean;
    preferences?: NotificationPreferences;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from("staff_dashboard_subscriptions")
        .select("notification_preferences")
        .eq("staff_id", this.staffId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        preferences: data?.notification_preferences || {
          sound_enabled: true,
          popup_enabled: true,
          email_enabled: false,
          priority_filter: "normal",
        },
      };
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error);
      return {
        success: false,
        error: "Failed to fetch notification preferences",
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    preferences: NotificationPreferences
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from("staff_dashboard_subscriptions")
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("staff_id", this.staffId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
      return {
        success: false,
        error: "Failed to update notification preferences",
      };
    }
  }

  // Convenience methods for common notification types

  /**
   * Send order-related notification
   */
  async notifyOrderUpdate(
    orderId: string,
    status: string,
    targetRoles: string[] = ["reception", "kitchen", "bar"]
  ): Promise<void> {
    await this.sendNotification({
      type: "order",
      title: "Order Updated",
      message: `Order #${orderId} status changed to ${status}`,
      priority: status === "ready" ? "high" : "normal",
      targetRoles,
      data: { orderId, status },
    });
  }

  /**
   * Send inventory alert notification
   */
  async notifyInventoryAlert(
    itemName: string,
    currentStock: number,
    minimumStock: number
  ): Promise<void> {
    const priority =
      currentStock === 0
        ? "urgent"
        : currentStock <= minimumStock * 0.5
        ? "high"
        : "normal";

    await this.sendNotification({
      type: "inventory",
      title: "Inventory Alert",
      message: `${itemName} is ${
        currentStock === 0 ? "out of stock" : "running low"
      } (${currentStock} remaining)`,
      priority,
      targetRoles: ["kitchen", "bar", "accountant"],
      data: { itemName, currentStock, minimumStock },
    });
  }

  /**
   * Send table assignment notification
   */
  async notifyTableAssignment(
    tableNumber: string,
    customerName: string
  ): Promise<void> {
    await this.sendNotification({
      type: "table",
      title: "Table Assigned",
      message: `Table ${tableNumber} assigned to ${customerName}`,
      priority: "normal",
      targetRoles: ["reception", "waiter"],
      data: { tableNumber, customerName },
    });
  }

  /**
   * Send payment notification
   */
  async notifyPaymentProcessed(
    orderId: string,
    amount: number,
    method: string
  ): Promise<void> {
    await this.sendNotification({
      type: "payment",
      title: "Payment Processed",
      message: `Payment of $${amount.toFixed(2)} received via ${method}`,
      priority: "normal",
      targetRoles: ["reception", "accountant"],
      data: { orderId, amount, method },
    });
  }

  /**
   * Send inventory request notification
   */
  async notifyInventoryRequest(
    requestId: string,
    status: "approved" | "denied",
    requesterName: string
  ): Promise<void> {
    await this.sendNotification({
      type: "request",
      title: `Request ${status}`,
      message: `Inventory request from ${requesterName} has been ${status}`,
      priority: "high",
      targetRoles: ["kitchen"],
      data: { requestId, status, requesterName },
    });
  }

  /**
   * Send system alert notification
   */
  async notifySystemAlert(
    title: string,
    message: string,
    priority: "low" | "normal" | "high" | "urgent" = "normal"
  ): Promise<void> {
    await this.broadcastNotification({
      type: "system",
      title,
      message,
      priority,
      data: { timestamp: new Date().toISOString() },
    });
  }
}

/**
 * Factory function to create notification service instance
 */
export function createNotificationService(
  businessId: string,
  staffId: string
): RealtimeNotificationService {
  return new RealtimeNotificationService(businessId, staffId);
}

/**
 * Hook for using notification service in React components
 */
export function useNotificationService(businessId: string, staffId: string) {
  const service = new RealtimeNotificationService(businessId, staffId);

  return {
    sendNotification: service.sendNotification.bind(service),
    broadcastNotification: service.broadcastNotification.bind(service),
    getNotifications: service.getNotifications.bind(service),
    markAsRead: service.markAsRead.bind(service),
    subscribeToNotifications: service.subscribeToNotifications.bind(service),
    getNotificationPreferences:
      service.getNotificationPreferences.bind(service),
    updateNotificationPreferences:
      service.updateNotificationPreferences.bind(service),

    // Convenience methods
    notifyOrderUpdate: service.notifyOrderUpdate.bind(service),
    notifyInventoryAlert: service.notifyInventoryAlert.bind(service),
    notifyTableAssignment: service.notifyTableAssignment.bind(service),
    notifyPaymentProcessed: service.notifyPaymentProcessed.bind(service),
    notifyInventoryRequest: service.notifyInventoryRequest.bind(service),
    notifySystemAlert: service.notifySystemAlert.bind(service),
  };
}
