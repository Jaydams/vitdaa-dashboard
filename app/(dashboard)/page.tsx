import { Fragment, Suspense } from "react";
import { Metadata } from "next";

import PageTitle from "@/components/shared/PageTitle";
import RecentOrders from "@/app/(dashboard)/orders/_components/orders-table";
import { DashboardContent } from "./_components/DashboardContent";
import { DateRangeFilter } from "./_components/DateRangeFilter";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  return (
    <Fragment>
      <section className="space-y-4 sm:space-y-6">
        <PageTitle>Dashboard Overview</PageTitle>

        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          {/* Date Range Filter */}
          <div className="w-full" suppressHydrationWarning>
            <DateRangeFilter useUrlState={true} />
          </div>

          {/* Dashboard Content */}
          <DashboardContent />
        </div>
      </section>

      <section className="space-y-4 sm:space-y-6">
        <PageTitle component="h2">Recent Orders</PageTitle>
        <Suspense
          fallback={<div className="animate-pulse bg-muted h-64 rounded-lg" />}
        >
          <RecentOrders />
        </Suspense>
      </section>
    </Fragment>
  );
}
