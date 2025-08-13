import { NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { getBusinessOwnerSettings } from "@/data/settings";

export async function GET() {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getBusinessOwnerSettings(businessOwnerId);

    return NextResponse.json({
      business_name: settings.business_name || "Your Business",
    });
  } catch (error) {
    console.error("Error fetching business settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
