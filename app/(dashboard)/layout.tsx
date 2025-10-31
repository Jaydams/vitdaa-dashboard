import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import Header from "@/components/shared/header";
import AppSidebar from "@/components/shared/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import NewOrderModal from "@/components/notifications/NewOrderModal";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { ResponsiveDashboardProvider } from "@/components/responsive/ResponsiveDashboardProvider";

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
        <AppSidebar />
        <SidebarInset>
          <Header />
          <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </SidebarInset>

        {/* Order notification modal */}
        {businessId && <NewOrderModal businessId={businessId} />}
      </SidebarProvider>
    </ResponsiveDashboardProvider>
  );
}
