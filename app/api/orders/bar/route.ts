import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    // Build query for orders with bar items
    let ordersQuery = supabase
      .from("orders")
      .select(
        `
        id,
        invoice_no,
        customer_name,
        table_id,
        total_amount,
        status,
        created_at,
        notes,
        dining_option,
        bar_notes,
        estimated_completion_time,
        preparation_started_at,
        preparation_completed_at,
        priority_level,
        tables(number)
      `
      )
      .eq("business_id", businessOwnerId)
      .in("status", ["pending", "processing", "ready"])
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      ordersQuery = ordersQuery.eq("status", status);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error("Error fetching bar orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch bar orders" },
        { status: 500 }
      );
    }

    // Get order items for each order, filtering for bar items only
    const ordersWithBarItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: orderItems, error: itemsError } = await supabase
          .from("order_items")
          .select(
            `
            id,
            quantity,
            total_price,
            item_status,
            special_instructions,
            is_bar_item,
            preparation_started_at,
            preparation_completed_at,
            menu_items!inner(
              id,
              name,
              price
            )
          `
          )
          .eq("order_id", order.id)
          .eq("is_bar_item", true); // Filter for bar items only

        if (itemsError) {
          console.error("Error fetching order items:", itemsError);
        }

        // Skip orders with no bar items
        if (!orderItems || orderItems.length === 0) {
          return null;
        }

        // Transform order items to match bar interface
        const barItems = orderItems.map((item) => ({
          id: item.id,
          menu_item_name: (item.menu_items as any)?.name || "Unknown Item",
          quantity: item.quantity,
          unit_price: (item.menu_items as any)?.price || 0,
          special_instructions: item.special_instructions || "",
          item_status: item.item_status || "pending",
          is_bar_item: item.is_bar_item,
          preparation_started_at: item.preparation_started_at,
          preparation_completed_at: item.preparation_completed_at,
          preparation_time: 5, // Default 5 minutes for beverages
        }));

        return {
          id: order.id,
          invoice_no: order.invoice_no,
          customer_name: order.customer_name,
          table_number: (order.tables as any)?.number,
          items: barItems,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          special_instructions: order.notes,
          priority_level: order.priority_level || "normal",
          estimated_completion_time: order.estimated_completion_time,
          preparation_started_at: order.preparation_started_at,
          preparation_completed_at: order.preparation_completed_at,
          bar_notes: order.bar_notes,
        };
      })
    );

    // Filter out null orders (orders with no bar items)
    const validBarOrders = ordersWithBarItems.filter((order) => order !== null);

    return NextResponse.json({
      orders: validBarOrders,
      total: validBarOrders.length,
    });
  } catch (error) {
    console.error("Error in GET /api/orders/bar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
