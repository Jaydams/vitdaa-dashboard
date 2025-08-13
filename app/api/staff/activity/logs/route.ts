import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessOwner } from "@/actions/auth-utils";
import { getBusinessActivityLogs } from "@/lib/staff-activity-tracking";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const actionFilter = searchParams.get("action");

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

    // Get activity logs
    const logs = await getBusinessActivityLogs(
      businessId,
      limit,
      offset,
      actionFilter || undefined
    );

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        limit,
        offset,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error("Error fetching staff activity logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
