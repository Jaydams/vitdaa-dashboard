"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Order, OrderStatus } from "@/types/order";
import { OrderBadgeVariants } from "@/constants/badge";

// Status transition rules - defines which statuses can transition to which other statuses
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["delivered", "cancelled"],
  ready: ["delivered", "cancelled"], // If ready status exists
  delivered: [], // Final state - no transitions allowed
  cancelled: [], // Final state - no transitions allowed
};

// Status display configuration
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    description: "Order is waiting to be processed",
  },
  processing: {
    label: "Processing",
    icon: AlertCircle,
    description: "Order is being prepared",
  },
  ready: {
    label: "Ready",
    icon: CheckCircle,
    description: "Order is ready for pickup/delivery",
  },
  delivered: {
    label: "Delivered",
    icon: Truck,
    description: "Order has been completed",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    description: "Order has been cancelled",
  },
} as const;

interface OrderStatusManagerProps {
  order: Order;
  onStatusChange: (newStatus: OrderStatus) => Promise<void>;
  disabled?: boolean;
}

export function OrderStatusManager({
  order,
  onStatusChange,
  disabled = false,
}: OrderStatusManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(
    null
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentStatus = order.status;
  const availableTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  const canChangeStatus = availableTransitions.length > 0 && !disabled;

  const StatusIcon = STATUS_CONFIG[currentStatus]?.icon || Clock;

  const handleStatusSelect = (newStatus: OrderStatus) => {
    setSelectedStatus(newStatus);

    // Show confirmation for critical status changes
    if (newStatus === "cancelled" || newStatus === "delivered") {
      setShowConfirmDialog(true);
    } else {
      handleStatusChange(newStatus);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!newStatus || isLoading) return;

    setIsLoading(true);
    try {
      await onStatusChange(newStatus);
      toast.success(
        `Order status updated to ${STATUS_CONFIG[newStatus]?.label}`
      );
      setShowConfirmDialog(false);
      setSelectedStatus(null);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setIsLoading(false);
    }
  };

  const getConfirmationMessage = (status: OrderStatus) => {
    switch (status) {
      case "cancelled":
        return {
          title: "Cancel Order",
          description:
            "Are you sure you want to cancel this order? This action cannot be undone and the order will be marked as cancelled.",
        };
      case "delivered":
        return {
          title: "Mark as Delivered",
          description:
            "Are you sure you want to mark this order as delivered? This will complete the order and no further changes can be made.",
        };
      default:
        return {
          title: "Update Status",
          description: `Are you sure you want to change the order status to ${STATUS_CONFIG[status]?.label}?`,
        };
    }
  };

  const confirmationMessage = selectedStatus
    ? getConfirmationMessage(selectedStatus)
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="size-5" />
            Order Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status Display */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={OrderBadgeVariants[currentStatus]}
                  className="capitalize"
                >
                  {STATUS_CONFIG[currentStatus]?.label || currentStatus}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {STATUS_CONFIG[currentStatus]?.description}
              </p>
            </div>
          </div>

          {/* Status Change Controls */}
          {canChangeStatus && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Change Status</label>
                <Select onValueChange={handleStatusSelect} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransitions.map((status) => {
                      const config = STATUS_CONFIG[status];
                      const Icon = config?.icon || Clock;

                      return (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            <Icon className="size-4" />
                            <span>{config?.label || status}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Transition Info */}
              <div className="text-xs text-muted-foreground">
                {availableTransitions.length > 0 ? (
                  <p>
                    Available transitions:{" "}
                    {availableTransitions
                      .map((s) => STATUS_CONFIG[s]?.label || s)
                      .join(", ")}
                  </p>
                ) : (
                  <p>
                    No status changes available for{" "}
                    {STATUS_CONFIG[currentStatus]?.label} orders
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Updating order status...</span>
            </div>
          )}

          {/* No Changes Available */}
          {!canChangeStatus && !isLoading && (
            <div className="text-sm text-muted-foreground">
              {availableTransitions.length === 0
                ? "This order status cannot be changed"
                : "Status changes are currently disabled"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationMessage?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationMessage?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirmDialog(false);
                setSelectedStatus(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedStatus && handleStatusChange(selectedStatus)
              }
              disabled={isLoading}
              className={
                selectedStatus === "cancelled"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
