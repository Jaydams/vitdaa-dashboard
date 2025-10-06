import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import Header from "@/components/shared/header";
import Container from "@/components/ui/container";
import AppSidebar from "@/components/shared/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import NewOrderModal from "@/components/notifications/NewOrderModal";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

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
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />

      <div className="w-full relative overflow-y-auto">
        <Header />

        <main className="pt-6 pb-8">
          <Container>{children}</Container>
        </main>

        {/* Order notification modal */}
        {businessId && <NewOrderModal businessId={businessId} />}
      </div>
    </SidebarProvider>
  );
}
