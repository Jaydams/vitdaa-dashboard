import { Fragment } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageTitle from "@/components/shared/PageTitle";
import SalesOverview from "./_components/SalesOverview";
import StatusOverview from "./_components/StatusOverview";
import DashboardCharts from "./_components/dashboard-charts";
import RecentOrders from "@/app/(dashboard)/orders/_components/orders-table";
import { createClient } from "@/lib/supabase/server";
import { validateUserProfile } from "@/actions/auth-utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Check authentication and authorization
  // const supabase = await createClient();

  // try {
  //   const {
  //     data: { user },
  //     error: userError,
  //   } = await supabase.auth.getUser();

  // If no user or error getting user, redirect to login
  // if (userError || !user) {
  //   console.log("No authenticated user found, redirecting to login");
  //   redirect("/login");
  // }

  // Validate user profile and business owner status
  // const profileValidation = await validateUserProfile(user.id);

  // // If user is not a business owner, deny access
  // if (
  //   !profileValidation.isBusinessOwner ||
  //   !profileValidation.hasBusinessProfile
  // ) {
  //   console.log(`Access denied: User ${user.email} is not a business owner`);
  //   redirect(
  //     "/error?message=" +
  //       encodeURIComponent(
  //         "Access denied. This dashboard is only available to business owners."
  //       )
  //   );
  // }

  // console.log(`Dashboard access granted to business owner: ${user.email}`);

  // Render dashboard content
  return (
    <Fragment>
      <section>
        <PageTitle>Dashboard Overview</PageTitle>

        <div className="space-y-8 mb-8">
          <SalesOverview />
          <StatusOverview />
          <DashboardCharts />
        </div>
      </section>

      <section>
        <PageTitle component="h2">Recent Orders</PageTitle>

        <RecentOrders />
      </section>
    </Fragment>
  );
}
//   } catch (error) {
//     console.error("Dashboard page error:", error);
//     // Handle any unexpected errors by redirecting to login
//     redirect("/login");
//   }
// }
