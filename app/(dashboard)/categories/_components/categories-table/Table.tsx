"use client";

import * as React from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import DataTable from "@/components/shared/DataTable";

// Menu type for this table
export type MenuWithCount = {
  id: string;
  menu_name: string;
  item_count: number;
};

type Props = {
  data: MenuWithCount[];
  columns: any;
};

export default function CategoriesTable({ data, columns }: Props) {
  const [rowSelection, setRowSelection] = React.useState({});
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });
  // Provide a dummy PaginationProps object to satisfy DataTable
  const pagination = {
    items: data.length,
    pages: 1,
    first: 1,
    last: 1,
    next: null,
    prev: null,
    current: 1,
    perPage: data.length || 1,
  };
  return <DataTable table={table} pagination={pagination} />;
}
