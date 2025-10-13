import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function PUT(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { notificationId } = params;
    const body = await request.json();

    const { is_read } = body;

    if (typeof is_read !== "boolean") {
      return NextResponse.json(
        { error: "is_read must be a boolean value" },
        { status: 400 }
      );
    }

    // Check if notification exists and belongs to this business
    const { data: notification, error: notificationError } = await supabase
      .from("inventory_request_notifications")
      .select("id, business_id")
      .eq("id", notificationId)
      .eq("business_id", businessOwnerId)
      .single();

    if (notificationError || !notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Update notification
    const { data: updatedNotification, error: updateError } = await supabase
      .from("inventory_request_notifications")
      .update({
        is_read,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating notification:", updateError);
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error(
      "Error in PUT /api/inventory/requests/notifications/[notificationId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { notificationId } = params;

    // Check if notification exists and belongs to this business
    const { data: notification, error: notificationError } = await supabase
      .from("inventory_request_notifications")
      .select("id, business_id")
      .eq("id", notificationId)
      .eq("business_id", businessOwnerId)
      .single();

    if (notificationError || !notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Delete notification
    const { error: deleteError } = await supabase
      .from("inventory_request_notifications")
      .delete()
      .eq("id", notificationId)
      .eq("business_id", businessOwnerId);

    if (deleteError) {
      console.error("Error deleting notification:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error in DELETE /api/inventory/requests/notifications/[notificationId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
