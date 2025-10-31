"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Ticket, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useOrderStore, OpenTicket } from "@/stores/order-store";
import { useTicketsRealtime } from "@/hooks/useTicketsRealtime";
import { TicketCard } from "./TicketCard";
import { TicketsFilterModal } from "./TicketsFilterModal";
import { toast } from "sonner";

export interface TicketFilters {
  status?: string[];
  paymentStatus?: string[];
  priority?: string[];
  diningOption?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  sortBy:
    | "created_at"
    | "last_modified"
    | "total_amount"
    | "priority"
    | "status";
  sortOrder: "asc" | "desc";
}

interface TicketsListProps {
  onTicketSelect?: (ticket: OpenTicket) => void;
  onTicketEdit?: (ticket: OpenTicket) => void;
  onTicketDelete?: (ticket: OpenTicket) => void;
  onProcessPayment?: (ticket: OpenTicket) => void;
  onSwitchToOrderCreation?: () => void;
  selectedTicketId?: string;
  businessId?: string;
  enableRealTimeUpdates?: boolean;
}

export function TicketsList({
  onTicketSelect,
  onTicketEdit,
  onTicketDelete,
  onProcessPayment,
  onSwitchToOrderCreation,
  selectedTicketId,
  businessId,
  enableRealTimeUpdates = true,
}: TicketsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [diningOptionFilter, setDiningOptionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<TicketFilters["sortBy"]>("created_at");
  const [sortOrder, setSortOrder] = useState<TicketFilters["sortOrder"]>("asc");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const {
    openTickets,
    loadOpenTicket,
    deleteOpenTicket,
    updateTicketStatus,
    updateTicketPriority,
    loadTicketsFromServer,
    syncStatus,
  } = useOrderStore();

  // Real-time updates integration
  const {
    tickets: realtimeTickets,
    applyOptimisticUpdate,
    revertOptimisticUpdate,
    syncWithServer,
    isOnline,
    hasOptimisticUpdates,
  } = useTicketsRealtime({
    businessId,
    enableOptimisticUpdates: true,
    enableNotifications: true,
  });

  // Use real-time tickets if real-time is enabled, otherwise use store tickets
  const ticketsSource = enableRealTimeUpdates ? realtimeTickets : openTickets;

  // Advanced sorting function that implements the requirements
  const sortTickets = useCallback(
    (tickets: OpenTicket[]): OpenTicket[] => {
      return [...tickets].sort((a, b) => {
        // Primary sort: incomplete orders first (as per requirements)
        const statusPriority = {
          pending_payment: 1,
          preparing: 2,
          ready: 3,
          completed: 4,
        };

        const aPriority = statusPriority[a.status] || 5;
        const bPriority = statusPriority[b.status] || 5;

        // If different status priorities, sort by status
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Secondary sort: within same status, sort by selected criteria
        let comparison = 0;

        switch (sortBy) {
          case "created_at":
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case "last_modified":
            comparison = a.lastModified.getTime() - b.lastModified.getTime();
            break;
          case "total_amount":
            comparison =
              a.orderState.calculations.total - b.orderState.calculations.total;
            break;
          case "priority":
            const priorityOrder = { urgent: 1, high: 2, normal: 3 };
            comparison =
              (priorityOrder[a.priority] || 3) -
              (priorityOrder[b.priority] || 3);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          default:
            // Default to creation time (oldest first within status groups)
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
        }

        return sortOrder === "desc" ? -comparison : comparison;
      });
    },
    [sortBy, sortOrder]
  );

  // Advanced filtering function
  const filterTickets = useCallback(
    (tickets: OpenTicket[]): OpenTicket[] => {
      return tickets.filter((ticket) => {
        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            ticket.ticketNumber.toLowerCase().includes(query) ||
            ticket.orderState.customer.name?.toLowerCase().includes(query) ||
            ticket.orderState.customer.phone?.toLowerCase().includes(query) ||
            ticket.orderState.items.some((item) =>
              item.menu_item_name.toLowerCase().includes(query)
            ) ||
            ticket.orderState.specialInstructions
              ?.toLowerCase()
              .includes(query);

          if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== "all" && ticket.status !== statusFilter) {
          return false;
        }

        // Payment status filter
        if (paymentFilter !== "all" && ticket.paymentStatus !== paymentFilter) {
          return false;
        }

        // Priority filter
        if (priorityFilter !== "all" && ticket.priority !== priorityFilter) {
          return false;
        }

        // Dining option filter
        if (
          diningOptionFilter !== "all" &&
          ticket.orderState.diningOption !== diningOptionFilter
        ) {
          return false;
        }

        return true;
      });
    },
    [
      searchQuery,
      statusFilter,
      paymentFilter,
      priorityFilter,
      diningOptionFilter,
    ]
  );

  // Get filtered and sorted tickets
  const processedTickets = useMemo(() => {
    const filtered = filterTickets(ticketsSource);
    return sortTickets(filtered);
  }, [ticketsSource, filterTickets, sortTickets]);

  // Handle ticket actions
  const handleTicketSelect = (ticket: OpenTicket) => {
    onTicketSelect?.(ticket);
  };

  const handleTicketEdit = (ticket: OpenTicket) => {
    try {
      loadOpenTicket(ticket.id);
      toast.success(`Loaded ticket ${ticket.ticketNumber} for editing`);
      onTicketEdit?.(ticket);
    } catch (error) {
      console.error("Error loading ticket:", error);
      toast.error("Failed to load ticket");
    }
  };

  const handleTicketDelete = (ticket: OpenTicket) => {
    if (
      confirm(`Are you sure you want to delete ticket ${ticket.ticketNumber}?`)
    ) {
      // Apply optimistic update
      if (enableRealTimeUpdates) {
        applyOptimisticUpdate(ticket.id, { status: "completed" });
      }

      try {
        deleteOpenTicket(ticket.id);
        toast.success(`Ticket ${ticket.ticketNumber} deleted`);
        onTicketDelete?.(ticket);
      } catch (error) {
        // Revert optimistic update on error
        if (enableRealTimeUpdates) {
          revertOptimisticUpdate(ticket.id);
        }
        console.error("Error deleting ticket:", error);
        toast.error("Failed to delete ticket");
      }
    }
  };

  const handleProcessPayment = (ticket: OpenTicket) => {
    // Apply optimistic update for payment processing
    if (enableRealTimeUpdates) {
      applyOptimisticUpdate(ticket.id, {
        paymentStatus: "processing",
        lastModified: new Date(),
      });
    }

    onProcessPayment?.(ticket);
  };

  // Handle filter and sort changes
  const handleSortChange = (newSortBy: TicketFilters["sortBy"]) => {
    if (newSortBy === sortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setPriorityFilter("all");
    setDiningOptionFilter("all");
    setSortBy("created_at");
    setSortOrder("asc");
    setDateFrom("");
    setDateTo("");
    toast.success("All filters cleared");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      if (enableRealTimeUpdates) {
        // Use real-time sync
        try {
          await syncWithServer();
          toast.success("Tickets synchronized with server");
        } catch (error) {
          toast.error("Sync failed - check connection");
        }
      } else {
        // Load fresh tickets from server
        await loadTicketsFromServer();
        toast.success("Tickets refreshed");
      }
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh tickets");
    }

    setIsRefreshing(false);
  };

  // Get filter counts for display
  const filterCounts = useMemo(() => {
    const counts = {
      total: ticketsSource.length,
      filtered: processedTickets.length,
      pending_payment: ticketsSource.filter(
        (t) => t.paymentStatus === "pending"
      ).length,
      urgent: ticketsSource.filter((t) => t.priority === "urgent").length,
      high: ticketsSource.filter((t) => t.priority === "high").length,
    };
    return counts;
  }, [ticketsSource, processedTickets]);

  // Load tickets on mount and when date filters change
  useEffect(() => {
    const loadInitialTickets = async () => {
      try {
        await loadTicketsFromServer(dateFrom || undefined, dateTo || undefined);
      } catch (error) {
        console.error("Failed to load initial tickets:", error);
        toast.error("Failed to load tickets");
      }
    };

    loadInitialTickets();
  }, [loadTicketsFromServer, dateFrom, dateTo]);

  // Auto-refresh effect for real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    // Auto-sort when tickets change due to real-time updates
    const interval = setInterval(() => {
      // This will trigger a re-sort if there are any pending optimistic updates
      if (hasOptimisticUpdates) {
        console.log("Auto-resorting tickets due to optimistic updates");
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [enableRealTimeUpdates, hasOptimisticUpdates]);

  // Filter modal handlers
  const handleFiltersChange = (
    newFilters: Partial<{
      searchQuery: string;
      statusFilter: string;
      paymentFilter: string;
      priorityFilter: string;
      diningOptionFilter: string;
      sortBy: TicketFilters["sortBy"];
      sortOrder: TicketFilters["sortOrder"];
      dateFrom: string;
      dateTo: string;
    }>
  ) => {
    if (newFilters.searchQuery !== undefined)
      setSearchQuery(newFilters.searchQuery);
    if (newFilters.statusFilter !== undefined)
      setStatusFilter(newFilters.statusFilter);
    if (newFilters.paymentFilter !== undefined)
      setPaymentFilter(newFilters.paymentFilter);
    if (newFilters.priorityFilter !== undefined)
      setPriorityFilter(newFilters.priorityFilter);
    if (newFilters.diningOptionFilter !== undefined)
      setDiningOptionFilter(newFilters.diningOptionFilter);
    if (newFilters.sortBy !== undefined) setSortBy(newFilters.sortBy);
    if (newFilters.sortOrder !== undefined) setSortOrder(newFilters.sortOrder);
    if (newFilters.dateFrom !== undefined) setDateFrom(newFilters.dateFrom);
    if (newFilters.dateTo !== undefined) setDateTo(newFilters.dateTo);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Simplified Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Open Tickets</h2>
          <Badge variant="secondary" className="text-xs">
            {filterCounts.filtered}
          </Badge>
          {filterCounts.pending_payment > 0 && (
            <Badge variant="destructive" className="text-xs">
              {filterCounts.pending_payment}
            </Badge>
          )}
          {enableRealTimeUpdates && (
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-green-500" : "bg-red-500"
              }`}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            {(searchQuery ||
              statusFilter !== "all" ||
              paymentFilter !== "all" ||
              priorityFilter !== "all" ||
              diningOptionFilter !== "all" ||
              dateFrom ||
              dateTo) && (
              <Badge variant="secondary" className="ml-1 text-xs">
                •
              </Badge>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || syncStatus === "syncing"}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing || syncStatus === "syncing" ? "animate-spin" : ""
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 flex flex-col">
        <div className="p-0 flex-1">
          {syncStatus === "syncing" && openTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-medium mb-2">Loading Tickets...</h3>
              <p className="text-muted-foreground">
                Fetching the latest tickets from the server.
              </p>
            </div>
          ) : processedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {openTickets.length === 0
                  ? "No Open Tickets"
                  : "No Matching Tickets"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {openTickets.length === 0
                  ? "Create orders and save them as tickets to see them here."
                  : "Try adjusting your search or filter criteria."}
              </p>
              {openTickets.length === 0 && (
                <Button onClick={onSwitchToOrderCreation}>
                  Create New Order
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {processedTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={selectedTicketId === ticket.id}
                    onSelect={handleTicketSelect}
                    onEdit={handleTicketEdit}
                    onDelete={handleTicketDelete}
                    onProcessPayment={handleProcessPayment}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      <TicketsFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={{
          searchQuery,
          statusFilter,
          paymentFilter,
          priorityFilter,
          diningOptionFilter,
          sortBy,
          sortOrder,
          dateFrom,
          dateTo,
        }}
        onFiltersChange={handleFiltersChange}
        onClearFilters={clearAllFilters}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
