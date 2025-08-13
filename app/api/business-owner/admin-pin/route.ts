import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { businessOwnerId, adminPinHash } = await request.json();

    if (!businessOwnerId || !adminPinHash) {
      return NextResponse.json(
        { error: "Business owner ID and admin PIN hash are required" },
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

    // Update the business owner with the admin PIN hash
    const { data, error } = await supabase
      .from("business_owner")
      .update({
        admin_pin_hash: adminPinHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessOwnerId)
      .select()
      .single();

    if (error) {
      console.error("Error updating admin PIN:", error);
      return NextResponse.json(
        { error: "Failed to set admin PIN" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin PIN set successfully",
    });
  } catch (error) {
    console.error("Error in admin PIN setup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
