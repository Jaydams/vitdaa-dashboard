"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Phone,
  CreditCard,
  MapPin,
  User,
  AlertCircle,
  Check,
  X,
  Bell,
  Volume2,
  VolumeX,
} from "lucide-react";
import { updateOrderStatus } from "@/actions/order-actions";
import { Order, OrderStatus, OrderMethod, DiningOption } from "@/types/order";

interface NewOrder {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  total_amount: number;
  payment_method: OrderMethod;
  dining_option: DiningOption;
  table_id?: string;
  created_at: string;
  business_id: string;
  status: OrderStatus;
}

interface NewOrderModalProps {
  businessId: string;
}

export default function NewOrderModal({ businessId }: NewOrderModalProps) {
  const [currentOrder, setCurrentOrder] = useState<NewOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orderQueue, setOrderQueue] = useState<NewOrder[]>([]);

  const supabase = createClient();

  // Play notification sound
  const playNotificationSound = () => {
    if (soundEnabled) {
      try {
        const audioContext = new (window.AudioContext ||
          (window as unknown).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.8
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.8);
      } catch (error) {
        console.error("Error playing notification sound:", error);
      }
    }
  };

  useEffect(() => {
    // Subscribe to new orders for this business
    const channel = supabase
      .channel(`new-order-modal-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const newOrder = payload.new as NewOrder;

          if (newOrder.status === "pending") {
            console.log("New order for modal:", newOrder);

            setOrderQueue((prev) => [...prev, newOrder]);

            // If no modal is open, show this order immediately
            if (!isModalOpen) {
              setCurrentOrder(newOrder);
              setIsModalOpen(true);
            }

            // Create notification in database directly using Supabase client
            // Use .then() and .catch() instead of await in non-async callbacks
            supabase
            .from('notifications')
            .insert({
              business_id: newOrder.business_id,
              type: 'new_order',
              title: 'New Order Received',
              message: `New order #${newOrder.invoice_no} from ${newOrder.customer_name}`,
              data: {
                order_id: newOrder.id,
                invoice_no: newOrder.invoice_no,
                customer_name: newOrder.customer_name,
                customer_phone: newOrder.customer_phone,
                total_amount: newOrder.total_amount,
                payment_method: newOrder.payment_method,
                dining_option: newOrder.dining_option,
                table_id: newOrder.table_id,
                customer_address: newOrder.customer_address,
              },
              priority: 'high',
              is_read: false,
            })
            .then(({ error }) => {
              if (error) {
                console.error("Error creating order notification:", error);
              } else {
                console.log("Order notification created successfully");
              }
            });

            // Play notification sound
            playNotificationSound();

            // Show browser notification
            if (Notification.permission === "granted") {
              new Notification("�� New Order Alert!", {
                body: `Order from ${
                  newOrder.customer_name
                } - ₦${newOrder.total_amount.toLocaleString()}`,
                icon: "/vitdaa_logo.png",
                tag: `order-${newOrder.id}`,
              });
            }
          }
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
          const updatedOrder = payload.new as NewOrder;

          // Remove order from queue if status changed from pending
          if (updatedOrder.status !== "pending") {
            setOrderQueue((prev) =>
              prev.filter((order) => order.id !== updatedOrder.id)
            );

            // If this was the current order, close modal or show next
            if (currentOrder?.id === updatedOrder.id) {
              const remainingOrders = orderQueue.filter(
                (order) => order.id !== updatedOrder.id
              );

              if (remainingOrders.length > 0) {
                setCurrentOrder(remainingOrders[0]);
              } else {
                setIsModalOpen(false);
                setCurrentOrder(null);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    businessId,
    isModalOpen,
    currentOrder,
    orderQueue,
    soundEnabled,
    playNotificationSound,
  ]);

  const handleOrderAction = async (
    orderId: string,
    action: "confirm" | "reject"
  ) => {
    setProcessingOrderId(orderId);

    try {
      const status = action === "confirm" ? "processing" : "cancelled";
      await updateOrderStatus(orderId, status);

      toast.success(
        action === "confirm"
          ? "✅ Order confirmed and moved to processing"
          : "❌ Order cancelled"
      );

      // Remove from queue and show next order
      const remainingOrders = orderQueue.filter(
        (order) => order.id !== orderId
      );
      setOrderQueue(remainingOrders);

      if (remainingOrders.length > 0) {
        setCurrentOrder(remainingOrders[0]);
      } else {
        setIsModalOpen(false);
        setCurrentOrder(null);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(`Failed to ${action} order`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "transfer":
        return "bg-orange-100 text-orange-800";
      case "wallet":
        return "bg-blue-100 text-blue-800";
      case "cash":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!currentOrder) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600 animate-bounce" />
              <DialogTitle className="text-lg font-bold">
                New Order Alert!
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2">
              {orderQueue.length > 1 && (
                <Badge variant="secondary" className="text-xs">
                  +{orderQueue.length - 1} more
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Header */}
          <div className="text-center bg-blue-50 p-4 rounded-lg">
            <h3 className="text-xl font-bold text-blue-900">
              Order #{currentOrder.invoice_no}
            </h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(currentOrder.total_amount)}
            </p>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium text-sm">
                  {currentOrder.customer_name}
                </p>
                <p className="text-xs text-muted-foreground">Customer</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium text-sm">
                  {currentOrder.customer_phone}
                </p>
                <p className="text-xs text-muted-foreground">Phone</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium text-sm capitalize">
                  {currentOrder.dining_option}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentOrder.dining_option === "indoor"
                    ? `Table ${currentOrder.table_id || "N/A"}`
                    : "Delivery"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <Badge
                className={getPaymentMethodColor(currentOrder.payment_method)}
              >
                {currentOrder.payment_method}
              </Badge>
            </div>
          </div>

          {/* Delivery Address */}
          {currentOrder.dining_option === "delivery" &&
            currentOrder.customer_address && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Delivery Address:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentOrder.customer_address}
                  </p>
                </div>
              </>
            )}

          {/* Transfer Payment Warning */}
          {currentOrder.payment_method === "transfer" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-800 font-medium">
                  Transfer Payment - Verify before confirming
                </p>
              </div>
            </div>
          )}

          {/* Order Time */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Ordered at {new Date(currentOrder.created_at).toLocaleString()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleOrderAction(currentOrder.id, "confirm")}
              disabled={processingOrderId === currentOrder.id}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Check className="w-4 h-4 mr-2" />
              {processingOrderId === currentOrder.id
                ? "Confirming..."
                : "Confirm Order"}
            </Button>

            <Button
              onClick={() => handleOrderAction(currentOrder.id, "reject")}
              disabled={processingOrderId === currentOrder.id}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              size="lg"
            >
              <X className="w-4 h-4 mr-2" />
              {processingOrderId === currentOrder.id
                ? "Rejecting..."
                : "Reject"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
