"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Notification } from "@/types/notifications";
import { Badge } from "@/components/ui/badge";
import Typography from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { deleteNotification } from "@/data/notifications";
import { updateOrderStatus } from "@/actions/order-actions";

type Props = {
  notification: Notification;
};

export default function NotificationItem({ notification }: Props) {
  const queryClient = useQueryClient();
  const [orderActionLoading, setOrderActionLoading] = useState(false);

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
    if (notification.type !== "new-order") return;

    setOrderActionLoading(true);
    try {
      const status = action === "confirm" ? "processing" : "cancelled";
      await updateOrderStatus(notification.id, status);

      toast.success(
        action === "confirm"
          ? "Order confirmed and moved to processing"
          : "Order cancelled"
      );

      // Refresh notifications
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(`Failed to ${action} order`);
    } finally {
      setOrderActionLoading(false);
    }
  };

  const notificationDetails =
    notification.type === "stock-out"
      ? {
          title: notification.item + " stock out, please check!",
          badge: (
            <Badge variant="destructive" className="flex-shrink-0">
              Stock Out
            </Badge>
          ),
        }
      : notification.type === "new-order"
      ? {
          title: `${
            notification.customer_name || "Customer"
          } placed ₦${notification.price.toLocaleString()} order!`,
          badge: (
            <Badge
              variant="default"
              className="flex-shrink-0 bg-green-100 text-green-800"
            >
              New Order
            </Badge>
          ),
        }
      : null;

  if (!notificationDetails) return null;

  return (
    <div className="p-3 border-t border-t-border first:border-t-0">
      <div className="flex items-start gap-x-3 mb-3">
        <Image
          src={notification.imageUrl}
          alt={notificationDetails.title}
          width={30}
          height={30}
          className="size-[1.875rem] rounded-full flex-shrink-0 mt-1"
        />

        <div className="flex-1 min-w-0">
          <Typography
            component="p"
            className="text-[0.8125rem] md:text-[0.8125rem] line-clamp-2 mb-2"
          >
            {notificationDetails.title}
          </Typography>

          {notification.type === "new-order" && (
            <div className="text-xs text-muted-foreground space-y-1 mb-2">
              <p>Phone: {notification.customer_phone}</p>
              <p>Payment: {notification.payment_method}</p>
              <p>
                Type: {notification.dining_option}
                {notification.table_number &&
                  ` • Table ${notification.table_number}`}
              </p>
              {notification.payment_method === "transfer" && (
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
              {new Date(notification.timestamp).toLocaleString()}
            </Typography>
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

      {notification.type === "new-order" && (
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
