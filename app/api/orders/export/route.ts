import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { OrderStatus, OrderMethod } from "@/types/order";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as OrderStatus | null;
    const search = searchParams.get("search");
    const method = searchParams.get("method") as OrderMethod | null;
    const limit = searchParams.get("limit");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase
      .from("orders")
      .select(
        `
        id,
        invoice_no,
        customer_name,
        customer_phone,
        customer_address,
        dining_option,
        status,
        payment_method,
        subtotal,
        vat_amount,
        service_charge,
        total_amount,
        takeaway_packs,
        takeaway_pack_price,
        delivery_fee,
        created_at,
        updated_at,
        notes,
        table:tables(table_number),
        delivery_location:delivery_locations(name, price),
        items:order_items(
          menu_item_name,
          menu_item_price,
          quantity,
          total_price
        )
      `
      )
      .eq("business_id", businessOwnerId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,invoice_no.ilike.%${search}%,customer_phone.ilike.%${search}%`
      );
    }

    if (method) {
      query = query.eq("payment_method", method);
    }

    // Handle date range filters
    if (limit) {
      const days = parseInt(limit);
      const limitDate = new Date();

      if (days === 1) {
        // Today only
        limitDate.setHours(0, 0, 0, 0);
        query = query.gte("created_at", limitDate.toISOString());
      } else {
        // Last N days
        limitDate.setDate(limitDate.getDate() - days);
        limitDate.setHours(0, 0, 0, 0);
        query = query.gte("created_at", limitDate.toISOString());
      }
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endDateTime.toISOString());
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Error fetching orders for export:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    // Generate CSV content
    const csvHeaders = [
      "Invoice No",
      "Customer Name",
      "Customer Phone",
      "Customer Address",
      "Dining Option",
      "Table Number",
      "Delivery Location",
      "Status",
      "Payment Method",
      "Items",
      "Subtotal",
      "VAT Amount",
      "Service Charge",
      "Takeaway Packs",
      "Takeaway Pack Price",
      "Delivery Fee",
      "Total Amount",
      "Notes",
      "Created At",
      "Updated At",
    ];

    const csvRows = orders?.map((order: any) => {
      const items = order.items
        ?.map(
          (item: any) =>
            `${item.menu_item_name} (${item.quantity}x ₦${item.menu_item_price})`
        )
        .join("; ");

      return [
        order.invoice_no || "",
        order.customer_name || "",
        order.customer_phone || "",
        order.customer_address || "",
        order.dining_option || "",
        order.table?.table_number || "",
        order.delivery_location?.name || "",
        order.status || "",
        order.payment_method || "",
        items || "",
        order.subtotal || 0,
        order.vat_amount || 0,
        order.service_charge || 0,
        order.takeaway_packs || 0,
        order.takeaway_pack_price || 0,
        order.delivery_fee || 0,
        order.total_amount || 0,
        order.notes || "",
        new Date(order.created_at).toLocaleString(),
        new Date(order.updated_at).toLocaleString(),
      ];
    });

    // Convert to CSV format
    const csvContent = [
      csvHeaders.join(","),
      ...(csvRows?.map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      ) || []),
    ].join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="orders-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });
  } catch (error) {
    console.error("Error in orders export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
