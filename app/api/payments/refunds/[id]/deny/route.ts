import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface DenyRefundRequest {
  reason: string;
  denied_by_staff_id?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body: DenyRefundRequest = await request.json();
    const refundId = params.id;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    if (!body.reason) {
      return NextResponse.json(
        { error: "Denial reason is required" },
        { status: 400 }
      );
    }

    // Get refund request
    const { data: refundRequest, error: refundError } = await supabase
      .from("refund_requests")
      .select(
        `
        *,
        payments!inner (
          orders!inner (
            business_id
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

    // Update refund request status
    const { data: updatedRefund, error: updateError } = await supabase
      .from("refund_requests")
      .update({
        status: "denied",
        denied_by_staff_id: body.denied_by_staff_id || user.id,
        denied_at: new Date().toISOString(),
        denial_reason: body.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", refundId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating refund request:", updateError);
      return NextResponse.json(
        { error: "Failed to deny refund request" },
        { status: 500 }
      );
    }

    // Create audit log entry
    await supabase.from("audit_logs").insert({
      staff_id: body.denied_by_staff_id || user.id,
      action: "refund_denied",
      resource_type: "refund_request",
      resource_id: refundId,
      old_values: { status: "pending" },
      new_values: {
        status: "denied",
        denied_by_staff_id: body.denied_by_staff_id || user.id,
        denial_reason: body.reason,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Refund denied successfully",
      refundRequest: updatedRefund,
    });
  } catch (error) {
    console.error("Error denying refund:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
