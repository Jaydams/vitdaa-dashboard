import { Metadata } from "next";

import PageTitle from "@/components/shared/PageTitle";
import AllOrders from "./_components/orders-table";
import OrderFilters from "./_components/OrderFilters";

export const metadata: Metadata = {
  title: "Orders",
};

export default async function OrdersPage() {
  return (
    <div className="px-4 py-6 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <section>
        <div className="flex items-center justify-between mb-6">
          <PageTitle>Orders</PageTitle>
        </div>

        <div className="mb-6">
          <OrderFilters />
        </div>

        <AllOrders perPage={20} />
      </section>
    </div>
  );
}
