import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface DenyRequestBody {
  approved_by_admin_id: string;
  denied_reason: string;
  admin_notes?: string;
  admin_session_id?: string;
  start_time?: number;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body: DenyRequestBody = await request.json();
    const requestId = params.id;

    const { approved_by_admin_id, denied_reason, admin_notes } = body;

    if (!approved_by_admin_id || !denied_reason) {
      return NextResponse.json(
        { error: "Admin ID and denial reason are required" },
        { status: 400 }
      );
    }

    // Get the current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from("inventory_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: "Inventory request not found" },
        { status: 404 }
      );
    }

    if (currentRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending requests can be denied" },
        { status: 400 }
      );
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from("inventory_requests")
      .update({
        status: "denied",
        approved_by_admin_id,
        approved_at: new Date().toISOString(),
        denied_reason,
        admin_notes,
      })
      .eq("id", requestId)
      .select(
        `
        *,
        requested_by_staff:staff!requested_by_staff_id(id, first_name, last_name, role),
        approved_by_admin:business_owner!approved_by_admin_id(id, first_name, last_name),
        inventory_request_items(
          *,
          inventory_item:inventory_items(id, name, unit_of_measure, current_stock),
          supplier:suppliers(id, name)
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating inventory request:", updateError);
      return NextResponse.json(
        { error: "Failed to deny request" },
        { status: 500 }
      );
    }

    // Log admin activity
    await supabase.from("staff_activity_logs").insert({
      staff_id: approved_by_admin_id,
      staff_session_id: body.admin_session_id || null,
      business_id: currentRequest.business_id,
      activity_type: "inventory_denied",
      activity_details: {
        request_id: requestId,
        denied_reason,
        original_cost: currentRequest.total_estimated_cost,
      },
      performance_metrics: {
        response_time: Date.now() - (body.start_time || Date.now()),
      },
    });

    // Create notification for requesting staff
    await supabase.from("notifications").insert({
      business_id: currentRequest.business_id,
      staff_id: currentRequest.requested_by_staff_id,
      type: "inventory_request_denied",
      title: "Inventory Request Denied",
      message: `Your inventory request has been denied. Reason: ${denied_reason}`,
      data: {
        request_id: requestId,
        denied_reason,
        admin_notes,
      },
      priority: "normal",
    });

    return NextResponse.json({
      request: updatedRequest,
      message: "Request denied successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
