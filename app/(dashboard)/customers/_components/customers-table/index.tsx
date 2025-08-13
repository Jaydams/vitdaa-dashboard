"use client";

import { useSearchParams } from "next/navigation";

import { columns, skeletonColumns } from "./columns";
import CustomersTable from "./Table";
import TableSkeleton from "@/components/shared/TableSkeleton";
import TableError from "@/components/shared/TableError";
import { useCustomersRealtime } from "@/hooks/useCustomersRealtime";

type Props = {
  perPage?: number;
};

export default function AllCustomers({ perPage = 10 }: Props) {
  const searchParams = useSearchParams();
  const customersPage = searchParams.get("page");
  const page = Math.trunc(Number(customersPage)) || 1;
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

  const { customers, isLoading, error, refetch } = useCustomersRealtime({
    page,
    perPage,
    search,
    sortBy,
    sortOrder,
  });

  if (isLoading)
    return <TableSkeleton perPage={perPage} columns={skeletonColumns} />;

  if (error || !customers)
    return (
      <TableError
        errorMessage="Something went wrong while trying to fetch customers."
        refetch={refetch}
      />
    );

  return (
    <CustomersTable
      columns={columns}
      data={customers.data}
      pagination={{
        pages: customers.pages,
        current: customers.currentPage,
        perPage: customers.perPage,
        total: customers.total,
      }}
    />
  );
}
