import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  verifyAdminPin,
  generateSessionToken,
} from "@/actions/staff-auth-utils";

export async function POST(request: NextRequest) {
  try {
    const { businessOwnerId, adminPin } = await request.json();

    if (!businessOwnerId || !adminPin) {
      return NextResponse.json(
        { error: "Business owner ID and admin PIN are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Failed to create Supabase client" },
        { status: 500 }
      );
    }

    // Get the business owner's admin PIN hash
    const { data: businessOwner, error } = await supabase
      .from("business_owner")
      .select("admin_pin_hash")
      .eq("id", businessOwnerId)
      .single();

    if (error || !businessOwner) {
      return NextResponse.json(
        { error: "Business owner not found" },
        { status: 404 }
      );
    }

    if (!businessOwner.admin_pin_hash) {
      return NextResponse.json(
        { error: "Admin PIN not set for this business owner" },
        { status: 400 }
      );
    }

    // Verify the admin PIN
    const isValidPin = await verifyAdminPin(
      adminPin,
      businessOwner.admin_pin_hash
    );

    if (!isValidPin) {
      return NextResponse.json({ error: "Invalid admin PIN" }, { status: 401 });
    }

    // Generate a temporary elevated session token (valid for 15 minutes)
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the elevated session in the database
    const { error: sessionError } = await supabase
      .from("admin_sessions")
      .insert({
        business_owner_id: businessOwnerId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

    if (sessionError) {
      console.error("Error creating admin session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create elevated session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      message: "Admin PIN verified successfully",
    });
  } catch (error) {
    console.error("Error in admin PIN verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
