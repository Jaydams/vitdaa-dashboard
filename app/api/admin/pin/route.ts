import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashAdminPin, verifyAdminPin } from "@/actions/staff-auth-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, adminPin, confirmPin, currentPin, newPin } = body;

    // Validate required fields based on action
    if (action === "set") {
      if (!adminPin || !confirmPin) {
        return NextResponse.json(
          { error: "Admin PIN and confirmation are required" },
          { status: 400 }
        );
      }

      if (adminPin !== confirmPin) {
        return NextResponse.json(
          { error: "PINs don't match" },
          { status: 400 }
        );
      }

      if (adminPin.length < 4 || adminPin.length > 8) {
        return NextResponse.json(
          { error: "Admin PIN must be between 4 and 8 digits" },
          { status: 400 }
        );
      }

      if (!/^\d+$/.test(adminPin)) {
        return NextResponse.json(
          { error: "Admin PIN must contain only numbers" },
          { status: 400 }
        );
      }
    } else if (action === "update") {
      if (!currentPin || !newPin) {
        return NextResponse.json(
          { error: "Current PIN and new PIN are required" },
          { status: 400 }
        );
      }

      if (newPin.length < 4 || newPin.length > 8) {
        return NextResponse.json(
          { error: "New PIN must be between 4 and 8 digits" },
          { status: 400 }
        );
      }

      if (!/^\d+$/.test(newPin)) {
        return NextResponse.json(
          { error: "New PIN must contain only numbers" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get current user and validate business owner
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

    // Get business owner data
    const { data: businessOwner, error: businessError } = await supabase
      .from("business_owner")
      .select("*")
      .eq("id", user.id)
      .single();

    if (businessError || !businessOwner) {
      return NextResponse.json(
        { error: "Business owner not found" },
        { status: 404 }
      );
    }

    if (action === "set") {
      // Check if admin PIN is already set
      if (businessOwner.admin_pin_hash) {
        return NextResponse.json(
          { error: "Admin PIN is already set. Use update instead." },
          { status: 400 }
        );
      }

      // Hash the admin PIN
      const hashedAdminPin = await hashAdminPin(adminPin);

      // Update business owner with admin PIN
      const { error: updateError } = await supabase
        .from("business_owner")
        .update({
          admin_pin_hash: hashedAdminPin,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Admin PIN setup error:", updateError);
        return NextResponse.json(
          { error: "Failed to set admin PIN" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Admin PIN set successfully",
      });
    } else if (action === "update") {
      // Check if admin PIN is set
      if (!businessOwner.admin_pin_hash) {
        return NextResponse.json(
          { error: "Admin PIN not set. Use set action instead." },
          { status: 400 }
        );
      }

      // Verify current PIN
      const isValidCurrentPin = await verifyAdminPin(
        currentPin,
        businessOwner.admin_pin_hash
      );
      if (!isValidCurrentPin) {
        return NextResponse.json(
          { error: "Current PIN is incorrect" },
          { status: 401 }
        );
      }

      // Hash the new admin PIN
      const hashedNewPin = await hashAdminPin(newPin);

      // Update business owner with new admin PIN
      const { error: updateError } = await supabase
        .from("business_owner")
        .update({
          admin_pin_hash: hashedNewPin,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Admin PIN update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update admin PIN" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Admin PIN updated successfully",
      });
    }
  } catch (error) {
    console.error("Admin PIN API error:", error);
    return NextResponse.json(
      { error: "Server error occurred" },
      { status: 500 }
    );
  }
}
