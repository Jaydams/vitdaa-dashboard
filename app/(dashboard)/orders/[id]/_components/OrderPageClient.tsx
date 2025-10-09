"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Edit, Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatAmount } from "@/helpers/formatAmount";
import { OrderBadgeVariants } from "@/constants/badge";
import { Order, OrderStatus } from "@/types/order";
import { updateOrder, updateOrderStatus } from "@/actions/order-actions";

import { OrderEditForm } from "./OrderEditForm";
import { OrderStatusManager } from "./OrderStatusManager";
import { OrderVoidAction } from "./OrderVoidAction";
import { OrderDetailsErrorBoundary } from "@/components/error-boundary/OrderErrorBoundary";
import { OptimisticUpdateIndicator } from "@/components/ui/order-loading-states";
import { useOptimisticUpdate } from "@/hooks/use-optimistic-updates";
import { OrderNotifications } from "@/lib/order-notifications";

interface OrderPageClientProps {
  order: Order;
}

export function OrderPageClient({ order: initialOrder }: OrderPageClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use optimistic updates for order data
  const {
    data: order,
    updateOptimistically,
    isUpdating,
  } = useOptimisticUpdate(initialOrder, {
    successMessage: "Order updated successfully",
    errorMessage: "Failed to update order",
  });

  // Determine if order can be edited
  const canEdit = !["delivered", "cancelled"].includes(order.status);
  const canVoid = order.status === "pending";

  const handleSaveOrder = async (data: {
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    dining_option: "indoor" | "delivery";
    table_id?: string;
    delivery_location_id?: string;
    rider_name?: string;
    rider_phone?: string;
    notes?: string;
  }) => {
    setIsLoading(true);
    try {
      const optimisticOrder = {
        ...order,
        ...data,
        updated_at: new Date().toISOString(),
      };

      await updateOptimistically(
        optimisticOrder,
        async () => {
          await updateOrder(order.id, data);
          return optimisticOrder;
        },
        {
          successMessage: "Order details updated successfully",
          errorMessage: "Failed to update order details",
        }
      );

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating order:", error);
      throw error; // Let the form handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    const optimisticOrder = { ...order, status: newStatus };

    await updateOptimistically(
      optimisticOrder,
      async () => {
        await updateOrderStatus(order.id, newStatus);
        return optimisticOrder;
      },
      {
        successMessage: `Order status updated to ${newStatus}`,
        errorMessage: "Failed to update order status",
      }
    );
  };

  const handleVoidSuccess = () => {
    // This will be handled by the redirect in OrderVoidAction
    OrderNotifications.orderVoided(order.invoice_no, {
      action: {
        label: "Back to Orders",
        onClick: () => (window.location.href = "/orders"),
      },
    });
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <OrderEditForm
          order={order}
          onSave={handleSaveOrder}
          onCancel={() => setIsEditing(false)}
          disabled={isLoading}
        />
      </div>
    );
  }

  return (
    <OrderDetailsErrorBoundary>
      <OptimisticUpdateIndicator isUpdating={isUpdating} />
      <div className="space-y-6">
        {/* Main Order Information Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Order Summary
                <Badge
                  variant={OrderBadgeVariants[order.status]}
                  className="capitalize"
                >
                  {order.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Date</p>
                  <p className="font-medium">
                    {format(new Date(order.order_time), "PPp")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">
                    {order.payment_method}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dining Option</p>
                  <p className="font-medium capitalize">
                    {order.dining_option}
                  </p>
                </div>
                {order.table && (
                  <div>
                    <p className="text-muted-foreground">Table</p>
                    <p className="font-medium">
                      Table {order.table.table_number}
                    </p>
                  </div>
                )}
                {order.delivery_location && (
                  <div>
                    <p className="text-muted-foreground">Delivery Location</p>
                    <p className="font-medium">
                      {order.delivery_location.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Edit Button */}
              {canEdit && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    <Edit className="size-4 mr-2" />
                    Edit Order
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{order.customer_phone}</p>
              </div>
              {order.customer_address && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{order.customer_address}</p>
                </div>
              )}
              {order.rider_name && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Rider</p>
                  <p className="font-medium">
                    {order.rider_name} - {order.rider_phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Subtotal
                  </span>
                  <span className="font-medium">
                    {formatAmount(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    VAT ({order.vat_rate || 7.5}%)
                  </span>
                  <span className="font-medium">
                    {formatAmount(order.vat_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Service Charge ({order.service_charge_rate || 2.5}%)
                  </span>
                  <span className="font-medium">
                    {formatAmount(order.service_charge)}
                  </span>
                </div>
                {order.takeaway_packs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Takeaway Packs (x{order.takeaway_packs})
                    </span>
                    <span className="font-medium">
                      {formatAmount(
                        order.takeaway_packs * order.takeaway_pack_price
                      )}
                    </span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Delivery Fee
                    </span>
                    <span className="font-medium">
                      {formatAmount(order.delivery_fee)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatAmount(order.total_amount)}</span>
                </div>
              </div>
              {order.payment && (
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Payment Status
                    </span>
                    <Badge
                      variant={
                        order.payment.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {order.payment.status}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Management Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Status Management */}
          <OrderStatusManager
            order={order}
            onStatusChange={handleStatusChange}
            disabled={isLoading}
          />

          {/* Void Action (only for pending orders) */}
          {canVoid && (
            <OrderVoidAction
              order={order}
              onVoidSuccess={handleVoidSuccess}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-2"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.menu_item_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAmount(item.menu_item_price)} x {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatAmount(item.total_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </OrderDetailsErrorBoundary>
  );
}
