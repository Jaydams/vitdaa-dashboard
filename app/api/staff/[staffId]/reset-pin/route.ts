import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { generateSecurePin, hashPin } from "@/actions/staff-auth-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // First verify the staff member exists and belongs to this business
    const { error: fetchError } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .eq("business_id", businessOwnerId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Staff member not found" },
          { status: 404 }
        );
      }
      console.error("Database error:", fetchError);
      return NextResponse.json(
        { error: "Failed to verify staff member" },
        { status: 500 }
      );
    }

    // Generate new PIN
    const newPin = generateSecurePin(4);
    const hashedPin = await hashPin(newPin);

    // Update staff PIN
    const { error: updateError } = await supabase
      .from("staff")
      .update({
        pin_hash: hashedPin,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId)
      .eq("business_id", businessOwnerId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update staff PIN" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pin: newPin });
  } catch (error) {
    console.error("Error in POST /api/staff/[staffId]/reset-pin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 