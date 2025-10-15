import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      order_id,
      amount,
      payment_method,
      reference_number,
      amount_received,
      change_amount,
      notes,
    } = body;

    // Validate required fields
    if (!order_id || !amount || !payment_method) {
      return NextResponse.json(
        { error: "Missing required fields: order_id, amount, payment_method" },
        { status: 400 }
      );
    }

    // Verify the order belongs to the user's business
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, business_id, total")
      .eq("id", order_id)
      .eq("business_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found or unauthorized" },
        { status: 404 }
      );
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id,
        amount,
        payment_method,
        status: "completed",
        reference_number: reference_number || null,
        amount_received: amount_received || amount,
        change_amount: change_amount || 0,
        notes: notes || null,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Error in payments POST API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const paymentMethod = searchParams.get("payment_method");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from("payments")
      .select(
        `
        *,
        orders!inner (
          id,
          invoice_no,
          customer_name,
          customer_phone,
          total,
          status,
          business_id,
          created_at,
          order_items (
            id,
            menu_item_name,
            quantity,
            price
          )
        )
      `
      )
      .eq("orders.business_id", user.id)
      .order("created_at", { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod);
    }
    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: payments, error } = await query;

    if (error) {
      console.error("Error fetching payments:", error);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("orders.business_id", user.id);

    if (startDate) {
      countQuery = countQuery.gte("created_at", startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte("created_at", endDate);
    }
    if (paymentMethod) {
      countQuery = countQuery.eq("payment_method", paymentMethod);
    }
    if (status) {
      countQuery = countQuery.eq("status", status);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error in payments API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
