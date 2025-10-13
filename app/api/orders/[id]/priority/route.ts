import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { id: orderId } = params;
    const body = await request.json();

    const { priority_level, updated_by_staff_id } = body;

    if (!priority_level) {
      return NextResponse.json(
        { error: "Priority level is required" },
        { status: 400 }
      );
    }

    // Validate priority level
    const validPriorities = ["low", "normal", "high", "urgent"];
    if (!validPriorities.includes(priority_level)) {
      return NextResponse.json(
        { error: "Invalid priority level" },
        { status: 400 }
      );
    }

    // Check if order exists and belongs to this business
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, business_id, priority_level, invoice_no, customer_name")
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order priority
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        priority_level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order priority:", updateError);
      return NextResponse.json(
        { error: "Failed to update order priority" },
        { status: 500 }
      );
    }

    // Log the priority change
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: updated_by_staff_id || businessOwnerId,
      action: "order_priority_updated",
      resource_type: "order",
      resource_id: orderId,
      details: {
        invoice_no: order.invoice_no,
        customer_name: order.customer_name,
        old_priority: order.priority_level,
        new_priority: priority_level,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error in PUT /api/orders/[id]/priority:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
