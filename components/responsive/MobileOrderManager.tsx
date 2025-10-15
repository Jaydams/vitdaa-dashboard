"use client";

import React from "react";
import { Check, X, Eye, Clock, ChefHat, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { SwipeableCard, LongPressMenu, hapticFeedback } from "./MobileGestures";
import { TouchButton } from "./TouchOptimizedControls";
import { useResponsive } from "./ResponsiveDashboardProvider";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    status: "pending" | "preparing" | "ready" | "served";
  }>;
  status: "pending" | "preparing" | "ready" | "served";
  total: number;
  tableNumber?: number;
  priority: "low" | "normal" | "high" | "urgent";
  estimatedTime?: number;
  createdAt: string;
}

interface MobileOrderManagerProps {
  orders: Order[];
  onOrderStatusUpdate: (orderId: string, status: Order["status"]) => void;
  onOrderView: (orderId: string) => void;
  onOrderPriority: (orderId: string, priority: Order["priority"]) => void;
  userRole: "reception" | "kitchen" | "bar";
  className?: string;
}

export function MobileOrderManager({
  orders,
  onOrderStatusUpdate,
  onOrderView,
  onOrderPriority,
  userRole,
  className,
}: MobileOrderManagerProps) {
  const { isMobile } = useResponsive();

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "preparing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ready":
        return "bg-green-100 text-green-800 border-green-200";
      case "served":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: Order["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "normal":
        return "bg-blue-500";
      case "low":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getNextStatus = (
    currentStatus: Order["status"]
  ): Order["status"] | null => {
    switch (currentStatus) {
      case "pending":
        return "preparing";
      case "preparing":
        return "ready";
      case "ready":
        return "served";
      default:
        return null;
    }
  };

  const handleSwipeRight = (order: Order) => {
    const nextStatus = getNextStatus(order.status);
    if (nextStatus) {
      onOrderStatusUpdate(order.id, nextStatus);
      hapticFeedback.success();
    }
  };

  const handleSwipeLeft = (order: Order) => {
    // For kitchen/bar: mark as priority
    if (userRole === "kitchen" || userRole === "bar") {
      const newPriority = order.priority === "urgent" ? "normal" : "urgent";
      onOrderPriority(order.id, newPriority);
      hapticFeedback.medium();
    }
  };

  const getLongPressMenuItems = (order: Order) => {
    const items = [
      {
        icon: <Eye className="h-4 w-4" />,
        label: "View Details",
        onClick: () => onOrderView(order.id),
      },
    ];

    // Add status change options
    const nextStatus = getNextStatus(order.status);
    if (nextStatus) {
      items.push({
        icon: <Check className="h-4 w-4" />,
        label: `Mark as ${nextStatus}`,
        onClick: () => {
          onOrderStatusUpdate(order.id, nextStatus);
          hapticFeedback.success();
        },
      });
    }

    // Add priority options for kitchen/bar
    if (userRole === "kitchen" || userRole === "bar") {
      items.push({
        icon: <Clock className="h-4 w-4" />,
        label: order.priority === "urgent" ? "Normal Priority" : "Mark Urgent",
        onClick: () => {
          const newPriority = order.priority === "urgent" ? "normal" : "urgent";
          onOrderPriority(order.id, newPriority);
          hapticFeedback.medium();
        },
      });
    }

    return items;
  };

  const renderOrderCard = (order: Order) => {
    const nextStatus = getNextStatus(order.status);

    return (
      <LongPressMenu key={order.id} menuItems={getLongPressMenuItems(order)}>
        <SwipeableCard
          onSwipeRight={nextStatus ? () => handleSwipeRight(order) : undefined}
          onSwipeLeft={
            userRole === "kitchen" || userRole === "bar"
              ? () => handleSwipeLeft(order)
              : undefined
          }
          rightAction={
            nextStatus
              ? {
                  icon: <Check className="h-5 w-5" />,
                  label: `Mark ${nextStatus}`,
                  color: "bg-green-500",
                }
              : undefined
          }
          leftAction={
            userRole === "kitchen" || userRole === "bar"
              ? {
                  icon: <Clock className="h-5 w-5" />,
                  label: order.priority === "urgent" ? "Normal" : "Priority",
                  color: "bg-orange-500",
                }
              : undefined
          }
          className="mb-4"
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Priority indicator */}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    getPriorityColor(order.priority)
                  )}
                />
                <div>
                  <h3 className="font-semibold text-lg">
                    #{order.orderNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName}
                    {order.tableNumber && ` • Table ${order.tableNumber}`}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
                {order.estimatedTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{order.estimatedTime}min
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-3">
              {order.items.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                      {item.quantity}
                    </span>
                    {item.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      item.status === "ready" &&
                        "bg-green-50 text-green-700 border-green-200",
                      item.status === "preparing" &&
                        "bg-blue-50 text-blue-700 border-blue-200"
                    )}
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
              {order.items.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{order.items.length - 3} more items
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {userRole === "kitchen" && <ChefHat className="h-4 w-4" />}
                {userRole === "bar" && <Utensils className="h-4 w-4" />}
                <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold">₦{order.total.toFixed(2)}</span>
                <TouchButton
                  size="sm"
                  variant="outline"
                  onClick={() => onOrderView(order.id)}
                  className="h-8 px-3"
                >
                  <Eye className="h-3 w-3" />
                </TouchButton>
              </div>
            </div>
          </div>
        </SwipeableCard>
      </LongPressMenu>
    );
  };

  if (!isMobile) {
    // Fallback to regular card layout for desktop
    return (
      <div className={cn("space-y-4", className)}>
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-card rounded-lg border shadow-sm p-4"
          >
            {/* Regular desktop layout */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                <p className="text-sm text-muted-foreground">
                  {order.customerName}
                  {order.tableNumber && ` • Table ${order.tableNumber}`}
                </p>
              </div>
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">₦{order.total.toFixed(2)}</span>
              <TouchButton
                size="sm"
                variant="outline"
                onClick={() => onOrderView(order.id)}
              >
                View Details
              </TouchButton>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Mobile gesture instructions */}
      <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">Quick Actions:</p>
        <div className="space-y-1">
          <p>• Swipe right → Next status</p>
          {(userRole === "kitchen" || userRole === "bar") && (
            <p>• Swipe left → Toggle priority</p>
          )}
          <p>• Long press → More options</p>
        </div>
      </div>

      {orders.map(renderOrderCard)}
    </div>
  );
}
