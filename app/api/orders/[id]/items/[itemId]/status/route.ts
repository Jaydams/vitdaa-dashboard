import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { id: orderId, itemId } = params;
    const body = await request.json();

    const { status, notes, updated_by_staff_id } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = [
      "pending",
      "preparing",
      "ready",
      "served",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check if order exists and belongs to this business
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, business_id")
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order item exists
    const { data: orderItem, error: itemError } = await supabase
      .from("order_items")
      .select("id, menu_item_name, item_status")
      .eq("id", itemId)
      .eq("order_id", orderId)
      .single();

    if (itemError || !orderItem) {
      return NextResponse.json(
        { error: "Order item not found" },
        { status: 404 }
      );
    }

    // Update order item status
    const updateData: any = {
      item_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === "preparing") {
      updateData.preparation_started_at = new Date().toISOString();
    } else if (status === "ready") {
      updateData.preparation_completed_at = new Date().toISOString();
    }

    if (notes) {
      updateData.preparation_notes = notes;
    }

    if (updated_by_staff_id) {
      updateData.updated_by_staff_id = updated_by_staff_id;
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from("order_items")
      .update(updateData)
      .eq("id", itemId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order item status:", updateError);
      return NextResponse.json(
        { error: "Failed to update order item status" },
        { status: 500 }
      );
    }

    // Log the status change
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: updated_by_staff_id || businessOwnerId,
      action: "order_item_status_updated",
      resource_type: "order_item",
      resource_id: itemId,
      details: {
        order_id: orderId,
        item_name: orderItem.menu_item_name,
        old_status: orderItem.item_status,
        new_status: status,
        notes: notes,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error(
      "Error in PUT /api/orders/[id]/items/[itemId]/status:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
