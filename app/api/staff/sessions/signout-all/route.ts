import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessOwner } from "@/actions/auth-utils";
import { getActiveStaffSessions } from "@/actions/staff-auth-utils";
import { logStaffActivity } from "@/lib/staff-activity-tracking";

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json();

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

    // Get all active sessions for the business
    const activeSessions = await getActiveStaffSessions(businessId);

    if (activeSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active sessions to terminate",
        details: {
          total: 0,
          successful: 0,
          failed: 0,
        },
      });
    }

    // Terminate all active sessions
    const now = new Date().toISOString();
    const { data: terminatedSessions, error: terminateError } = await supabase
      .from("staff_sessions")
      .update({
        is_active: false,
        signed_out_at: now,
      })
      .eq("business_id", businessId)
      .eq("is_active", true).select(`
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          role
        )
      `);

    if (terminateError) {
      console.error("Error terminating all sessions:", terminateError);
      return NextResponse.json(
        { error: "Failed to terminate sessions" },
        { status: 500 }
      );
    }

    // Log activities for all terminated sessions
    const logPromises = (terminatedSessions || []).map(async (session) => {
      await logStaffActivity(
        businessId,
        session.staff_id,
        "signout_all_by_owner",
        businessOwner.id,
        {
          session_id: session.id,
          staff_name: `${session.staff.first_name} ${session.staff.last_name}`,
          staff_role: session.staff.role,
          session_duration_minutes: Math.floor(
            (new Date(now).getTime() -
              new Date(session.signed_in_at).getTime()) /
              (1000 * 60)
          ),
          terminated_by: "business_owner",
          termination_reason: "signout_all",
          total_sessions_terminated: terminatedSessions?.length || 0,
        }
      );
    });

    // Wait for all logging to complete (but don't fail if logging fails)
    await Promise.allSettled(logPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully signed out all ${
        terminatedSessions?.length || 0
      } staff member(s)`,
      details: {
        total: activeSessions.length,
        successful: terminatedSessions?.length || 0,
        failed: 0,
      },
    });
  } catch (error) {
    console.error("Error signing out all staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
