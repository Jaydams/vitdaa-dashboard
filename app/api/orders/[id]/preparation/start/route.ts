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

    const { preparation_started_at, assigned_to_staff_id } = body;

    if (!preparation_started_at) {
      return NextResponse.json(
        { error: "Preparation start time is required" },
        { status: 400 }
      );
    }

    // Check if order exists and belongs to this business
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, business_id, status, invoice_no, customer_name, preparation_started_at"
      )
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if preparation already started
    if (order.preparation_started_at) {
      return NextResponse.json(
        { error: "Preparation already started for this order" },
        { status: 400 }
      );
    }

    // Only allow starting preparation for pending orders
    if (order.status !== "pending") {
      return NextResponse.json(
        {
          error: `Cannot start preparation for order with status '${order.status}'`,
        },
        { status: 400 }
      );
    }

    // Update order with preparation start time and assigned staff
    const updateData: any = {
      preparation_started_at,
      updated_at: new Date().toISOString(),
    };

    if (assigned_to_staff_id) {
      updateData.assigned_to_staff_id = assigned_to_staff_id;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Error starting order preparation:", updateError);
      return NextResponse.json(
        { error: "Failed to start order preparation" },
        { status: 500 }
      );
    }

    // Log the preparation start
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: assigned_to_staff_id || businessOwnerId,
      action: "preparation_started",
      resource_type: "order",
      resource_id: orderId,
      details: {
        invoice_no: order.invoice_no,
        customer_name: order.customer_name,
        preparation_started_at,
        assigned_to_staff_id,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error in PUT /api/orders/[id]/preparation/start:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
