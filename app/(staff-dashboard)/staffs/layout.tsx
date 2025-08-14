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
      {/* Responsive Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Business Name and Staff Info - Responsive */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold truncate">
                  {business.business_name} - Staff Dashboard
                </h1>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-semibold truncate">
                  {business.business_name}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  Staff Dashboard
                </p>
              </div>
            </div>

            {/* Staff Details and Actions - Responsive */}
            <div className="flex items-center gap-2 sm:gap-4 ml-4">
              {/* Staff Info - Hidden on mobile, shown on tablet+ */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">
                  {staff.first_name} {staff.last_name}
                </span>
                <span className="hidden lg:inline">({staff.role})</span>
              </div>
              
              {/* Staff Info - Mobile version */}
              <div className="md:hidden flex items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate max-w-20">
                  {staff.first_name}
                </span>
                <span className="hidden sm:inline">({staff.role})</span>
              </div>

              {/* Switch to Admin Button */}
              <form action="/api/staff/switch-to-admin" method="post" className="flex-shrink-0">
                <button
                  type="submit"
                  className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                  title="Switch back to admin mode"
                >
                  <span className="hidden sm:inline">Switch to Admin</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
