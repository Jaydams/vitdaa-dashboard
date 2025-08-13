"use client";

import { useSearchParams } from "next/navigation";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";

import { columns, skeletonColumns } from "./columns";
import OrdersTable from "./Table";
import TableSkeleton from "@/components/shared/TableSkeleton";
import TableError from "@/components/shared/TableError";

type Props = {
  perPage?: number;
};

export default function RecentOrders({ perPage = 10 }: Props) {
  const searchParams = useSearchParams();
  const ordersPage = searchParams.get("page");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = Math.trunc(Number(ordersPage)) || 1;

  const {
    orders,
    pagination,
    loading,
    error,
    refresh,
  } = useOrdersRealtime({
    page,
    perPage,
    status: status || undefined,
    search: search || undefined,
  });

  if (loading)
    return <TableSkeleton perPage={perPage} columns={skeletonColumns} />;

  if (error || !orders)
    return (
      <TableError
        errorMessage="Something went wrong while trying to fetch orders."
        refetch={refresh}
      />
    );

  return (
    <OrdersTable
      columns={columns}
      data={orders}
      pagination={pagination}
    />
  );
}
