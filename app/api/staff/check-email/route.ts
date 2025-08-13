import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessOwner } from "@/actions/auth-actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and validate business owner
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

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Check if email already exists for this business
    const { data: existingStaff, error } = await supabase
      .from("staff")
      .select("id, email")
      .eq("business_id", businessOwner.id)
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected
      console.error("Error checking email:", error);
      return NextResponse.json(
        { error: "Failed to check email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!existingStaff,
      email: email,
    });
  } catch (error) {
    console.error("Error in check-email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
