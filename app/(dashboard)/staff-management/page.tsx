import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Metadata } from "next";

import { createServiceClient } from "@/lib/supabase/server";
import { StaffManagementDashboard } from "@/components/staff/StaffManagementDashboard";

export const metadata: Metadata = {
  title: "Staff Management - Performance & Analytics",
  description:
    "Manage staff performance, track activities, and analyze team metrics",
};

export default async function StaffManagementPage() {
  // Get admin session from cookies
  const cookieStore = await cookies();
  const adminSessionToken = cookieStore.get("admin_session_token")?.value;

  if (!adminSessionToken) {
    redirect("/admin/login?error=session-required");
  }

  // Validate admin session
  const supabase = await createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("admin_sessions")
    .select("*, business_owner(*)")
    .eq("session_token", adminSessionToken)
    .eq("is_active", true)
    .gte("expires_at", new Date().toISOString())
    .single();

  if (sessionError || !session) {
    redirect("/admin/login?error=session-expired");
  }

  const businessId = session.business_owner_id;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">
          Monitor staff performance, track activities, and manage team
          productivity
        </p>
      </div>

      <StaffManagementDashboard businessId={businessId} />
    </div>
  );
}
