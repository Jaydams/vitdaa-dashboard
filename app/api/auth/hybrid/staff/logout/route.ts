import { NextRequest, NextResponse } from "next/server";
import { hybridAuth } from "@/lib/hybrid-auth-system";

export async function POST(request: NextRequest) {
  try {
    const { sessionToken } = await request.json();

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Session token required" },
        { status: 400 }
      );
    }

    // Validate staff session
    const staffSession = await hybridAuth.validateStaffSession(sessionToken);
    if (!staffSession.valid || !staffSession.session) {
      return NextResponse.json(
        { success: false, error: "Invalid staff session" },
        { status: 401 }
      );
    }

    // End staff session
    const success = await hybridAuth.endStaffSession(sessionToken);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Staff logged out successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to end session" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Staff logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
