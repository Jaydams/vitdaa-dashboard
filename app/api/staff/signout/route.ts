import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  terminateStaffSession,
  validateStaffSession,
} from "@/actions/staff-auth-utils";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get staff session token from cookies
    const cookieStore = await cookies();
    const staffSessionToken = cookieStore.get("staff_session_token")?.value;

    if (staffSessionToken) {
      // Validate and get session info
      const sessionRecord = await validateStaffSession(staffSessionToken);

      if (sessionRecord) {
        // Terminate the session in the database
        await terminateStaffSession(sessionRecord.id);
      }

      // Clear the staff session cookie
      cookieStore.delete("staff_session_token");
    }

    // Also sign out the admin/business owner from Supabase
    const supabase = await createServiceClient();
    await supabase.auth.signOut();

    // Redirect to staff login page
    return NextResponse.redirect(
      new URL("/staff-login?message=signed-out", request.url)
    );
  } catch (error) {
    console.error("Staff signout error:", error);

    // Clear cookies even if there's an error
    const cookieStore = await cookies();
    cookieStore.delete("staff_session_token");

    // Also try to sign out from Supabase
    try {
      const supabase = await createServiceClient();
      await supabase.auth.signOut();
    } catch (supabaseError) {
      console.error("Supabase signout error:", supabaseError);
    }

    return NextResponse.redirect(
      new URL("/staff-login?error=signout-error", request.url)
    );
  }
}
