"use client";

import { useRouter } from "next/navigation";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import DataTable from "@/components/shared/DataTable";
import { Order } from "@/types/order";
import { DataTableProps } from "@/types/data-table";
import { OrderTableErrorBoundary } from "@/components/error-boundary/OrderErrorBoundary";

export default function OrdersTable({
  data,
  columns,
  pagination,
}: DataTableProps<Order>) {
  const router = useRouter();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRowClick = (order: Order) => {
    router.push(`/orders/${order.id}`);
  };

  return (
    <OrderTableErrorBoundary>
      <DataTable
        table={table}
        pagination={pagination}
        onRowClick={handleRowClick}
      />
    </OrderTableErrorBoundary>
  );
}
