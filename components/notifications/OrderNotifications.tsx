"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, X, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateOrderStatus } from "@/actions/order-actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface OrderNotification {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  dining_option: string;
  table?: {
    table_number: string;
  };
}

export function OrderNotifications() {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const fetchPendingOrders = async () => {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          invoice_no,
          customer_name,
          customer_phone,
          total_amount,
          payment_method,
          status,
          created_at,
          dining_option,
          table:tables(table_number)
        `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching pending orders:", error);
        return;
      }

      setNotifications(orders || []);
      setUnreadCount(orders?.length || 0);
    } catch (error) {
      console.error("Error in fetchPendingOrders:", error);
    }
  };

  useEffect(() => {
    fetchPendingOrders();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("order-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: "status=eq.pending",
        },
        (payload) => {
          console.log("New pending order:", payload);
          fetchPendingOrders();

          // Show toast notification for new orders
          toast.info("New order received!", {
            description: `Order #${payload.new.invoice_no} from ${payload.new.customer_name}`,
            action: {
              label: "View",
              onClick: () => setIsOpen(true),
            },
          });
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
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConfirmOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await updateOrderStatus(orderId, "processing");
      toast.success("Order confirmed and moved to processing");
      fetchPendingOrders();
    } catch (error) {
      console.error("Error confirming order:", error);
      toast.error("Failed to confirm order");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await updateOrderStatus(orderId, "cancelled");
      toast.success("Order cancelled");
      fetchPendingOrders();
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "transfer":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "wallet":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Pending Orders</h3>
          <p className="text-sm text-muted-foreground">
            {unreadCount} order{unreadCount !== 1 ? "s" : ""} awaiting
            confirmation
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No pending orders
            </div>
          ) : (
            notifications.map((order) => (
              <div key={order.id} className="p-4 border-b last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        #{order.invoice_no}
                      </span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      {getPaymentMethodIcon(order.payment_method)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name} • {order.customer_phone}
                    </p>
                    <p className="text-sm">
                      ₦{order.total_amount.toLocaleString()} •{" "}
                      {order.dining_option}
                      {order.table && ` • Table ${order.table.table_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {order.payment_method === "transfer" && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Awaiting transfer confirmation
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleConfirmOrder(order.id)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectOrder(order.id)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
