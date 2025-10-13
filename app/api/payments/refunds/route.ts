import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RefundRequest {
  payment_id: string;
  amount: number;
  reason: string;
  requested_by_staff_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query for refund requests
    let query = supabase
      .from("refund_requests")
      .select(
        `
        *,
        payments!inner (
          id,
          amount,
          payment_method,
          status,
          orders!inner (
            id,
            invoice_no,
            customer_name,
            customer_phone,
            business_id
          )
        ),
        requested_by_staff:staff!requested_by_staff_id (
          id,
          name,
          role
        ),
        approved_by_staff:staff!approved_by_staff_id (
          id,
          name,
          role
        )
      `
      )
      .eq("payments.orders.business_id", user.id)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: refundRequests, error } = await query;

    if (error) {
      console.error("Error fetching refund requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch refund requests" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("payments.orders.business_id", user.id);

    if (status) {
      countQuery = countQuery.eq("status", status);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      refundRequests,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error in refund requests API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: RefundRequest = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    if (!body.payment_id || !body.amount || !body.reason) {
      return NextResponse.json(
        { error: "Missing required fields: payment_id, amount, reason" },
        { status: 400 }
      );
    }

    // Verify payment exists and belongs to user's business
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(
        `
        *,
        orders!inner (
          id,
          business_id,
          invoice_no,
          customer_name
        )
      `
      )
      .eq("id", body.payment_id)
      .eq("orders.business_id", user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: "Payment not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if payment is eligible for refund
    if (payment.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed payments can be refunded" },
        { status: 400 }
      );
    }

    // Check if refund amount is valid
    if (body.amount > payment.amount) {
      return NextResponse.json(
        { error: "Refund amount cannot exceed payment amount" },
        { status: 400 }
      );
    }

    // Create refund request
    const { data: refundRequest, error: refundError } = await supabase
      .from("refund_requests")
      .insert({
        payment_id: body.payment_id,
        amount: body.amount,
        reason: body.reason,
        requested_by_staff_id: body.requested_by_staff_id,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (refundError) {
      console.error("Error creating refund request:", refundError);
      return NextResponse.json(
        { error: "Failed to create refund request" },
        { status: 500 }
      );
    }

    // Create audit log entry
    await supabase.from("audit_logs").insert({
      staff_id: body.requested_by_staff_id || user.id,
      action: "refund_request_created",
      resource_type: "refund_request",
      resource_id: refundRequest.id,
      new_values: {
        payment_id: body.payment_id,
        amount: body.amount,
        reason: body.reason,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Refund request created successfully",
      refundRequest,
    });
  } catch (error) {
    console.error("Error creating refund request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
