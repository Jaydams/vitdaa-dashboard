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

    const { preparation_completed_at, completed_by_staff_id } = body;

    if (!preparation_completed_at) {
      return NextResponse.json(
        { error: "Preparation completion time is required" },
        { status: 400 }
      );
    }

    // Check if order exists and belongs to this business
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, business_id, status, invoice_no, customer_name, preparation_started_at, preparation_completed_at"
      )
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if preparation was started
    if (!order.preparation_started_at) {
      return NextResponse.json(
        { error: "Cannot complete preparation that was never started" },
        { status: 400 }
      );
    }

    // Check if preparation already completed
    if (order.preparation_completed_at) {
      return NextResponse.json(
        { error: "Preparation already completed for this order" },
        { status: 400 }
      );
    }

    // Only allow completing preparation for processing orders
    if (order.status !== "processing") {
      return NextResponse.json(
        {
          error: `Cannot complete preparation for order with status '${order.status}'`,
        },
        { status: 400 }
      );
    }

    // Calculate preparation duration
    const startTime = new Date(order.preparation_started_at).getTime();
    const endTime = new Date(preparation_completed_at).getTime();
    const preparationDuration = Math.floor((endTime - startTime) / 1000); // in seconds

    // Update order with preparation completion time
    const updateData: any = {
      preparation_completed_at,
      preparation_duration: preparationDuration,
      updated_at: new Date().toISOString(),
    };

    if (completed_by_staff_id) {
      updateData.completed_by_staff_id = completed_by_staff_id;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Error completing order preparation:", updateError);
      return NextResponse.json(
        { error: "Failed to complete order preparation" },
        { status: 500 }
      );
    }

    // Log the preparation completion
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: completed_by_staff_id || businessOwnerId,
      action: "preparation_completed",
      resource_type: "order",
      resource_id: orderId,
      details: {
        invoice_no: order.invoice_no,
        customer_name: order.customer_name,
        preparation_completed_at,
        preparation_duration: preparationDuration,
        completed_by_staff_id,
      },
      performance_metrics: {
        preparation_time: preparationDuration,
        efficiency_score:
          preparationDuration <= 900
            ? 100
            : Math.max(50, 100 - (preparationDuration - 900) / 60), // 15 minutes baseline
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error in PUT /api/orders/[id]/preparation/complete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
