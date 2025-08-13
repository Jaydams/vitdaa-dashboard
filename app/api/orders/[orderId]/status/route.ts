import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { orderId } = params;
    const body = await request.json();

    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["pending", "processing", "ready", "served", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Check if order exists and belongs to this business
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, business_id, status")
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order status:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // Log the status change
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: businessOwnerId, // Using business owner ID as staff ID for now
      action: "order_status_updated",
      resource_type: "order",
      resource_id: orderId,
      details: {
        old_status: order.status,
        new_status: status,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error in PUT /api/orders/[orderId]/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
