import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json();

    console.log("Setting staff business cookie for:", businessId);

    if (!businessId) {
      console.log("No business ID provided");
      return NextResponse.json(
        { success: false, error: "Business ID is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    // Set secure HTTP-only cookie with business ID
    cookieStore.set("staff_business_id", businessId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    console.log("Cookie set successfully for business ID:", businessId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting staff business cookie:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set cookie" },
      { status: 500 }
    );
  }
} 