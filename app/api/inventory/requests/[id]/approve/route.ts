import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface ItemModification {
  item_id: string;
  approved_quantity?: number;
  approved_unit_cost?: number;
  supplier_id?: string;
  notes?: string;
}

interface ApproveRequestBody {
  approved_by_admin_id: string;
  admin_notes?: string;
  item_modifications?: ItemModification[];
  admin_session_id?: string;
  start_time?: number;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body: ApproveRequestBody = await request.json();
    const requestId = params.id;

    const { approved_by_admin_id, admin_notes, item_modifications = [] } = body;

    if (!approved_by_admin_id) {
      return NextResponse.json(
        { error: "Admin ID is required for approval" },
        { status: 400 }
      );
    }

    // Get the current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from("inventory_requests")
      .select(
        `
        *,
        inventory_request_items(*)
      `
      )
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
        { error: "Only pending requests can be approved" },
        { status: 400 }
      );
    }

    // Process item modifications
    let total_approved_cost = 0;
    let fully_approved = true;

    for (const item of currentRequest.inventory_request_items) {
      const modification = item_modifications.find(
        (mod: ItemModification) => mod.item_id === item.id
      );

      let approved_quantity = item.requested_quantity;
      let approved_unit_cost = item.estimated_unit_cost;
      let supplier_id = item.supplier_id;

      if (modification) {
        approved_quantity = modification.approved_quantity ?? approved_quantity;
        approved_unit_cost =
          modification.approved_unit_cost ?? approved_unit_cost;
        supplier_id = modification.supplier_id ?? supplier_id;
      }

      // Check if fully approved
      if (approved_quantity < item.requested_quantity) {
        fully_approved = false;
      }

      total_approved_cost += approved_quantity * approved_unit_cost;

      // Update the item
      const { error: updateItemError } = await supabase
        .from("inventory_request_items")
        .update({
          approved_quantity,
          approved_unit_cost,
          supplier_id,
          notes: modification?.notes || item.notes,
        })
        .eq("id", item.id);

      if (updateItemError) {
        console.error("Error updating request item:", updateItemError);
        return NextResponse.json(
          { error: "Failed to update request items" },
          { status: 500 }
        );
      }
    }

    // Determine final status
    const final_status = fully_approved ? "approved" : "partially_approved";

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from("inventory_requests")
      .update({
        status: final_status,
        approved_by_admin_id,
        approved_at: new Date().toISOString(),
        admin_notes,
        total_estimated_cost: total_approved_cost,
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
        { error: "Failed to approve request" },
        { status: 500 }
      );
    }

    // Log admin activity
    await supabase.from("staff_activity_logs").insert({
      staff_id: approved_by_admin_id,
      staff_session_id: body.admin_session_id || null,
      business_id: currentRequest.business_id,
      activity_type: "inventory_approved",
      activity_details: {
        request_id: requestId,
        original_cost: currentRequest.total_estimated_cost,
        approved_cost: total_approved_cost,
        status: final_status,
        items_modified: item_modifications.length,
      },
      performance_metrics: {
        response_time: Date.now() - (body.start_time || Date.now()),
      },
    });

    // Create notification for requesting staff
    await supabase.from("notifications").insert({
      business_id: currentRequest.business_id,
      staff_id: currentRequest.requested_by_staff_id,
      type: "inventory_request_approved",
      title: "Inventory Request Approved",
      message: `Your inventory request has been ${final_status}. ${
        admin_notes || ""
      }`,
      data: {
        request_id: requestId,
        status: final_status,
        approved_cost: total_approved_cost,
      },
      priority: "normal",
    });

    return NextResponse.json({
      request: updatedRequest,
      message: `Request ${final_status} successfully`,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
