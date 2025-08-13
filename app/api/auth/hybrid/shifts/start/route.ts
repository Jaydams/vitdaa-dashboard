import { NextRequest, NextResponse } from "next/server";
import { hybridAuth } from "@/lib/hybrid-auth-system";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const {
      sessionToken,
      shiftName,
      maxStaffSessions = 50,
      autoEndHours,
    } = await request.json();

    if (!sessionToken || !shiftName) {
      return NextResponse.json(
        { error: "Session token and shift name are required" },
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

    // Start the shift using the business owner ID
    const shiftResult = await hybridAuth.startShift(
      businessOwner.id,
      user.id,
      shiftName,
      maxStaffSessions,
      autoEndHours
    );

    if (!shiftResult.success || !shiftResult.shift) {
      return NextResponse.json(
        { error: shiftResult.error || "Failed to start shift" },
        { status: 500 }
      );
    }

    const shift = shiftResult.shift;

    return NextResponse.json({
      success: true,
      shift: {
        id: shift.id,
        name: shift.shift_name,
        started_at: shift.started_at,
        max_staff_sessions: shift.max_staff_sessions,
        auto_end_time: shift.auto_end_time,
        is_active: shift.is_active,
      },
      message: `Shift "${shiftName}" started successfully`,
    });
  } catch (error) {
    console.error("Error starting shift:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
