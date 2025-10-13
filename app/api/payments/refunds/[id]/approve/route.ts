import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ApproveRefundRequest {
  notes?: string;
  approved_by_staff_id?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body: ApproveRefundRequest = await request.json();
    const refundId = params.id;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get refund request with payment details
    const { data: refundRequest, error: refundError } = await supabase
      .from("refund_requests")
      .select(
        `
        *,
        payments!inner (
          id,
          amount,
          payment_method,
          status,
          transaction_id,
          orders!inner (
            id,
            business_id,
            invoice_no,
            customer_name
          )
        )
      `
      )
      .eq("id", refundId)
      .eq("payments.orders.business_id", user.id)
      .single();

    if (refundError || !refundRequest) {
      return NextResponse.json(
        { error: "Refund request not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if refund is still pending
    if (refundRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Refund request is not pending" },
        { status: 400 }
      );
    }

    // Start transaction
    const { data: updatedRefund, error: updateError } = await supabase
      .from("refund_requests")
      .update({
        status: "approved",
        approved_by_staff_id: body.approved_by_staff_id || user.id,
        approved_at: new Date().toISOString(),
        admin_notes: body.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", refundId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating refund request:", updateError);
      return NextResponse.json(
        { error: "Failed to approve refund request" },
        { status: 500 }
      );
    }

    // Update payment status to refunded if full refund
    if (refundRequest.amount === refundRequest.payments.amount) {
      await supabase
        .from("payments")
        .update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", refundRequest.payment_id);
    }

    // Create refund transaction record
    const { data: refundTransaction, error: transactionError } = await supabase
      .from("refund_transactions")
      .insert({
        refund_request_id: refundId,
        payment_id: refundRequest.payment_id,
        amount: refundRequest.amount,
        refund_method: refundRequest.payments.payment_method,
        status: "completed",
        processed_at: new Date().toISOString(),
        reference_number: `REF-${Date.now()}`,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Error creating refund transaction:", transactionError);
      // Don't fail the request, just log the error
    }

    // Create audit log entry
    await supabase.from("audit_logs").insert({
      staff_id: body.approved_by_staff_id || user.id,
      action: "refund_approved",
      resource_type: "refund_request",
      resource_id: refundId,
      old_values: { status: "pending" },
      new_values: {
        status: "approved",
        approved_by_staff_id: body.approved_by_staff_id || user.id,
        admin_notes: body.notes,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Refund approved successfully",
      refundRequest: updatedRefund,
      refundTransaction,
    });
  } catch (error) {
    console.error("Error approving refund:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
