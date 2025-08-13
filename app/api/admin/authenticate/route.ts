import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminPin } from "@/actions/staff-auth-utils";

export async function POST(request: NextRequest) {
  try {
    console.log("[Admin Auth] Starting admin authentication");
    const formData = await request.formData();
    const credential = formData.get("credential") as string;
    const usePassword = formData.get("usePassword") === "true";

    console.log("[Admin Auth] Credential provided:", !!credential);
    console.log("[Admin Auth] Use password:", usePassword);

    if (!credential) {
      return NextResponse.json(
        {
          error: usePassword ? "Password is required" : "Admin PIN is required",
        },
        { status: 400 }
      );
    }

    // Get staff session to find the business owner
    const cookieStore = await cookies();
    const staffSessionToken = cookieStore.get("staff_session_token")?.value;

    let businessOwnerId: string;

    if (staffSessionToken) {
      // If there's a staff session, get business owner from staff session
      const { validateStaffSession } = await import(
        "@/actions/staff-auth-utils"
      );
      const sessionRecord = await validateStaffSession(staffSessionToken);

      if (!sessionRecord) {
        return NextResponse.json(
          { error: "Invalid staff session" },
          { status: 401 }
        );
      }

      businessOwnerId = sessionRecord.business_id;
    } else {
      // Fallback to Supabase session
      const supabase = await createClient();
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

      businessOwnerId = user.id;
    }

    // Get business owner data
    const supabase = await createClient();
    const { data: businessOwner, error: businessError } = await supabase
      .from("business_owner")
      .select("*, email")
      .eq("id", businessOwnerId)
      .single();

    if (businessError || !businessOwner) {
      return NextResponse.json(
        { error: "Business owner not found" },
        { status: 404 }
      );
    }

    let isAuthenticated = false;

    if (usePassword) {
      // Get user email for password authentication
      const { data: authUser } = await supabase.auth.getUser();

      if (!authUser.user?.email) {
        return NextResponse.json(
          { error: "User email not found" },
          { status: 400 }
        );
      }

      // Use Supabase password authentication
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.user.email,
        password: credential,
      });

      isAuthenticated = !signInError;
    } else {
      // Use admin PIN authentication
      if (!businessOwner.admin_pin_hash) {
        return NextResponse.json(
          { error: "Admin PIN not set" },
          { status: 400 }
        );
      }

      const isValidPin = await verifyAdminPin(
        credential,
        businessOwner.admin_pin_hash
      );
      isAuthenticated = isValidPin;
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: usePassword ? "Invalid password" : "Invalid admin PIN" },
        { status: 401 }
      );
    }

    console.log(
      "[Admin Auth] Authentication successful, clearing staff session"
    );

    // Clear staff session token to switch back to admin mode
    // Also terminate the session in the database if it exists
    if (staffSessionToken) {
      console.log("[Admin Auth] Staff session token found, terminating...");
      try {
        const { validateStaffSession, terminateStaffSession } = await import(
          "@/actions/staff-auth-utils"
        );
        const sessionRecord = await validateStaffSession(staffSessionToken);
        if (sessionRecord) {
          await terminateStaffSession(sessionRecord.id);
          console.log("[Admin Auth] Staff session terminated in database");
        }
      } catch (error) {
        console.error("Error terminating staff session:", error);
      }
    }

    console.log("[Admin Auth] Redirecting to dashboard");
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    // Explicitly delete the staff session cookie with multiple methods
    response.cookies.delete("staff_session_token");
    response.cookies.set("staff_session_token", "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    console.log("[Admin Auth] Cookie deletion set in response");
    return response;
  } catch (error) {
    console.error("Admin authentication error:", error);
    return NextResponse.json(
      { error: "Server error occurred" },
      { status: 500 }
    );
  }
}
