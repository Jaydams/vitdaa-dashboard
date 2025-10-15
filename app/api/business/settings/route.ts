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

    // Fetch business settings and business owner info
    const [settingsResult, ownerResult] = await Promise.all([
      supabase
        .from("business_settings")
        .select("*")
        .eq("business_id", businessOwnerId)
        .single(),
      supabase
        .from("business_owner")
        .select("business_name, address, phoneNumber, email")
        .eq("id", businessOwnerId)
        .single(),
    ]);

    const { data: businessSettings, error: settingsError } = settingsResult;
    const { data: businessOwner, error: ownerError } = ownerResult;

    // Handle business settings error
    if (settingsError && settingsError.code !== "PGRST116") {
      console.error("Error fetching business settings:", settingsError);
      return NextResponse.json(
        { error: "Failed to fetch business settings" },
        { status: 500 }
      );
    }

    // Handle business owner error
    if (ownerError && ownerError.code !== "PGRST116") {
      console.error("Error fetching business owner:", ownerError);
      return NextResponse.json(
        { error: "Failed to fetch business owner info" },
        { status: 500 }
      );
    }

    // Extract address from JSONB if it exists
    let businessAddress = "";
    if (businessOwner?.address && typeof businessOwner.address === "object") {
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

    // Combine settings with business owner info
    const combinedSettings = {
      // Business settings fields
      id: businessSettings?.id,
      business_id: businessSettings?.business_id || businessOwnerId,
      vat_rate: businessSettings?.vat_rate || 7.5,
      service_charge_rate: businessSettings?.service_charge_rate || 2.5,
      enabled_dining_options: businessSettings?.enabled_dining_options || [
        "indoor",
        "delivery",
        "pickup",
      ],
      default_takeaway_pack_price:
        businessSettings?.default_takeaway_pack_price || 100,
      created_at: businessSettings?.created_at,
      updated_at: businessSettings?.updated_at,

      // Business owner info fields
      business_name: businessOwner?.business_name || "Your Business",
      business_address: businessAddress,
      business_phone: businessOwner?.phoneNumber || "",
      business_email: businessOwner?.email || "",

      // Additional fields for compatibility
      currency: "NGN",
      timezone: "Africa/Lagos",
    };

    return NextResponse.json(combinedSettings);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
