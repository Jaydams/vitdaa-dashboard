import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessOwner } from "@/actions/auth-utils";
import { terminateStaffSession } from "@/actions/staff-auth-utils";
import { logStaffActivity } from "@/lib/staff-activity-tracking";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, businessId } = await request.json();

    if (!sessionId || !businessId) {
      return NextResponse.json(
        { error: "Session ID and Business ID are required" },
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

    // Get session details before terminating
    const { data: session, error: sessionError } = await supabase
      .from("staff_sessions")
      .select(
        `
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          role
        )
      `
      )
      .eq("id", sessionId)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found or already terminated" },
        { status: 404 }
      );
    }

    // Terminate the session
    const success = await terminateStaffSession(sessionId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to terminate session" },
        { status: 500 }
      );
    }

    // Log the remote sign-out activity
    await logStaffActivity(
      businessId,
      session.staff_id,
      "remote_signout_by_owner",
      businessOwner.id,
      {
        session_id: sessionId,
        staff_name: `${session.staff.first_name} ${session.staff.last_name}`,
        staff_role: session.staff.role,
        session_duration_minutes: Math.floor(
          (new Date().getTime() - new Date(session.signed_in_at).getTime()) /
            (1000 * 60)
        ),
        terminated_by: "business_owner",
        termination_reason: "remote_signout",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Staff member signed out successfully",
    });
  } catch (error) {
    console.error("Error signing out staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
