import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      return NextResponse.json(
        { error: "Unauthorized: Business owner not found" },
        { status: 401 }
      );
    }

    // Fetch business owner info
    const { data: businessOwner, error } = await supabase
      .from("business_owner")
      .select("business_name, address, phoneNumber, email")
      .eq("id", businessOwnerId)
      .single();

    if (error) {
      console.error("Error fetching business info:", error);

      // If no business owner found, return default values
      if (error.code === "PGRST116") {
        return NextResponse.json({
          business_name: "Your Business",
          business_address: "Business Address",
          business_phone: "+234 000 000 0000",
          business_email: "business@example.com",
        });
      }

      return NextResponse.json(
        { error: "Failed to fetch business info" },
        { status: 500 }
      );
    }

    // Extract address from JSONB if it exists
    let businessAddress = "Business Address";
    if (businessOwner.address && typeof businessOwner.address === "object") {
      // Handle different address formats
      if (typeof businessOwner.address === "string") {
        businessAddress = businessOwner.address;
      } else if (businessOwner.address.street || businessOwner.address.city) {
        const parts = [];
        if (businessOwner.address.street)
          parts.push(businessOwner.address.street);
        if (businessOwner.address.city) parts.push(businessOwner.address.city);
        if (businessOwner.address.state)
          parts.push(businessOwner.address.state);
        businessAddress = parts.join(", ");
      }
    }

    // Return business info in the expected format
    return NextResponse.json({
      business_name: businessOwner.business_name || "Your Business",
      business_address: businessAddress,
      business_phone: businessOwner.phoneNumber || "+234 000 000 0000",
      business_email: businessOwner.email || "business@example.com",
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
