import { Metadata } from "next";

import PageTitle from "@/components/shared/PageTitle";
import AllOrders from "./_components/orders-table";
import OrderFilters from "./_components/OrderFilters";
import { CreateOrderButton } from "./_components/CreateOrderButton";

export const metadata: Metadata = {
  title: "Orders",
};

export default async function OrdersPage() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <PageTitle>Orders</PageTitle>
        <CreateOrderButton />
      </div>

      <div className="mb-6">
        <OrderFilters />
      </div>

      <AllOrders perPage={20} />
    </section>
  );
}
