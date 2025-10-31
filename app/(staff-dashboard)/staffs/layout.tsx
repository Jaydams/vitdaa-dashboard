import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createServiceClient } from "@/lib/supabase/server";
import { validateStaffSession } from "@/actions/staff-auth-utils";
import { StaffSession } from "@/types/auth";
import { StaffLayoutHeader } from "@/components/staff/StaffLayoutHeader";

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

  // Create staff session object for the header component
  const staffSession: StaffSession = {
    staff,
    business,
    permissions: [], // You might want to fetch actual permissions here
    sessionType: "staff" as const,
    sessionRecord,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Responsive Header */}
      <StaffLayoutHeader
        business={business}
        staff={staff}
        staffSession={staffSession}
      />

      {/* Main Content - Responsive */}
      <main className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
