import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function PUT(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { alertId } = params;
    const body = await request.json();

    const { is_active } = body;

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be a boolean value" },
        { status: 400 }
      );
    }

    // Check if alert exists and belongs to this business
    const { data: alert, error: alertError } = await supabase
      .from("inventory_alerts")
      .select("id, business_id, alert_type, message")
      .eq("id", alertId)
      .eq("business_id", businessOwnerId)
      .single();

    if (alertError || !alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Update alert status
    const { data: updatedAlert, error: updateError } = await supabase
      .from("inventory_alerts")
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", alertId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating alert:", updateError);
      return NextResponse.json(
        { error: "Failed to update alert" },
        { status: 500 }
      );
    }

    // Log the alert update
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: businessOwnerId, // Using business owner ID as staff ID for now
      action: is_active
        ? "inventory_alert_activated"
        : "inventory_alert_dismissed",
      resource_type: "inventory_alert",
      resource_id: alertId,
      details: {
        alert_type: alert.alert_type,
        message: alert.message,
        is_active,
      },
    });

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error("Error in PUT /api/inventory/alerts/[alertId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { alertId } = params;

    // Check if alert exists and belongs to this business
    const { data: alert, error: alertError } = await supabase
      .from("inventory_alerts")
      .select("id, business_id, alert_type, message")
      .eq("id", alertId)
      .eq("business_id", businessOwnerId)
      .single();

    if (alertError || !alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Delete alert
    const { error: deleteError } = await supabase
      .from("inventory_alerts")
      .delete()
      .eq("id", alertId)
      .eq("business_id", businessOwnerId);

    if (deleteError) {
      console.error("Error deleting alert:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete alert" },
        { status: 500 }
      );
    }

    // Log the alert deletion
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: businessOwnerId, // Using business owner ID as staff ID for now
      action: "inventory_alert_deleted",
      resource_type: "inventory_alert",
      resource_id: alertId,
      details: {
        alert_type: alert.alert_type,
        message: alert.message,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/inventory/alerts/[alertId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
