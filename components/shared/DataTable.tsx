"use client";

import * as React from "react";
import { Table as TableType, flexRender } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Typography from "@/components/ui/typography";
import { PaginationProps } from "@/types/pagination";
import { getPaginationButtons } from "@/helpers/getPaginationButtons";

interface DataTableProps<TData> {
  table: TableType<TData>;
  pagination: PaginationProps;
  onRowClick?: (row: TData) => void;
}

export default function DataTable<TData>({
  table,
  pagination,
  onRowClick,
}: DataTableProps<TData>) {
  const paginationButtons = getPaginationButtons({
    totalPages: pagination.pages || 0,
    currentPage: pagination.current || 1,
  });

  return (
    <div className="rounded-md border overflow-hidden">
      {/* data table */}
      <Table>
        <TableHeader className="bg-popover">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className="uppercase whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={
                  onRowClick
                    ? "hover:bg-muted/50 cursor-pointer"
                    : "hover:bg-transparent"
                }
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.options.columns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* pagination */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3.5 p-4 bg-popover text-muted-foreground">
        <Typography className="text-sm flex-shrink-0 uppercase font-medium">
          Showing{" "}
          {Math.max(
            ((pagination.current || 1) - 1) * (pagination.perPage || 10) + 1,
            1
          )}{" "}
          to{" "}
          {Math.min(
            (pagination.current || 1) * (pagination.perPage || 10),
            pagination.items || 0
          )}{" "}
          of {pagination.items || 0}
        </Typography>

        <Pagination>
          <PaginationContent className="flex-wrap">
            <PaginationItem>
              <PaginationPrevious
                href={`?page=${pagination.prev}`}
                disabled={!pagination.prev}
              />
            </PaginationItem>

            {paginationButtons.map((page, index) => (
              <PaginationItem key={`page-${index}`}>
                {page === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href={`?page=${page}`}
                    isActive={page === pagination.current}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href={`?page=${pagination.next}`}
                disabled={!pagination.next}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
