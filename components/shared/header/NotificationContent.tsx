"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

import Typography from "@/components/ui/typography";
import NotificationItem from "./NotificationItem";
import NotificationItemSkeleton from "./NotificationItemSkeleton";
import { fetchNotifications } from "@/data/notifications";

export default function NotificationContent() {
  const supabase = createClient();

  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  useEffect(() => {
    // Subscribe to realtime changes for new orders
    const channel = supabase
      .channel("notification-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: "status=eq.pending",
        },
        (payload) => {
          console.log("New pending order notification:", payload);

          // Play notification sound
          try {
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

          // Show enhanced toast notification with action
          toast.info("🔔 New Order Received!", {
            description: `Order from ${payload.new.customer_name} - ₦${
              payload.new.total_amount?.toLocaleString() || "N/A"
            }`,
            duration: 8000,
            action: {
              label: "View Details",
              onClick: () => {
                // Trigger notification dropdown to open
                const notificationButton = document.querySelector(
                  "[data-notification-trigger]"
                );
                if (notificationButton) {
                  (notificationButton as HTMLElement).click();
                }
              },
            },
          });

          // Show browser notification if permission granted
          if (Notification.permission === "granted") {
            new Notification("New Order Received!", {
              body: `Order from ${payload.new.customer_name}`,
              icon: "/vitdaa_logo.png",
              tag: "new-order",
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }

          // Refetch notifications
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Order updated:", payload);
          // Refetch notifications when orders are updated
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  if (isLoading) {
    return new Array(6)
      .fill(0)
      .map((_, index) => (
        <NotificationItemSkeleton key={`notification-skeleton-${index}`} />
      ));
  }

  if (!notifications || isError) {
    return (
      <div className="w-full text-center px-4 py-6">
        <Typography component="p" className="text-sm md:text-sm">
          Something went wrong while fetching notifications. Please try again.
        </Typography>
      </div>
    );
  }

  if (notifications.length > 0) {
    return notifications.map((notification, index) => (
      <NotificationItem
        key={`notification-${index}`}
        notification={notification}
      />
    ));
  }

  return (
    <div className="w-full text-center px-4 py-6">
      <Typography component="p" className="text-sm md:text-sm">
        You have no notifications!
      </Typography>
    </div>
  );
}
