"use client";

import { useQuery } from "@tanstack/react-query";
import { columns } from "./columns";
import CategoriesTable from "./Table";
import { fetchAllMenusWithItemCount } from "@/data/categories";

type Props = { ownerId: string };

export default function AllCategories({ ownerId }: Props) {
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["menus", ownerId],
    queryFn: () => fetchAllMenusWithItemCount(ownerId),
  });

  // You can add loading/error UI as needed
  return <CategoriesTable columns={columns} data={data} />;
}
