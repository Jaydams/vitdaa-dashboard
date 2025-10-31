"use client";

import { useState } from "react";
import { Filter, X, Calendar, SortAsc, SortDesc, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketFilters } from "./TicketsList";

interface FilterState {
  searchQuery: string;
  statusFilter: string;
  paymentFilter: string;
  priorityFilter: string;
  diningOptionFilter: string;
  sortBy: TicketFilters["sortBy"];
  sortOrder: TicketFilters["sortOrder"];
  dateFrom: string;
  dateTo: string;
}

interface TicketsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  onSortChange: (sortBy: TicketFilters["sortBy"]) => void;
}

export function TicketsFilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters,
  onSortChange,
}: TicketsFilterModalProps) {
  if (!isOpen) return null;

  const handleApplyFilters = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="fixed inset-x-0 bottom-0 bg-background rounded-t-lg shadow-lg max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Tickets
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by ticket number, customer name, phone..."
                value={filters.searchQuery}
                onChange={(e) =>
                  onFiltersChange({ searchQuery: e.target.value })
                }
              />
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      onFiltersChange({ dateFrom: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      onFiltersChange({ dateTo: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onFiltersChange({ dateFrom: "", dateTo: "" });
                }}
                className="w-full"
              >
                Today Only
              </Button>
            </div>

            {/* Status Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.statusFilter}
                  onValueChange={(value) =>
                    onFiltersChange({ statusFilter: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_payment">
                      Pending Payment
                    </SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment</label>
                <Select
                  value={filters.paymentFilter}
                  onValueChange={(value) =>
                    onFiltersChange({ paymentFilter: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Payments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority and Dining */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={filters.priorityFilter}
                  onValueChange={(value) =>
                    onFiltersChange({ priorityFilter: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dining</label>
                <Select
                  value={filters.diningOptionFilter}
                  onValueChange={(value) =>
                    onFiltersChange({ diningOptionFilter: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Options" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Options</SelectItem>
                    <SelectItem value="indoor">Dine In</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Sort By</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={
                    filters.sortBy === "created_at" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => onSortChange("created_at")}
                  className="justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Created
                  {filters.sortBy === "created_at" &&
                    (filters.sortOrder === "asc" ? (
                      <SortAsc className="h-4 w-4 ml-auto" />
                    ) : (
                      <SortDesc className="h-4 w-4 ml-auto" />
                    ))}
                </Button>
                <Button
                  variant={
                    filters.sortBy === "total_amount" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => onSortChange("total_amount")}
                  className="justify-start"
                >
                  Amount
                  {filters.sortBy === "total_amount" &&
                    (filters.sortOrder === "asc" ? (
                      <SortAsc className="h-4 w-4 ml-auto" />
                    ) : (
                      <SortDesc className="h-4 w-4 ml-auto" />
                    ))}
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClearFilters}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
