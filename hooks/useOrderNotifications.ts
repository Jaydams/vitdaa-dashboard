"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface OrderNotification {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  total_amount: number;
  payment_method: string;
  dining_option: string;
  table_id?: string;
  created_at: string;
  business_id: string;
  status: string;
}

interface UseOrderNotificationsProps {
  businessId: string;
  enableModal?: boolean;
  enableSound?: boolean;
  enableToast?: boolean;
}

export function useOrderNotifications({
  businessId,
  enableModal = true,
  enableSound = true,
  enableToast = true,
}: UseOrderNotificationsProps) {
  const [pendingOrders, setPendingOrders] = useState<OrderNotification[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(
    null
  );

  const supabase = createClient();

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (enableSound) {
      try {
        // Create a simple beep sound using Web Audio API as fallback
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.error("Error playing notification sound:", error);
      }
    }
  }, [enableSound]);

  // Fetch initial pending orders
  const fetchPendingOrders = useCallback(async () => {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching pending orders:", error);
        return;
      }

      setPendingOrders(orders || []);
      setUnreadCount(orders?.length || 0);
    } catch (error) {
      console.error("Error in fetchPendingOrders:", error);
    }
  }, [supabase, businessId]);

  // Handle new order notification
  const handleNewOrder = useCallback(
    (newOrder: OrderNotification) => {
      if (newOrder.status === "pending") {
        setPendingOrders((prev) => {
          const exists = prev.some((order) => order.id === newOrder.id);
          if (exists) return prev;

          const updated = [newOrder, ...prev];

          // Show modal if enabled and not already open
          if (enableModal && !isModalOpen && updated.length > 0) {
            setIsModalOpen(true);
          }

          return updated;
        });

        setUnreadCount((prev) => prev + 1);
        setLastNotificationTime(new Date());

        // Play notification sound
        playNotificationSound();

        // Show toast notification
        if (enableToast) {
          toast.info("🔔 New Order Received!", {
            description: `Order from ${
              newOrder.customer_name
            } - ₦${newOrder.total_amount.toLocaleString()}`,
            duration: 5000,
            action: enableModal
              ? {
                  label: "View",
                  onClick: () => setIsModalOpen(true),
                }
              : undefined,
          });
        }
      }
    },
    [enableModal, enableToast, isModalOpen, playNotificationSound]
  );

  // Handle order status update
  const handleOrderUpdate = useCallback(
    (updatedOrder: OrderNotification) => {
      if (updatedOrder.status !== "pending") {
        setPendingOrders((prev) => {
          const filtered = prev.filter((order) => order.id !== updatedOrder.id);

          // Close modal if no more pending orders
          if (enableModal && filtered.length === 0) {
            setIsModalOpen(false);
          }

          return filtered;
        });

        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [enableModal]
  );

  // Set up real-time subscriptions
  useEffect(() => {
    // Fetch initial data
    fetchPendingOrders();

    // Subscribe to new orders
    const channel = supabase
      .channel(`order-notifications-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const newOrder = payload.new as OrderNotification;
          handleNewOrder(newOrder);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as OrderNotification;
          handleOrderUpdate(updatedOrder);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    businessId,
    fetchPendingOrders,
    handleNewOrder,
    handleOrderUpdate,
  ]);

  // Modal controls
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Mark notifications as read
  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setPendingOrders([]);
    setUnreadCount(0);
    setIsModalOpen(false);
  }, []);

  return {
    // State
    pendingOrders,
    isModalOpen,
    unreadCount,
    lastNotificationTime,

    // Actions
    openModal,
    closeModal,
    markAsRead,
    clearAll,
    fetchPendingOrders,

    // Modal props
    modalProps: {
      isOpen: isModalOpen,
      onOpenChange: setIsModalOpen,
      orders: pendingOrders,
      businessId,
    },
  };
}
