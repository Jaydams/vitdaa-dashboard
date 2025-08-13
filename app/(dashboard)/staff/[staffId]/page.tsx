import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Users, User } from "lucide-react";
import StaffProfileHub from "../_components/StaffProfileHub";
import Breadcrumb from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

interface StaffProfilePageProps {
  params: Promise<{
    staffId: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export async function generateMetadata({
  params,
}: StaffProfilePageProps): Promise<Metadata> {
  const { staffId } = await params;

  try {
    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return {
        title: "Staff Profile",
        description: "Staff member profile and management",
      };
    }

    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return {
        title: "Staff Profile",
        description: "Staff member profile and management",
      };
    }

    const supabase = await createClient();

    // Fetch staff data for dynamic title
    const { data: staff, error } = await supabase
      .from("staff")
      .select("first_name, last_name, role")
      .eq("id", staffId)
      .eq("business_id", businessOwnerId)
      .single();

    if (!error && staff) {
      const roleDisplayNameMap: Record<string, string> = {
        reception: "Reception",
        kitchen: "Kitchen Staff",
        bar: "Bar Staff",
        accountant: "Accountant",
        storekeeper: "Storekeeper",
        waiter: "Waiter",
      };
      
      const roleDisplayName = roleDisplayNameMap[staff.role] || staff.role;

      return {
        title: `${staff.first_name} ${staff.last_name} - Staff Profile`,
        description: `Staff profile for ${staff.first_name} ${staff.last_name} - ${roleDisplayName}`,
      };
    }
  } catch (error) {
    console.error("Error fetching staff data for metadata:", error);
  }

  // Fallback title if fetch fails
  return {
    title: "Staff Profile",
    description: "Staff member profile and management",
  };
}

export default async function StaffProfilePage({
  params,
  searchParams,
}: StaffProfilePageProps) {
  const { staffId } = await params;
  const { tab } = await searchParams;

  // Validate staffId format (UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(staffId)) {
    notFound();
  }

  const validTabs = [
    "profile",
    "salary",
    "schedule",
    "attendance",
    "performance",
    "sessions",
    "documents",
    "permissions",
  ];
  const initialTab =
    tab && validTabs.includes(tab)
      ? (tab as
          | "profile"
          | "salary"
          | "schedule"
          | "attendance"
          | "performance"
          | "sessions"
          | "documents"
          | "permissions")
      : "profile";

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          {
            label: "Staff Management",
            href: "/staff",
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: "Staff Profile",
            icon: <User className="h-4 w-4" />,
          },
        ]}
      />
      <StaffProfileHub staffId={staffId} initialTab={initialTab} />
    </div>
  );
}
