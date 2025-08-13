import { NextRequest, NextResponse } from "next/server";
import { hybridAuth } from "@/lib/hybrid-auth-system";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("sessionToken");

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Session token required" },
        { status: 400 }
      );
    }

    // Validate admin session
    const adminSession = await hybridAuth.validateAdminSession(sessionToken);
    if (!adminSession.valid || !adminSession.session) {
      return NextResponse.json(
        { success: false, error: "Invalid admin session" },
        { status: 401 }
      );
    }

    // Get active sessions for the business
    const activeSessions = await hybridAuth.getActiveSessions(
      adminSession.session.business_owner_id
    );

    return NextResponse.json({
      success: true,
      sessions: activeSessions,
    });
  } catch (error) {
    console.error("Active sessions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
