import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    console.log("[Switch to Admin] Starting switch to admin process");

    // Get staff session to terminate it
    const cookieStore = await cookies();
    const staffSessionToken = cookieStore.get("staff_session_token")?.value;

    if (staffSessionToken) {
      console.log(
        "[Switch to Admin] Staff session token found, terminating..."
      );
      try {
        const { validateStaffSession, terminateStaffSession } = await import(
          "@/actions/staff-auth-utils"
        );
        const sessionRecord = await validateStaffSession(staffSessionToken);
        if (sessionRecord) {
          await terminateStaffSession(sessionRecord.id);
          console.log("[Switch to Admin] Staff session terminated in database");
        }
      } catch (error) {
        console.error("Error terminating staff session:", error);
      }
    }

    // Also sign out from Supabase to ensure admin needs to re-authenticate
    console.log("[Switch to Admin] Signing out from Supabase");
    const supabase = await createClient();
    await supabase.auth.signOut();

    console.log("[Switch to Admin] Redirecting to admin login");
    const response = NextResponse.redirect(
      new URL("/admin/login", request.url)
    );

    // Explicitly delete the staff session cookie
    response.cookies.delete("staff_session_token");
    response.cookies.set("staff_session_token", "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    console.log("[Switch to Admin] Cookie deletion set in response");
    return response;
  } catch (error) {
    console.error("Switch to admin error:", error);
    return NextResponse.json(
      { error: "Server error occurred" },
      { status: 500 }
    );
  }
}
