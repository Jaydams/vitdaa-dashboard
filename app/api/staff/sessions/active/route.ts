import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessOwner } from "@/actions/auth-utils";
import { getActiveStaffSessionsWithActivity } from "@/lib/staff-activity-tracking";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Authenticate and validate business owner
    const supabase = await createClient();
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
    if (!businessOwner || businessOwner.id !== businessId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get active staff sessions with activity data
    const activeSessions = await getActiveStaffSessionsWithActivity(businessId);

    return NextResponse.json({
      success: true,
      data: activeSessions,
    });
  } catch (error) {
    console.error("Error fetching active staff sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
