import { NextRequest, NextResponse } from "next/server";
import { hybridAuth } from "@/lib/hybrid-auth-system";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Get shift status
    const shiftStatus = await hybridAuth.getShiftStatus(businessId);

    return NextResponse.json({
      success: true,
      ...shiftStatus,
    });
  } catch (error) {
    console.error("Error getting shift status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
