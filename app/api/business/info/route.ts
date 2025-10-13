import { NextResponse } from "next/server";
import { getBusinessInfo } from "@/lib/business-info-server";

export async function GET() {
  try {
    const businessInfo = await getBusinessInfo();

    if (!businessInfo) {
      return NextResponse.json(
        { error: "Business information not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(businessInfo);
  } catch (error) {
    console.error("Error fetching business info:", error);
    return NextResponse.json(
      { error: "Failed to fetch business information" },
      { status: 500 }
    );
  }
}
