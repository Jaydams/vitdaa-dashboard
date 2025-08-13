import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Metadata } from "next";

import { createServiceClient } from "@/lib/supabase/server";
import { validateStaffSession } from "@/actions/staff-auth-utils";
import { StaffSession } from "@/types/auth";
import RoleBasedDashboard from "@/components/staff/RoleBasedDashboard";

export const metadata: Metadata = {
  title: "Staff Dashboard",
};

export default async function StaffDashboardPage() {
  // Get staff session from cookies or session storage
  const cookieStore = await cookies();
  const staffSessionToken = cookieStore.get("staff_session_token")?.value;

  console.log("Staffs page - Token found:", !!staffSessionToken);

  if (!staffSessionToken) {
    console.log("Staffs page - No token found, redirecting");
    redirect("/staff/login?error=session-required");
  }

  // Validate staff session
  const sessionRecord = await validateStaffSession(staffSessionToken);

  console.log("Staffs page - Session record:", !!sessionRecord);
  console.log("Staffs page - Session details:", sessionRecord ? {
    id: sessionRecord.id,
    staff_id: sessionRecord.staff_id,
    is_active: sessionRecord.is_active,
    expires_at: sessionRecord.expires_at
  } : null);

  if (!sessionRecord) {
    console.log("Staffs page - Invalid session record, redirecting");
    redirect("/staff/login?error=session-expired");
  }

  // Get staff and business information
  const supabase = await createServiceClient();

  console.log("Staffs page - Fetching staff data for ID:", sessionRecord.staff_id);
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("id", sessionRecord.staff_id)
    .single();

  console.log("Staffs page - Staff found:", !!staff);
  console.log("Staffs page - Staff error:", staffError);
  console.log("Staffs page - Staff details:", staff ? {
    id: staff.id,
    email: staff.email,
    is_active: staff.is_active,
    role: staff.role
  } : null);

  if (staffError || !staff) {
    console.log("Staffs page - Staff not found, redirecting");
    redirect("/staff/login?error=staff-not-found");
  }

  console.log("Staffs page - Fetching business data for ID:", sessionRecord.business_id);
  const { data: business, error: businessError } = await supabase
    .from("business_owner")
    .select("*")
    .eq("id", sessionRecord.business_id)
    .single();

  console.log("Staffs page - Business found:", !!business);
  console.log("Staffs page - Business error:", businessError);

  if (businessError || !business) {
    console.log("Staffs page - Business not found, redirecting");
    redirect("/staff/login?error=business-not-found");
  }

  // Create staff session object
  const staffSession: StaffSession = {
    staff,
    business,
    permissions: staff.permissions,
    sessionType: "staff",
    sessionRecord,
  };

  console.log("Staffs page - Success, rendering dashboard");
  return <RoleBasedDashboard staffSession={staffSession} />;
}
