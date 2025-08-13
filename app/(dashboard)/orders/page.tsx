import { Metadata } from "next";

import PageTitle from "@/components/shared/PageTitle";
import AllOrders from "./_components/orders-table";
import OrderFilters from "./_components/OrderFilters";
import { CreateOrderButton } from "./_components/CreateOrderButton";
import { TableStatus } from "./_components/TableStatus";

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <OrderFilters />
        </div>
        <div>
          <TableStatus />
        </div>
      </div>

      <AllOrders perPage={20} />
    </section>
  );
}
