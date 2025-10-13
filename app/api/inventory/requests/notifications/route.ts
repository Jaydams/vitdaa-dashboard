import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function POST(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();

    const { request_id, staff_id, notification_type, title, message } = body;

    if (!request_id || !staff_id || !notification_type || !title || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate notification type
    const validTypes = [
      "status_update",
      "admin_response",
      "approval",
      "denial",
    ];
    if (!validTypes.includes(notification_type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    // Check if request exists and belongs to this business
    const { data: request_data, error: requestError } = await supabase
      .from("inventory_requests")
      .select("id, business_id")
      .eq("id", request_id)
      .eq("business_id", businessOwnerId)
      .single();

    if (requestError || !request_data) {
      return NextResponse.json(
        { error: "Inventory request not found" },
        { status: 404 }
      );
    }

    // Create notification
    const { data: notification, error: notificationError } = await supabase
      .from("inventory_request_notifications")
      .insert({
        business_id: businessOwnerId,
        request_id,
        staff_id,
        notification_type,
        title,
        message,
        is_read: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      );
    }

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error(
      "Error in POST /api/inventory/requests/notifications:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get("staff_id");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isRead = searchParams.get("is_read");

    if (!staffId) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    // Build query for notifications
    let notificationsQuery = supabase
      .from("inventory_request_notifications")
      .select(
        `
        id,
        request_id,
        notification_type,
        title,
        message,
        is_read,
        created_at,
        inventory_requests!inner(
          id,
          status,
          urgency_level,
          total_estimated_cost,
          inventory_request_items(
            inventory_items(name)
          )
        )
      `
      )
      .eq("business_id", businessOwnerId)
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (isRead !== null) {
      notificationsQuery = notificationsQuery.eq("is_read", isRead === "true");
    }

    const { data: notifications, error: notificationsError } =
      await notificationsQuery;

    if (notificationsError) {
      console.error("Error fetching notifications:", notificationsError);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifications: notifications || [],
      total: notifications?.length || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/inventory/requests/notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
