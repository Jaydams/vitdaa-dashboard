import { NextRequest, NextResponse } from "next/server";
import { hybridAuth } from "@/lib/hybrid-auth-system";
import { createClient } from "@/lib/supabase/server";

/**
 * Updated Staff Login API - Layer 3 Authentication
 * Adapted to work with your existing database schema
 * Authenticates staff using PIN and creates session in your existing staff_sessions table
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId, staffId, pin, adminSessionToken } = await request.json();

    if (!businessId || !staffId || !pin || !adminSessionToken) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const deviceInfo = {
      userAgent,
      ipAddress,
      timestamp: new Date().toISOString(),
    };

    // Step 1: Validate admin session
    const adminSessionResult = await hybridAuth.validateAdminSession(adminSessionToken);
    if (!adminSessionResult.valid || !adminSessionResult.session) {
      return NextResponse.json(
        { success: false, error: "Invalid admin session" },
        { status: 401 }
      );
    }

    // Step 2: Verify business ownership
    if (adminSessionResult.session.business_owner_id !== businessId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to business" },
        { status: 403 }
      );
    }

    // Step 3: Authenticate staff and create session
    const authResult = await hybridAuth.authenticateStaff(
      businessId,
      staffId,
      pin,
      adminSessionResult.session.business_owner_id, // signed_in_by
      ipAddress,
      deviceInfo
    );

    if (!authResult.success) {
      // Log failed attempt
      await hybridAuth.logAuditEvent(
        businessId,
        "staff_login_failed",
        { 
          staff_id: staffId, 
          reason: authResult.error,
          ip_address: ipAddress 
        },
        adminSessionResult.session.admin_id,
        staffId,
        ipAddress,
        userAgent
      );

      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    // Get staff details for response
    const supabase = await createClient();
    const { data: staff } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role, position")
      .eq("id", staffId)
      .single();

    // Log successful login
    await hybridAuth.logAuditEvent(
      businessId,
      "staff_login_success",
      { 
        staff_id: staffId,
        session_id: authResult.session?.id,
        shift_id: authResult.session?.shift_id 
      },
      adminSessionResult.session.admin_id,
      staffId,
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      session: authResult.session,
      staff: staff || { id: staffId },
      message: "Staff logged in successfully",
    });
  } catch (error) {
    console.error("Staff login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Staff logout
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("sessionToken");
    const adminSessionToken = searchParams.get("adminSessionToken");

    if (!sessionToken || !adminSessionToken) {
      return NextResponse.json(
        { success: false, error: "Session tokens required" },
        { status: 400 }
      );
    }

    // Validate admin session
    const adminSessionResult = await hybridAuth.validateAdminSession(adminSessionToken);
    if (!adminSessionResult.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid admin session" },
        { status: 401 }
      );
    }

    // Validate staff session
    const staffSessionResult = await hybridAuth.validateStaffSession(sessionToken);
    if (!staffSessionResult.valid || !staffSessionResult.session) {
      return NextResponse.json(
        { success: false, error: "Invalid staff session" },
        { status: 401 }
      );
    }

    // End staff session
    const supabase = await createClient();
    const { error } = await supabase
      .from("staff_sessions")
      .update({ 
        is_active: false, 
        signed_out_at: new Date().toISOString() 
      })
      .eq("session_token", sessionToken);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to end session" },
        { status: 500 }
      );
    }

    // Log logout
    await hybridAuth.logAuditEvent(
      staffSessionResult.session.business_id,
      "staff_logout",
      { 
        staff_id: staffSessionResult.session.staff_id,
        session_id: staffSessionResult.session.id 
      },
      adminSessionResult.session?.admin_id,
      staffSessionResult.session.staff_id
    );

    return NextResponse.json({
      success: true,
      message: "Staff logged out successfully",
    });
  } catch (error) {
    console.error("Staff logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get staff session status
 */
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

    const sessionResult = await hybridAuth.validateStaffSession(sessionToken);

    if (!sessionResult.valid) {
      return NextResponse.json(
        { success: false, error: sessionResult.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: sessionResult.session,
      valid: true,
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}