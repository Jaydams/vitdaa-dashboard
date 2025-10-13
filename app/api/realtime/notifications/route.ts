import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerStaffId } from "@/lib/getServerStaffId";

/**
 * API endpoints for real-time notification broadcasting system
 * Handles sending notifications across different staff dashboards
 */

interface NotificationRequest {
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
  priority: "low" | "normal" | "high" | "urgent";
  targetRoles?: string[];
  targetStaffIds?: string[];
  targetDashboards?: string[];
  data?: any;
  expiresAt?: string;
  actionRequired?: boolean;
  actionUrl?: string;
}

interface BroadcastNotificationRequest {
  businessId: string;
  notification: NotificationRequest;
  sendToAll?: boolean;
}

/**
 * POST /api/realtime/notifications
 * Send real-time notifications to staff dashboards
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const staffId = await getServerStaffId();

    if (!staffId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get staff details and permissions
    const { data: staff } = await supabase
      .from("staff")
      .select("id, role, business_id, first_name, last_name")
      .eq("id", staffId)
      .single();

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const body: BroadcastNotificationRequest = await request.json();
    const { businessId, notification, sendToAll } = body;

    // Verify business access
    if (staff.business_id !== businessId) {
      return NextResponse.json(
        { error: "Access denied to this business" },
        { status: 403 }
      );
    }

    // Validate notification data
    if (!notification.type || !notification.title || !notification.message) {
      return NextResponse.json(
        { error: "Missing required notification fields" },
        { status: 400 }
      );
    }

    // Create notification record
    const notificationId = crypto.randomUUID();
    const notificationRecord = {
      id: notificationId,
      business_id: businessId,
      sender_staff_id: staffId,
      sender_name: `${staff.first_name} ${staff.last_name}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority || "normal",
      target_roles: notification.targetRoles || [],
      target_staff_ids: notification.targetStaffIds || [],
      target_dashboards: notification.targetDashboards || [],
      data: notification.data || {},
      expires_at: notification.expiresAt || null,
      action_required: notification.actionRequired || false,
      action_url: notification.actionUrl || null,
      send_to_all: sendToAll || false,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    // Store notification in database
    const { error: insertError } = await supabase
      .from("realtime_notifications")
      .insert(notificationRecord);

    if (insertError) {
      console.error("Failed to store notification:", insertError);
      return NextResponse.json(
        { error: "Failed to store notification" },
        { status: 500 }
      );
    }

    // Get target staff members
    let targetStaff: any[] = [];

    if (sendToAll) {
      // Send to all active staff in the business
      const { data: allStaff } = await supabase
        .from("staff")
        .select("id, role, first_name, last_name")
        .eq("business_id", businessId)
        .eq("is_active", true);

      targetStaff = allStaff || [];
    } else {
      // Send to specific staff based on roles or IDs
      let query = supabase
        .from("staff")
        .select("id, role, first_name, last_name")
        .eq("business_id", businessId)
        .eq("is_active", true);

      if (
        notification.targetStaffIds &&
        notification.targetStaffIds.length > 0
      ) {
        query = query.in("id", notification.targetStaffIds);
      } else if (
        notification.targetRoles &&
        notification.targetRoles.length > 0
      ) {
        query = query.in("role", notification.targetRoles);
      }

      const { data: filteredStaff } = await query;
      targetStaff = filteredStaff || [];
    }

    // Create notification delivery records
    const deliveryRecords = targetStaff.map((targetStaffMember) => ({
      id: crypto.randomUUID(),
      notification_id: notificationId,
      staff_id: targetStaffMember.id,
      staff_name: `${targetStaffMember.first_name} ${targetStaffMember.last_name}`,
      staff_role: targetStaffMember.role,
      delivered_at: new Date().toISOString(),
      is_read: false,
      read_at: null,
    }));

    if (deliveryRecords.length > 0) {
      const { error: deliveryError } = await supabase
        .from("notification_deliveries")
        .insert(deliveryRecords);

      if (deliveryError) {
        console.error("Failed to create delivery records:", deliveryError);
      }
    }

    // The actual real-time broadcasting is handled by Supabase real-time subscriptions
    // Components listening to the 'realtime_notifications' table will receive updates

    return NextResponse.json({
      success: true,
      notificationId,
      targetCount: targetStaff.length,
      message: `Notification sent to ${targetStaff.length} staff members`,
    });
  } catch (error) {
    console.error("Notification broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to broadcast notification" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/realtime/notifications
 * Get notifications for the current staff member
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const staffId = await getServerStaffId();

    if (!staffId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Get staff details
    const { data: staff } = await supabase
      .from("staff")
      .select("business_id, role")
      .eq("id", staffId)
      .single();

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Build query for notifications
    let query = supabase
      .from("notification_deliveries")
      .select(
        `
        *,
        notification:notification_id (
          id,
          type,
          title,
          message,
          priority,
          data,
          expires_at,
          action_required,
          action_url,
          sender_name,
          created_at
        )
      `
      )
      .eq("staff_id", staffId)
      .order("delivered_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    // Filter out expired notifications
    query = query.or(
      `notification.expires_at.is.null,notification.expires_at.gt.${new Date().toISOString()}`
    );

    const { data: notifications, error } = await query;

    if (error) {
      console.error("Failed to fetch notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("notification_deliveries")
      .select("*", { count: "exact", head: true })
      .eq("staff_id", staffId)
      .eq("is_read", false)
      .or(
        `notification.expires_at.is.null,notification.expires_at.gt.${new Date().toISOString()}`
      );

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      hasMore: (notifications?.length || 0) === limit,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/realtime/notifications
 * Mark notifications as read or update notification status
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const staffId = await getServerStaffId();

    if (!staffId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, notificationIds, markAllAsRead } = body;

    if (action === "mark_read") {
      let query = supabase
        .from("notification_deliveries")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("staff_id", staffId);

      if (markAllAsRead) {
        // Mark all notifications as read for this staff member
        query = query.eq("is_read", false);
      } else if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read
        query = query.in("notification_id", notificationIds);
      } else {
        return NextResponse.json(
          { error: "No notifications specified" },
          { status: 400 }
        );
      }

      const { error } = await query;

      if (error) {
        console.error("Failed to mark notifications as read:", error);
        return NextResponse.json(
          { error: "Failed to update notifications" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: markAllAsRead
          ? "All notifications marked as read"
          : "Notifications marked as read",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update notifications error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
