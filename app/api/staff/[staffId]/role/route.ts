import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function PUT(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { staffId } = params;
    const body = await request.json();

    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["reception", "kitchen", "bar", "accountant", "storekeeper", "waiter"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if staff exists and belongs to this business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, business_id, role")
      .eq("id", staffId)
      .eq("business_id", businessOwnerId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    // Update staff role
    const { data: updatedStaff, error: updateError } = await supabase
      .from("staff")
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq("id", staffId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating staff role:", updateError);
      return NextResponse.json(
        { error: "Failed to update staff role" },
        { status: 500 }
      );
    }

    // Update permissions based on new role using the database function
    const { error: functionError } = await supabase.rpc('update_staff_permissions_from_role', {
      staff_uuid: staffId,
      new_role: role
    });

    if (functionError) {
      console.error("Error updating permissions from role:", functionError);
      // Don't fail the request, just log the error
    }

    // Log the role change
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: staffId,
      action: "role_updated",
      resource_type: "staff",
      resource_id: staffId,
      details: {
        old_role: staff.role,
        new_role: role,
      },
    });

    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error("Error in PUT /api/staff/[staffId]/role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
