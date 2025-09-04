"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Notification, NotificationUnion } from "@/types/notifications";
import { Badge } from "@/components/ui/badge";
import Typography from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { deleteNotification, markNotificationAsRead } from "@/actions/notification-actions";
import { updateOrderStatus } from "@/actions/order-actions";

type Props = {
  notification: NotificationUnion;
  onMarkAsRead?: () => void;
};

export default function NotificationItem({ notification, onMarkAsRead }: Props) {
  const queryClient = useQueryClient();
  const [orderActionLoading, setOrderActionLoading] = useState(false);

  const {
    mutate: handleMarkAsRead,
    isPending: isMarkingAsRead,
  } = useMutation({
    mutationFn: () => markNotificationAsRead(notification.id),
    onSuccess: () => {
      onMarkAsRead?.();
    },
  });

  const {
    mutate: handleDelete,
    isPending,
    isError,
  } = useMutation({
    mutationFn: () => deleteNotification(notification.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (isError) {
      toast.error(
        "There was an error while trying to delete notification. Please try again!"
      );
    }
  }, [isError]);

  const handleOrderAction = async (action: "confirm" | "reject") => {
    if (notification.type !== "new_order") return;

    setOrderActionLoading(true);
    try {
      const status = action === "confirm" ? "processing" : "cancelled";
      await updateOrderStatus(notification.data.order_id, status);

      toast.success(
        action === "confirm"
          ? "Order confirmed and moved to processing"
          : "Order cancelled"
      );

      // Mark notification as read
      handleMarkAsRead();

      // Refresh notifications
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(`Failed to ${action} order`);
    } finally {
      setOrderActionLoading(false);
    }
  };

  const notificationDetails = (() => {
    switch (notification.type) {
      case "low_stock":
        return {
          title: `${notification.data.item_name} stock is low, please check!`,
          badge: (
            <Badge variant="destructive" className="flex-shrink-0">
              Low Stock
            </Badge>
          ),
        };
      case "new_order":
        return {
          title: `${notification.data.customer_name} placed ₦${notification.data.total_amount.toLocaleString()} order!`,
          badge: (
            <Badge
              variant="default"
              className="flex-shrink-0 bg-green-100 text-green-800"
            >
              New Order
            </Badge>
          ),
        };
      case "order_status_change":
        return {
          title: `Order #${notification.data.invoice_no} status changed to ${notification.data.new_status}`,
          badge: (
            <Badge variant="secondary" className="flex-shrink-0">
              Status Update
            </Badge>
          ),
        };
      case "payment_received":
        return {
          title: `Payment received for order #${notification.data.invoice_no}`,
          badge: (
            <Badge variant="default" className="flex-shrink-0 bg-green-100 text-green-800">
              Payment
            </Badge>
          ),
        };
      case "system_alert":
        return {
          title: notification.title,
          badge: (
            <Badge variant="outline" className="flex-shrink-0">
              System
            </Badge>
          ),
        };
      default:
        return {
          title: notification.title,
          badge: (
            <Badge variant="outline" className="flex-shrink-0">
              Info
            </Badge>
          ),
        };
    }
  })();

  if (!notificationDetails) return null;

  return (
    <div 
      className={`p-3 border-t border-t-border first:border-t-0 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-muted/30 hover:bg-muted/50' : 'hover:bg-muted/20'
      }`}
      onClick={() => !notification.is_read && handleMarkAsRead()}
    >
      <div className="flex items-start gap-x-3 mb-3">
        <div className="size-[1.875rem] rounded-full flex-shrink-0 mt-1 bg-primary/10 flex items-center justify-center">
          {notification.type === "new_order" && (
            <span className="text-primary text-xs font-bold">📋</span>
          )}
          {notification.type === "low_stock" && (
            <span className="text-destructive text-xs font-bold">⚠️</span>
          )}
          {notification.type === "order_status_change" && (
            <span className="text-secondary text-xs font-bold">🔄</span>
          )}
          {notification.type === "payment_received" && (
            <span className="text-green-600 text-xs font-bold">💰</span>
          )}
          {notification.type === "system_alert" && (
            <span className="text-muted-foreground text-xs font-bold">ℹ️</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Typography
            component="p"
            className="text-[0.8125rem] md:text-[0.8125rem] line-clamp-2 mb-2"
          >
            {notificationDetails.title}
          </Typography>

          {notification.type === "new_order" && (
            <div className="text-xs text-muted-foreground space-y-1 mb-2">
              <p>Phone: {notification.data.customer_phone}</p>
              <p>Payment: {notification.data.payment_method}</p>
              <p>
                Type: {notification.data.dining_option}
                {notification.data.table_id &&
                  ` • Table ${notification.data.table_id}`}
              </p>
              {notification.data.payment_method === "transfer" && (
                <p className="text-orange-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Awaiting transfer confirmation
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-x-2 mb-2">
            {notificationDetails.badge}
            <Typography component="p" className="text-xs md:text-xs">
              {new Date(notification.created_at).toLocaleString()}
            </Typography>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 w-8 h-8"
          disabled={isPending}
          onClick={() => handleDelete()}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
        </Button>
      </div>

      {notification.type === "new_order" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleOrderAction("confirm")}
            disabled={orderActionLoading}
            className="flex-1"
          >
            {orderActionLoading ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Check className="w-3 h-3 mr-1" />
            )}
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOrderAction("reject")}
            disabled={orderActionLoading}
            className="flex-1"
          >
            <X className="w-3 h-3 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
