import { NextRequest, NextResponse } from "next/server";
import { hybridAuth } from "@/lib/hybrid-auth-system";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionToken, shiftId } = await request.json();

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token is required" },
        { status: 400 }
      );
    }

    // Get Supabase client and validate user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Get business owner record
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

    let success: boolean;

    if (shiftId) {
      // End specific shift
      const endResult = await hybridAuth.endShift(shiftId, user.id);
      success = endResult.success;
    } else {
      // End all active shifts for this business
      // First get the active shift
      const shiftStatus = await hybridAuth.getShiftStatus(businessOwner.id);
      if (shiftStatus.is_active && shiftStatus.shift) {
        const endResult = await hybridAuth.endShift(shiftStatus.shift.id, user.id);
        success = endResult.success;
      } else {
        success = true; // No active shift to end
      }
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to end shift(s)" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: shiftId
        ? "Shift ended successfully"
        : "All active shifts ended successfully",
    });
  } catch (error) {
    console.error("Error ending shift:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
