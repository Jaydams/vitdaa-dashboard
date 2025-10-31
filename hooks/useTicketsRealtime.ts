"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrderStore, OpenTicket } from "@/stores/order-store";
import { toast } from "sonner";

interface UseTicketsRealtimeOptions {
  businessId?: string;
  enableOptimisticUpdates?: boolean;
  enableNotifications?: boolean;
}

interface TicketRealtimeEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  old?: Partial<OpenTicket>;
  new?: Partial<OpenTicket>;
  timestamp: Date;
}

export function useTicketsRealtime({
  businessId,
  enableOptimisticUpdates = true,
  enableNotifications = true,
}: UseTicketsRealtimeOptions = {}) {
  const {
    openTickets,
    updateTicketStatus,
    updateTicketPriority,
    deleteOpenTicket,
    getSortedTickets,
  } = useOrderStore();

  const channelRef = useRef<any>(null);
  const optimisticUpdatesRef = useRef<Map<string, OpenTicket>>(new Map());

  // Handle real-time order updates that affect tickets
  const handleTicketUpdate = useCallback(
    (payload: any) => {
      const { eventType, old, new: newRecord } = payload;

      console.log("Order realtime update affecting tickets:", {
        eventType,
        old,
        new: newRecord,
      });

      try {
        switch (eventType) {
          case "INSERT":
            if (
              newRecord &&
              newRecord.status &&
              ["pending", "processing"].includes(newRecord.status)
            ) {
              if (enableNotifications) {
                toast.info(
                  `New order created: ${newRecord.invoice_no || "Unknown"}`
                );
              }
              // Refresh tickets to include new order
              // This will be handled by the subscription triggering a re-fetch
            }
            break;

          case "UPDATE":
            if (newRecord && old) {
              const orderId = newRecord.id || old.id;

              // Handle status changes
              if (newRecord.status && newRecord.status !== old.status) {
                // Map order status to ticket status
                const ticketStatus =
                  newRecord.status === "pending"
                    ? "pending_payment"
                    : newRecord.status === "processing"
                    ? "preparing"
                    : newRecord.status;

                if (["pending", "processing"].includes(newRecord.status)) {
                  updateTicketStatus(orderId, ticketStatus);
                } else {
                  // Order completed/cancelled, remove from tickets
                  deleteOpenTicket(orderId);
                }

                if (enableNotifications) {
                  const statusMessage =
                    newRecord.status === "completed"
                      ? "completed"
                      : newRecord.status === "cancelled"
                      ? "cancelled"
                      : newRecord.status.replace("_", " ");

                  toast.success(
                    `Order ${newRecord.invoice_no || orderId} ${statusMessage}`
                  );
                }
              }

              // Handle priority changes
              if (
                newRecord.priority_level &&
                newRecord.priority_level !== old.priority_level
              ) {
                const priority =
                  newRecord.priority_level === "urgent"
                    ? "urgent"
                    : newRecord.priority_level === "high"
                    ? "high"
                    : "normal";

                updateTicketPriority(orderId, priority);

                if (
                  enableNotifications &&
                  newRecord.priority_level === "urgent"
                ) {
                  toast.warning(
                    `Order ${
                      newRecord.invoice_no || orderId
                    } marked as URGENT!`,
                    { duration: 5000 }
                  );
                }
              }

              // Handle payment status changes
              if (
                newRecord.wallet_payment_status &&
                newRecord.wallet_payment_status !== old.wallet_payment_status
              ) {
                if (enableNotifications) {
                  const statusMessage =
                    newRecord.wallet_payment_status === "completed"
                      ? "Payment completed"
                      : `Payment status: ${newRecord.wallet_payment_status}`;

                  toast.success(
                    `Order ${
                      newRecord.invoice_no || orderId
                    } - ${statusMessage}`
                  );
                }
              }
            }
            break;

          case "DELETE":
            if (old?.id) {
              deleteOpenTicket(old.id);

              if (enableNotifications) {
                toast.info(`Order ${old.invoice_no || old.id} was deleted`);
              }
            }
            break;

          default:
            console.warn("Unknown realtime event type:", eventType);
        }
      } catch (error) {
        console.error("Error handling order realtime update:", error);
        if (enableNotifications) {
          toast.error("Failed to process order update");
        }
      }
    },
    [
      updateTicketStatus,
      updateTicketPriority,
      deleteOpenTicket,
      enableNotifications,
    ]
  );

  // Optimistic update functions
  const applyOptimisticUpdate = useCallback(
    (ticketId: string, updates: Partial<OpenTicket>) => {
      if (!enableOptimisticUpdates) return;

      const currentTicket = openTickets.find((t) => t.id === ticketId);
      if (currentTicket) {
        optimisticUpdatesRef.current.set(ticketId, {
          ...currentTicket,
          ...updates,
          lastModified: new Date(),
        });
      }
    },
    [openTickets, enableOptimisticUpdates]
  );

  const revertOptimisticUpdate = useCallback((ticketId: string) => {
    optimisticUpdatesRef.current.delete(ticketId);
  }, []);

  // Get tickets with optimistic updates applied
  const getTicketsWithOptimisticUpdates = useCallback(() => {
    if (!enableOptimisticUpdates || optimisticUpdatesRef.current.size === 0) {
      return getSortedTickets();
    }

    const tickets = getSortedTickets();
    return tickets.map((ticket) => {
      const optimisticUpdate = optimisticUpdatesRef.current.get(ticket.id);
      return optimisticUpdate || ticket;
    });
  }, [getSortedTickets, enableOptimisticUpdates]);

  // Setup real-time subscription
  useEffect(() => {
    const supabase = createClient();

    // Create channel for ticket updates
    const channelName = businessId ? `tickets-${businessId}` : "tickets-global";

    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          ...(businessId && { filter: `business_id=eq.${businessId}` }),
        },
        (payload: any) => {
          // Handle order changes that affect tickets (incomplete orders)
          if (
            payload.new?.status &&
            ["pending", "processing"].includes(payload.new.status)
          ) {
            handleTicketUpdate({
              eventType: payload.eventType,
              old: payload.old,
              new: payload.new,
              timestamp: new Date(),
            });
          } else if (
            payload.old?.status &&
            ["pending", "processing"].includes(payload.old.status)
          ) {
            // Order was completed/cancelled, remove from tickets
            handleTicketUpdate({
              eventType: "DELETE",
              old: payload.old,
              new: payload.new,
              timestamp: new Date(),
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`Tickets realtime subscription status: ${status}`);

        if (status === "SUBSCRIBED") {
          console.log(
            `Successfully subscribed to ticket updates for ${channelName}`
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            `Failed to subscribe to ticket updates for ${channelName}`
          );
          if (enableNotifications) {
            toast.error("Real-time updates unavailable");
          }
        }
      });

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      optimisticUpdatesRef.current.clear();
    };
  }, [businessId, handleTicketUpdate, enableNotifications]);

  // Simulate server sync (in real app, this would be actual API calls)
  const syncWithServer = useCallback(async () => {
    try {
      // In a real implementation, this would:
      // 1. Fetch latest tickets from server
      // 2. Resolve any conflicts
      // 3. Update local state

      console.log("Syncing tickets with server...");

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clear optimistic updates after successful sync
      optimisticUpdatesRef.current.clear();

      if (enableNotifications) {
        toast.success("Tickets synchronized");
      }

      return true;
    } catch (error) {
      console.error("Failed to sync with server:", error);
      if (enableNotifications) {
        toast.error("Sync failed - working offline");
      }
      return false;
    }
  }, [enableNotifications]);

  // Auto-sync on network reconnection
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network reconnected, syncing tickets...");
      syncWithServer();
    };

    const handleOffline = () => {
      console.log("Network disconnected, enabling offline mode...");
      if (enableNotifications) {
        toast.warning("Working offline - changes will sync when reconnected");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncWithServer, enableNotifications]);

  return {
    // Ticket data with optimistic updates
    tickets: getTicketsWithOptimisticUpdates(),

    // Optimistic update functions
    applyOptimisticUpdate,
    revertOptimisticUpdate,

    // Sync functions
    syncWithServer,

    // Status
    isOnline: navigator.onLine,
    hasOptimisticUpdates: optimisticUpdatesRef.current.size > 0,
  };
}
