import { NextRequest, NextResponse } from "next/server";
import { hybridAuth } from "@/lib/hybrid-auth-system";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

/**
 * Updated Admin Login API - Layer 1 Authentication
 * Adapted to work with your existing database schema
 * Creates admin session using your existing admin_sessions table structure
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, adminPin, requiredFor } = await request.json();

    if (!email || !password || !adminPin || !requiredFor) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Step 1: Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      await hybridAuth.logAuditEvent(
        "unknown",
        "admin_login_failed",
        { reason: "invalid_credentials", email },
        undefined,
        undefined,
        ipAddress,
        userAgent
      );
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Step 2: Get business owner record
    const { data: businessOwner, error: businessError } = await supabase
      .from("business_owner")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (businessError || !businessOwner) {
      return NextResponse.json(
        { success: false, error: "Business owner not found" },
        { status: 404 }
      );
    }

    // Step 3: Verify admin PIN
    const adminPinHash = createHash("sha256").update(adminPin).digest("hex");
    if (businessOwner.admin_pin_hash !== adminPinHash) {
      await hybridAuth.logAuditEvent(
        businessOwner.id,
        "admin_pin_failed",
        { email, ip_address: ipAddress },
        authData.user.id,
        undefined,
        ipAddress,
        userAgent
      );
      return NextResponse.json(
        { success: false, error: "Invalid admin PIN" },
        { status: 401 }
      );
    }

    // Step 4: Create admin session using your existing table structure
    const sessionResult = await hybridAuth.createAdminSession(
      businessOwner.id,
      requiredFor,
      authData.user.id,
      ipAddress,
      userAgent
    );

    if (!sessionResult.success) {
      return NextResponse.json(
        { success: false, error: sessionResult.error },
        { status: 500 }
      );
    }

    // Log successful login
    await hybridAuth.logAuditEvent(
      businessOwner.id,
      "admin_login_success",
      { 
        email, 
        required_for: requiredFor,
        session_id: sessionResult.session?.id 
      },
      authData.user.id,
      undefined,
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      session: sessionResult.session,
      business: {
        id: businessOwner.id,
        name: businessOwner.business_name,
        email: businessOwner.email,
      },
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get current admin session status
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

    const sessionResult = await hybridAuth.validateAdminSession(sessionToken);

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