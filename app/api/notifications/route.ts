import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch pending orders as notifications
    const { data: pendingOrders, error: ordersError } = await supabase
      .from("orders")
      .select(
        `
        id,
        invoice_no,
        customer_name,
        customer_phone,
        total_amount,
        payment_method,
        status,
        created_at,
        dining_option,
        table:tables(table_number)
      `
      )
      .eq("business_id", businessOwnerId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error("Error fetching pending orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    // Transform orders into notification format
    const notifications = (pendingOrders || []).map((order) => ({
      id: order.id,
      type: "new-order" as const,
      imageUrl: "/images/order-icon.png", // You can add a default order icon
      name: `Order #${order.invoice_no}`,
      price: order.total_amount,
      timestamp: order.created_at,
      isRead: "false", // All pending orders are considered unread
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      payment_method: order.payment_method,
      dining_option: order.dining_option,
      table_number: order.table?.table_number,
    }));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error in notifications API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
