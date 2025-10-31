import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OpenTicket, OrderState } from "@/stores/order-store";
import { validateStaffSession } from "@/actions/staff-auth-utils";
import { cookies } from "next/headers";

// GET /api/tickets - Retrieve tickets with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Get staff session from cookies
    const cookieStore = await cookies();
    const staffSessionToken = cookieStore.get("staff_session_token")?.value;

    if (!staffSessionToken) {
      return NextResponse.json(
        { error: "No staff session found" },
        { status: 401 }
      );
    }

    // Validate staff session
    const sessionRecord = await validateStaffSession(staffSessionToken);
    if (!sessionRecord) {
      return NextResponse.json(
        { error: "Invalid staff session" },
        { status: 401 }
      );
    }

    // Get staff details to get business_id
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("id, business_id")
      .eq("id", sessionRecord.staff_id)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const businessId = staffData.business_id;

    // Build query to get incomplete orders (open tickets)
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
        table_id,
        subtotal,
        vat_amount,
        service_charge,
        total_amount,
        status,
        priority_level,
        notes,
        kitchen_notes,
        bar_notes,
        created_at,
        updated_at,
        estimated_completion_time,
        payment_method,
        wallet_payment_status,
        assigned_to_staff_id
      `
      )
      .eq("business_id", businessId)
      .in("status", ["pending", "processing"]) // Only incomplete orders
      .order("status", { ascending: true }) // pending comes before processing alphabetically
      .order("created_at", { ascending: true }); // oldest first within each status

    // Apply date filters (default to today if no date specified)
    if (!dateFrom && !dateTo) {
      // Default to today's orders
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59
      );

      query = query
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());
    } else {
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        query = query.gte("created_at", fromDate.toISOString());
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        query = query.lte("created_at", toDate.toISOString());
      }
    }

    // Apply other filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (paymentStatus && paymentStatus !== "all") {
      query = query.eq("wallet_payment_status", paymentStatus);
    }
    if (search) {
      // Search in invoice number, customer name, and phone
      query = query.or(
        `invoice_no.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
      );
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders", details: error.message },
        { status: 500 }
      );
    }

    // Transform orders to OpenTicket format
    const transformedTickets: OpenTicket[] = (orders || []).map(
      (order: any) => ({
        id: order.id,
        ticketNumber: order.invoice_no,
        orderState: {
          id: order.id,
          ticketNumber: order.invoice_no,
          items: [], // We'll fetch order items separately if needed
          customer: {
            name: order.customer_name,
            phone: order.customer_phone,
            address: order.customer_address,
          },
          tableNumber: order.table_id ? parseInt(order.table_id) : undefined,
          diningOption: order.dining_option as "indoor" | "pickup" | "delivery",
          specialInstructions:
            order.notes || order.kitchen_notes || order.bar_notes,
          status: "open_ticket" as const,
          calculations: {
            subtotal: order.subtotal,
            vatAmount: order.vat_amount,
            serviceChargeAmount: order.service_charge,
            customChargesTotal: 0,
            total: order.total_amount,
          },
          customCharges: [],
          timestamps: {
            created: new Date(order.created_at),
            lastModified: new Date(order.updated_at),
            savedAsTicket: new Date(order.created_at),
          },
        },
        status:
          order.status === "pending"
            ? "pending_payment"
            : order.status === "processing"
            ? "preparing"
            : (order.status as
                | "pending_payment"
                | "preparing"
                | "ready"
                | "completed"),
        priority:
          order.priority_level === "urgent"
            ? "urgent"
            : order.priority_level === "high"
            ? "high"
            : "normal",
        createdBy: order.assigned_to_staff_id || "system",
        createdAt: new Date(order.created_at),
        lastModified: new Date(order.updated_at),
        estimatedCompletionTime: order.estimated_completion_time
          ? new Date(order.estimated_completion_time)
          : undefined,
        paymentStatus:
          order.wallet_payment_status === "completed"
            ? "completed"
            : order.wallet_payment_status === "failed"
            ? "failed"
            : order.wallet_payment_status === "cancelled"
            ? "failed"
            : "pending",
      })
    );

    return NextResponse.json({
      tickets: transformedTickets,
      pagination: {
        page,
        limit,
        total: transformedTickets.length,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      ticketNumber,
      orderState,
      status = "pending_payment",
      priority = "normal",
      estimatedCompletionTime,
    } = body;

    // Validate required fields
    if (!ticketNumber || !orderState) {
      return NextResponse.json(
        { error: "Missing required fields: ticketNumber, orderState" },
        { status: 400 }
      );
    }

    // Get staff session from cookies
    const cookieStore = await cookies();
    const staffSessionToken = cookieStore.get("staff_session_token")?.value;

    if (!staffSessionToken) {
      return NextResponse.json(
        { error: "No staff session found" },
        { status: 401 }
      );
    }

    // Validate staff session
    const sessionRecord = await validateStaffSession(staffSessionToken);
    if (!sessionRecord) {
      return NextResponse.json(
        { error: "Invalid staff session" },
        { status: 401 }
      );
    }

    // Get staff details to get business_id
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("id, business_id")
      .eq("id", sessionRecord.staff_id)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Create order (which becomes an open ticket)
    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        business_id: staffData.business_id,
        invoice_no: ticketNumber,
        customer_name: orderState.customer.name || "Walk-in Customer",
        customer_phone: orderState.customer.phone || "",
        customer_address: orderState.customer.address || "",
        dining_option: orderState.diningOption,
        table_id: orderState.tableNumber
          ? orderState.tableNumber.toString()
          : null,
        subtotal: orderState.calculations.subtotal,
        vat_amount: orderState.calculations.vatAmount,
        service_charge: orderState.calculations.serviceChargeAmount,
        total_amount: orderState.calculations.total,
        payment_method: "cash", // Default, can be updated later
        status: status === "pending_payment" ? "pending" : "processing",
        priority_level: priority,
        notes: orderState.specialInstructions,
        assigned_to_staff_id: staffData.id,
        estimated_completion_time: estimatedCompletionTime,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating order:", insertError);
      return NextResponse.json(
        { error: "Failed to create order", details: insertError.message },
        { status: 500 }
      );
    }

    // Also create order items
    if (orderState.items && orderState.items.length > 0) {
      const orderItems = orderState.items.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        menu_item_price: item.menu_item_price,
        quantity: item.quantity,
        total_price: item.total_price,
        special_instructions: item.special_instructions || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
        // Don't fail the whole request, just log the error
      }
    }

    return NextResponse.json({
      id: order.id,
      ticketNumber: order.invoice_no,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
