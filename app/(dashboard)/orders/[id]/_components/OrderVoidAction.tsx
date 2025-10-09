"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Order } from "@/types/order";
import { formatAmount } from "@/helpers/formatAmount";
import { VoidOrderConfirmation } from "@/components/ui/confirmation-dialog";
import { OrderNotifications } from "@/lib/order-notifications";

interface OrderVoidActionProps {
  order: Order;
  onVoidSuccess: () => void;
  disabled?: boolean;
}

export function OrderVoidAction({
  order,
  onVoidSuccess,
  disabled = false,
}: OrderVoidActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const router = useRouter();

  // Only allow voiding for pending orders
  const canVoid = order.status === "pending" && !disabled;

  const handleVoidOrder = async () => {
    if (!canVoid || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      // Call the void order action
      const response = await fetch(`/api/orders/${order.id}/void`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: voidReason,
          invoice_no: order.invoice_no,
          customer_name: order.customer_name,
          total_amount: order.total_amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to void order");
      }

      OrderNotifications.orderVoided(order.invoice_no, {
        action: {
          label: "Back to Orders",
          onClick: () => router.push("/orders"),
        },
      });

      onVoidSuccess();

      // Redirect to orders list after successful void
      router.push("/orders");
    } catch (error) {
      console.error("Error voiding order:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to void order";
      OrderNotifications.orderVoidFailed(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canVoid) {
    return null; // Don't render if order cannot be voided
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Void this order to permanently delete it from the system. This
            action cannot be undone.
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Order and all associated items will be permanently deleted</p>
            <p>• Payment records will be removed</p>
            <p>• Action will be logged for audit purposes</p>
            <p>• Only pending orders can be voided</p>
          </div>
        </div>

        <VoidOrderConfirmation
          trigger={
            <Button variant="destructive" size="sm" disabled={disabled}>
              <Trash2 className="size-4 mr-2" />
              Void Order
            </Button>
          }
          orderNumber={order.invoice_no}
          onConfirm={handleVoidOrder}
          isLoading={isLoading}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}
