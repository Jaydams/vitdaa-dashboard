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

    // Build query for kitchen orders
    let ordersQuery = supabase
      .from("orders")
      .select(`
        id,
        invoice_no,
        customer_name,
        table_id,
        total_amount,
        status,
        created_at,
        notes,
        dining_option,
        tables!inner(number)
      `)
      .eq("business_id", businessOwnerId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      ordersQuery = ordersQuery.eq("status", status);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error("Error fetching kitchen orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch kitchen orders" },
        { status: 500 }
      );
    }

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: orderItems, error: itemsError } = await supabase
          .from("order_items")
          .select(`
            id,
            quantity,
            total_price,
            menu_items!inner(
              id,
              name,
              category,
              price
            )
          `)
          .eq("order_id", order.id);

        if (itemsError) {
          console.error("Error fetching order items:", itemsError);
        }

        // Transform order items to match kitchen interface
        const kitchenItems = (orderItems || []).map((item) => ({
          id: item.id,
          menu_item_name: item.menu_items?.name || "Unknown Item",
          quantity: item.quantity,
          unit_price: item.menu_items?.price || 0,
          special_instructions: "", // Could be added to order_items table
          status: order.status === "pending" ? "pending" : "preparing",
        }));

        // Determine priority based on order age and total amount
        const orderAge = Date.now() - new Date(order.created_at).getTime();
        const ageInMinutes = orderAge / (1000 * 60);
        let priority: "low" | "medium" | "high" = "low";
        
        if (ageInMinutes > 30 || order.total_amount > 5000) {
          priority = "high";
        } else if (ageInMinutes > 15 || order.total_amount > 2000) {
          priority = "medium";
        }

        return {
          id: order.id,
          order_number: order.invoice_no,
          customer_name: order.customer_name,
          table_number: order.tables?.number,
          items: kitchenItems,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          special_instructions: order.notes,
          priority,
        };
      })
    );

    return NextResponse.json({
      orders: ordersWithItems,
      total: ordersWithItems.length,
    });
  } catch (error) {
    console.error("Error in GET /api/orders/kitchen:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
