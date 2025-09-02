"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { updateOrderStatus } from "@/actions/order-actions";

interface NewOrder {
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

interface OrderNotificationModalProps {
  businessId: string;
}

export default function OrderNotificationModal({
  businessId,
}: OrderNotificationModalProps) {
  const [pendingOrders, setPendingOrders] = useState<NewOrder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );
  const [audioEnabled, setAudioEnabled] = useState(true);

  const supabase = createClient();

  // Audio notification
  const playNotificationSound = () => {
    if (audioEnabled) {
      try {
        const audio = new Audio("/notification-sound.mp3");
        audio.play().catch(console.error);
      } catch (error) {
        console.error("Error playing notification sound:", error);
      }
    }
  };

  useEffect(() => {
    // Subscribe to new orders for this business
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
          const newOrder = payload.new as NewOrder;

          if (newOrder.status === "pending") {
            console.log("New order received:", newOrder);

            setPendingOrders((prev) => {
              const updated = [...prev, newOrder];

              // Show modal if not already open
              if (!isModalOpen && updated.length > 0) {
                setIsModalOpen(true);
                setCurrentOrderIndex(0);
              }

              return updated;
            });

            // Play notification sound
            playNotificationSound();

            // Show toast notification
            toast.info("🔔 New Order Received!", {
              description: `Order from ${
                newOrder.customer_name
              } - ₦${newOrder.total_amount.toLocaleString()}`,
              duration: 5000,
            });
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

          // Remove order from pending list if status changed from pending
          if (updatedOrder.status !== "pending") {
            setPendingOrders((prev) => {
              const filtered = prev.filter(
                (order) => order.id !== updatedOrder.id
              );

              // Close modal if no more pending orders
              if (filtered.length === 0) {
                setIsModalOpen(false);
                setCurrentOrderIndex(0);
              } else if (currentOrderIndex >= filtered.length) {
                setCurrentOrderIndex(Math.max(0, filtered.length - 1));
              }

              return filtered;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, businessId, isModalOpen, currentOrderIndex, audioEnabled]);

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

      // Remove from pending orders
      setPendingOrders((prev) => {
        const filtered = prev.filter((order) => order.id !== orderId);

        if (filtered.length === 0) {
          setIsModalOpen(false);
          setCurrentOrderIndex(0);
        } else if (currentOrderIndex >= filtered.length) {
          setCurrentOrderIndex(Math.max(0, filtered.length - 1));
        }

        return filtered;
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(`Failed to ${action} order`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const navigateOrder = (direction: "prev" | "next") => {
    if (direction === "prev" && currentOrderIndex > 0) {
      setCurrentOrderIndex(currentOrderIndex - 1);
    } else if (
      direction === "next" &&
      currentOrderIndex < pendingOrders.length - 1
    ) {
      setCurrentOrderIndex(currentOrderIndex + 1);
    }
  };

  const currentOrder = pendingOrders[currentOrderIndex];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "transfer":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "wallet":
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case "cash":
        return <CreditCard className="w-4 h-4 text-green-500" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <DialogTitle>New Order Alert</DialogTitle>
            </div>

            {pendingOrders.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateOrder("prev")}
                  disabled={currentOrderIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="text-sm text-muted-foreground">
                  {currentOrderIndex + 1} of {pendingOrders.length}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateOrder("next")}
                  disabled={currentOrderIndex === pendingOrders.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <DialogDescription>
            {pendingOrders.length === 1
              ? "You have a new order waiting for confirmation"
              : `You have ${pendingOrders.length} new orders waiting for confirmation`}
          </DialogDescription>
        </DialogHeader>

        {currentOrder && (
          <div className="space-y-6">
            {/* Order Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Order #{currentOrder.invoice_no}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {currentOrder.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">Customer</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {currentOrder.customer_phone}
                      </p>
                      <p className="text-xs text-muted-foreground">Phone</p>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium capitalize">
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
                    {getPaymentMethodIcon(currentOrder.payment_method)}
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {currentOrder.payment_method}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Payment Method
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address for delivery */}
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
                        Transfer Payment - Verify payment before confirming
                      </p>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      Customer should transfer ₦
                      {currentOrder.total_amount.toLocaleString()} to your
                      account
                    </p>
                  </div>
                )}

                {/* Total Amount */}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(currentOrder.total_amount)}
                  </span>
                </div>

                {/* Order Time */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Ordered at{" "}
                    {new Date(currentOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
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
                  : "Reject Order"}
              </Button>
            </div>

            {/* Audio Toggle */}
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="text-xs"
              >
                {audioEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
