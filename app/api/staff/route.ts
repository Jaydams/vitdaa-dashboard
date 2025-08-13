import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    // Calculate offset for pagination
    const offset = (page - 1) * perPage;

    // Build query for staff with permissions
    let staffQuery = supabase
      .from("staff_permissions_summary")
      .select("*", { count: "exact" })
      .eq("business_id", businessOwnerId);

    // Apply filters
    if (role) {
      staffQuery = staffQuery.eq("role", role);
    }

    if (search) {
      staffQuery = staffQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    const {
      data: staffData,
      error: staffError,
      count,
    } = await staffQuery
      .range(offset, offset + perPage - 1)
      .order("first_name", { ascending: true });

    if (staffError) {
      console.error("Error fetching staff:", staffError);
      return NextResponse.json(
        { error: "Failed to fetch staff" },
        { status: 500 }
      );
    }

    // Get active sessions for these staff members
    const staffIds = staffData?.map((staff) => staff.id) || [];
    let sessionsData = [];

    if (staffIds.length > 0) {
      const { data: sessions, error: sessionsError } = await supabase
        .from("staff_sessions")
        .select("*")
        .in("staff_id", staffIds)
        .eq("is_active", true);

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
      } else {
        sessionsData = sessions || [];
      }
    }

    // Get detailed staff information including permissions
    const detailedStaffData = await Promise.all(
      (staffData || []).map(async (staff) => {
        // Get active session
        const activeSession = sessionsData.find(
          (session) => session.staff_id === staff.id && session.is_active
        ) || null;

        // Get detailed permissions
        const { data: permissions, error: permissionsError } = await supabase
          .from("staff_permissions")
          .select("permission_name, is_granted, granted_at, expires_at")
          .eq("staff_id", staff.id)
          .eq("is_granted", true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        if (permissionsError) {
          console.error("Error fetching permissions:", permissionsError);
        }

        // Get role assignments
        const { data: roleAssignments, error: roleError } = await supabase
          .from("staff_role_assignments")
          .select("role_name, assigned_at, notes")
          .eq("staff_id", staff.id)
          .eq("is_active", true);

        if (roleError) {
          console.error("Error fetching role assignments:", roleError);
        }

        return {
          ...staff,
          activeSession,
          permissions: permissions?.map(p => p.permission_name) || [],
          roleAssignments: roleAssignments || [],
          totalPermissions: permissions?.length || 0,
        };
      })
    );

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / perPage);

    const response = {
      data: detailedStaffData,
      first: 1,
      last: totalPages,
      next: page < totalPages ? page + 1 : null,
      pages: totalPages,
      prev: page > 1 ? page - 1 : null,
      items: totalItems,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();

    const {
      first_name,
      last_name,
      email,
      phone_number,
      role,
      pin,
      custom_permissions = [],
      access_level = "standard",
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !role || !pin) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Hash the PIN
    const bcrypt = require("bcryptjs");
    const pinHash = await bcrypt.hash(pin, 10);

    // Create staff member
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .insert({
        business_id: businessOwnerId,
        first_name,
        last_name,
        email,
        phone_number,
        pin_hash: pinHash,
        role,
        custom_permissions,
        access_level,
        is_active: true,
      })
      .select()
      .single();

    if (staffError) {
      console.error("Error creating staff:", staffError);
      return NextResponse.json(
        { error: "Failed to create staff member" },
        { status: 500 }
      );
    }

    // Log the staff creation
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: staff.id,
      action: "staff_created",
      performed_by: businessOwnerId,
      details: {
        role,
        access_level,
        custom_permissions,
      },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
