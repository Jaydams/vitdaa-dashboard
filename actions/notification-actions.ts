"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { revalidatePath } from "next/cache";
import { Notification, NotificationUnion } from "@/types/notifications";

export async function createNotification(notificationData: {
  business_id: string;
  user_id?: string;
  staff_id?: string;
  type: Notification['type'];
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: Notification['priority'];
  expires_at?: string;
}) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        ...notificationData,
        business_id: businessOwnerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      throw new Error("Failed to create notification");
    }

    revalidatePath("/");
    return notification as Notification;
  } catch (error) {
    console.error("Error in createNotification:", error);
    throw error;
  }
}

export async function fetchNotifications({
  limit = 50,
  offset = 0,
  unreadOnly = false,
  type,
}: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: Notification['type'];
} = {}) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("business_id", businessOwnerId)
      .order("created_at", { ascending: false });

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data: notifications, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching notifications:", error);
      throw new Error("Failed to fetch notifications");
    }

    return notifications as Notification[];
  } catch (error) {
    console.error("Error in fetchNotifications:", error);
    throw error;
  }
}

export async function getUnreadNotificationCount() {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessOwnerId)
      .eq("is_read", false);

    if (error) {
      console.error("Error getting unread notification count:", error);
      throw new Error("Failed to get unread notification count");
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getUnreadNotificationCount:", error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    const { error } = await supabase
      .from("notifications")
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", notificationId)
      .eq("business_id", businessOwnerId);

    if (error) {
      console.error("Error marking notification as read:", error);
      throw new Error("Failed to mark notification as read");
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    throw error;
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    const { error } = await supabase
      .from("notifications")
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq("business_id", businessOwnerId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      throw new Error("Failed to mark all notifications as read");
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead:", error);
    throw error;
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("business_id", businessOwnerId);

    if (error) {
      console.error("Error deleting notification:", error);
      throw new Error("Failed to delete notification");
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    throw error;
  }
}

export async function createOrderNotification(orderData: {
  order_id: string;
  invoice_no: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: string;
  dining_option: string;
  table_id?: string;
  customer_address?: string;
}) {
  try {
    const notification = await createNotification({
      business_id: "", // Will be set by the function
      type: "new_order",
      title: "New Order Received",
      message: `New order #${orderData.invoice_no} from ${orderData.customer_name}`,
      data: orderData,
      priority: "high",
    });

    return notification;
  } catch (error) {
    console.error("Error creating order notification:", error);
    // Don't throw error to prevent breaking the order flow
    return null;
  }
}

export async function createOrderStatusChangeNotification(orderData: {
  order_id: string;
  invoice_no: string;
  previous_status: string;
  new_status: string;
  customer_name: string;
}) {
  try {
    const notification = await createNotification({
      business_id: "", // Will be set by the function
      type: "order_status_change",
      title: "Order Status Updated",
      message: `Order #${orderData.invoice_no} status changed from ${orderData.previous_status} to ${orderData.new_status}`,
      data: orderData,
      priority: "normal",
    });

    return notification;
  } catch (error) {
    console.error("Error creating order status change notification:", error);
    throw error;
  }
}
