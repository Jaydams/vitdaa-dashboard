"use client";

import type { PaginationData, PaginationProps } from "@/types/pagination";
import type { ColumnDef } from "@tanstack/react-table";

import * as React from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"; // Tanstack table hooks

// Assuming correct alias paths for shared components
import DataTable from "@/components/shared/DataTable";

// --- Type Definitions (Re-declared for clarity within this file) ---
interface MenuItem {
  id: number;
  menu_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  created_at?: string;
  profile_image_url?: string;
  status?: "available" | "unavailable";
}

// Props for the MenuTable component
interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  pagination: PaginationData<TData>;
  tableOptions?: Record<string, unknown>;
}

export default function MenuTable({
  data,
  columns,
  pagination,
  tableOptions, // Destructure tableOptions from props
}: DataTableProps<MenuItem>) {
  const [rowSelection, setRowSelection] = React.useState({}); // State for selected rows

  // Initialize react-table instance
  const table = useReactTable({
    data, // Data to display
    columns, // Column definitions
    getCoreRowModel: getCoreRowModel(), // Required for core table functionality
    onRowSelectionChange: setRowSelection, // Callback for row selection changes
    state: {
      rowSelection, // Current row selection state
    },
    ...tableOptions, // Spread any additional table options (like 'meta' for column actions)
  });

  // Render the generic DataTable component
  // Map PaginationData to PaginationProps for DataTable
  const { items, pages, first, last, next, prev } = pagination;
  const paginationProps: PaginationProps = {
    items,
    pages,
    first,
    last,
    next,
    prev,
    current: 1, // You may want to pass the actual current page here
    perPage: data.length,
  };
  return <DataTable table={table} pagination={paginationProps} />;
}
