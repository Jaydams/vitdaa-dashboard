import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createServiceClient } from "@/lib/supabase/server";
import { validateStaffSession } from "@/actions/staff-auth-utils";
import { StaffSession } from "@/types/auth";

export default async function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get staff session from cookies or session storage
  // This is a simplified approach - in production you'd use proper session management
  const cookieStore = await cookies();
  const staffSessionToken = cookieStore.get("staff_session_token")?.value;

  if (!staffSessionToken) {
    redirect("/staff/login?error=session-required");
  }

  // Validate staff session
  const sessionRecord = await validateStaffSession(staffSessionToken);

  if (!sessionRecord) {
    redirect("/staff/login?error=session-expired");
  }

  // Get staff and business information
  const supabase = await createServiceClient();

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("id", sessionRecord.staff_id)
    .single();

  if (staffError || !staff) {
    redirect("/staff/login?error=staff-not-found");
  }

  const { data: business, error: businessError } = await supabase
    .from("business_owner")
    .select("*")
    .eq("id", sessionRecord.business_id)
    .single();

  if (businessError || !business) {
    redirect("/staff/login?error=business-not-found");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              {business.business_name} - Staff Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {staff.first_name} {staff.last_name} ({staff.role})
            </span>
            <form action="/api/staff/switch-to-admin" method="post">
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground"
                title="Switch back to admin mode"
              >
                Switch to Admin
              </button>
            </form>
            {/* <form action="/api/staff/signout" method="post">
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground"
                title="Sign out completely (admin will need to log in again)"
              >
                Sign Out Completely
              </button>
            </form> */}
          </div>
        </div>
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
}
