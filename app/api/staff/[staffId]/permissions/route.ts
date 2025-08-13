import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function GET(
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

    // Get staff permissions
    const { data: permissions, error: permissionsError } = await supabase
      .from("staff_permissions")
      .select(`
        id,
        permission_name,
        is_granted,
        granted_at,
        expires_at,
        notes,
        granted_by
      `)
      .eq("staff_id", staffId)
      .eq("business_id", businessOwnerId)
      .order("permission_name");

    if (permissionsError) {
      console.error("Error fetching permissions:", permissionsError);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    // Get available permissions from templates
    const { data: availablePermissions, error: templatesError } = await supabase
      .from("role_permission_templates")
      .select("role_name, permissions")
      .eq("is_active", true);

    if (templatesError) {
      console.error("Error fetching permission templates:", templatesError);
    }

    // Get staff information
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role, access_level")
      .eq("id", staffId)
      .eq("business_id", businessOwnerId)
      .single();

    if (staffError) {
      console.error("Error fetching staff:", staffError);
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      staff,
      permissions,
      availablePermissions: availablePermissions || [],
    });
  } catch (error) {
    console.error("Error in GET /api/staff/[staffId]/permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const {
      permission_name,
      is_granted = true,
      expires_at = null,
      notes = "",
    } = body;

    if (!permission_name) {
      return NextResponse.json(
        { error: "Permission name is required" },
        { status: 400 }
      );
    }

    // Check if staff exists and belongs to this business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, business_id")
      .eq("id", staffId)
      .eq("business_id", businessOwnerId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    // Insert or update permission
    const { data: permission, error: permissionError } = await supabase
      .from("staff_permissions")
      .upsert({
        staff_id: staffId,
        business_id: businessOwnerId,
        permission_name,
        is_granted,
        granted_by: businessOwnerId,
        expires_at,
        notes,
      })
      .select()
      .single();

    if (permissionError) {
      console.error("Error updating permission:", permissionError);
      return NextResponse.json(
        { error: "Failed to update permission" },
        { status: 500 }
      );
    }

    // Log the permission change
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: staffId,
      action: is_granted ? "permission_granted" : "permission_revoked",
      performed_by: businessOwnerId,
      details: {
        permission_name,
        expires_at,
        notes,
      },
    });

    return NextResponse.json(permission);
  } catch (error) {
    console.error("Error in POST /api/staff/[staffId]/permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const searchParams = request.nextUrl.searchParams;
    const permissionName = searchParams.get("permission");

    if (!permissionName) {
      return NextResponse.json(
        { error: "Permission name is required" },
        { status: 400 }
      );
    }

    // Delete the permission
    const { error: deleteError } = await supabase
      .from("staff_permissions")
      .delete()
      .eq("staff_id", staffId)
      .eq("business_id", businessOwnerId)
      .eq("permission_name", permissionName);

    if (deleteError) {
      console.error("Error deleting permission:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete permission" },
        { status: 500 }
      );
    }

    // Log the permission deletion
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: staffId,
      action: "permission_deleted",
      performed_by: businessOwnerId,
      details: {
        permission_name: permissionName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/staff/[staffId]/permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
