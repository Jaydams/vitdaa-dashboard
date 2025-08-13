import { updateSession } from "@/lib/supabase/middleware";
import { staffSessionMiddleware } from "@/lib/supabase/staff-middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if there's an active staff session
  const staffSessionToken = request.cookies.get("staff_session_token")?.value;

  // Debug logging for admin login issues
  if (pathname.startsWith("/admin/login")) {
    console.log(
      `[Middleware] Admin login request - has staff token: ${!!staffSessionToken}`
    );
  }

  if (staffSessionToken) {
    // If staff session exists, only allow access to staff routes or admin authentication
    if (pathname.startsWith("/staffs")) {
      return await staffSessionMiddleware(request);
    } else if (
      pathname.startsWith("/admin/login") ||
      pathname.startsWith("/staff-login") ||
      pathname.startsWith("/api/admin") ||
      pathname.startsWith("/api/auth/hybrid/staff") ||
      pathname.startsWith("/api/auth/hybrid/shifts") ||
      pathname.startsWith("/api/business/info") ||
      pathname.startsWith("/api/staff/signout") ||
      pathname.startsWith("/api/staff/switch-to-admin") ||
      pathname === "/login"
    ) {
      // Allow admin authentication routes, staff signout, and main login
      // Don't validate session here - let the routes handle it
      console.log(`[Middleware] Allowing access to admin route: ${pathname}`);
      
      // For API routes, don't apply Supabase authentication
      if (pathname.startsWith("/api/")) {
        return NextResponse.next();
      }
      
      return await updateSession(request);
    } else {
      // For all other routes, validate the session first
      try {
        const { validateStaffSession } = await import(
          "@/actions/staff-auth-utils"
        );
        const sessionRecord = await validateStaffSession(staffSessionToken);

        // If session is invalid, clear the cookie and proceed normally
        if (!sessionRecord) {
          const response = NextResponse.next();
          response.cookies.delete("staff_session_token");
          return await updateSession(request);
        }

        // If session is valid, redirect to staff dashboard
        const url = request.nextUrl.clone();
        url.pathname = "/staffs";
        return NextResponse.redirect(url);
      } catch (error) {
        // If there's an error validating the session, clear the cookie and proceed normally
        console.error("Staff session validation error:", error);
        const response = NextResponse.next();
        response.cookies.delete("staff_session_token");
        return await updateSession(request);
      }
    }
  }

  // Handle staff dashboard routes with staff session middleware
  if (pathname.startsWith("/staffs")) {
    return await staffSessionMiddleware(request);
  }

  // Handle regular business owner routes with Supabase middleware
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
