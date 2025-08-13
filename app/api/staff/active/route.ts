import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessOwner } from "@/actions/auth-utils";
import { getActiveStaffSessions } from "@/actions/staff-auth-utils";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Fetch all active staff members for this business
    const { data: availableStaff, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("business_id", businessOwner.id)
      .eq("is_active", true)
      .order("first_name", { ascending: true });

    if (staffError) {
      console.error("Error fetching active staff:", staffError);
      return NextResponse.json(
        { error: "Failed to fetch staff" },
        { status: 500 }
      );
    }

    // Fetch active staff sessions with staff details
    const activeStaffSessions = await getActiveStaffSessions(businessOwner.id);

    return NextResponse.json({
      availableStaff: availableStaff || [],
      activeStaffSessions: activeStaffSessions || [],
      businessOwnerId: businessOwner.id,
    });
  } catch (error) {
    console.error("Error in active staff API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
