import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import Header from "@/components/shared/header";
import AppSidebar from "@/components/shared/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import NewOrderModal from "@/components/notifications/NewOrderModal";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { ResponsiveDashboardProvider } from "@/components/responsive/ResponsiveDashboardProvider";
import { AdaptiveDashboardLayout } from "@/components/responsive/AdaptiveLayouts";
import { ResponsiveContainer } from "@/components/responsive/ResponsiveLayout";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  // Get business ID for notifications and validate authentication/authorization
  const businessId = await getServerBusinessOwnerId();

  // If no business ID, user is not authenticated or not a business owner
  if (!businessId) {
    return redirect("/login");
  }

  return (
    <ResponsiveDashboardProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AdaptiveDashboardLayout sidebar={<AppSidebar />} header={<Header />}>
          <ResponsiveContainer
            padding={{
              mobile: "px-4 py-6",
              tablet: "px-6 py-6",
              desktop: "px-8 py-8",
            }}
          >
            {children}
          </ResponsiveContainer>

          {/* Order notification modal */}
          {businessId && <NewOrderModal businessId={businessId} />}
        </AdaptiveDashboardLayout>
      </SidebarProvider>
    </ResponsiveDashboardProvider>
  );
}
