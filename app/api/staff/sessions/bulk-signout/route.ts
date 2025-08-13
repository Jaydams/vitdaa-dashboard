import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessOwner } from "@/actions/auth-utils";
import { terminateStaffSession } from "@/actions/staff-auth-utils";
import { logStaffActivity } from "@/lib/staff-activity-tracking";

export async function POST(request: NextRequest) {
  try {
    const { sessionIds, businessId } = await request.json();

    if (
      !sessionIds ||
      !Array.isArray(sessionIds) ||
      sessionIds.length === 0 ||
      !businessId
    ) {
      return NextResponse.json(
        { error: "Session IDs array and Business ID are required" },
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
    const { data: sessions, error: sessionsError } = await supabase
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
      .in("id", sessionIds)
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (sessionsError) {
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: "No active sessions found for the provided IDs" },
        { status: 404 }
      );
    }

    // Terminate all sessions and log activities
    const results = await Promise.allSettled(
      sessions.map(async (session) => {
        const success = await terminateStaffSession(session.id);

        if (success) {
          // Log the bulk sign-out activity
          await logStaffActivity(
            businessId,
            session.staff_id,
            "bulk_signout_by_owner",
            businessOwner.id,
            {
              session_id: session.id,
              staff_name: `${session.staff.first_name} ${session.staff.last_name}`,
              staff_role: session.staff.role,
              session_duration_minutes: Math.floor(
                (new Date().getTime() -
                  new Date(session.signed_in_at).getTime()) /
                  (1000 * 60)
              ),
              terminated_by: "business_owner",
              termination_reason: "bulk_signout",
              total_sessions_terminated: sessions.length,
            }
          );
        }

        return {
          sessionId: session.id,
          success,
          staffName: `${session.staff.first_name} ${session.staff.last_name}`,
        };
      })
    );

    // Count successful and failed terminations
    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value.success
    ).length;

    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      message: `Successfully signed out ${successful} staff member(s)${
        failed > 0 ? `, ${failed} failed` : ""
      }`,
      details: {
        total: sessions.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error("Error bulk signing out staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
