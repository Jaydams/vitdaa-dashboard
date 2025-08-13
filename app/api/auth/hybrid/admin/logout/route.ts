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

    // Validate admin session
    const adminSession = await hybridAuth.validateAdminSession(sessionToken);
    if (!adminSession.valid || !adminSession.session) {
      return NextResponse.json(
        { success: false, error: "Invalid admin session" },
        { status: 401 }
      );
    }

    // End admin session
    const success = await hybridAuth.endAdminSession(sessionToken);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Admin logged out successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to end session" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
