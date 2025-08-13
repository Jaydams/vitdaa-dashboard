import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Get basic business information for staff login page
 * This is a public endpoint that only returns non-sensitive business info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("id");

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "Business ID required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get basic business info (only public fields)
    const { data: business, error } = await supabase
      .from("business_owner")
      .select("id, business_name, business_type")
      .eq("id", businessId)
      .single();

    if (error || !business) {
      return NextResponse.json(
        { success: false, error: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        business_name: business.business_name,
        business_type: business.business_type,
      },
    });
  } catch (error) {
    console.error("Business info error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}