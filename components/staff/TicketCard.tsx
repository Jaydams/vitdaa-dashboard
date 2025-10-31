"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  User,
  Phone,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Eye,
  Trash2,
  MapPin,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import { OpenTicket } from "@/stores/order-store";
import { formatAmount } from "@/helpers/formatAmount";
import { cn } from "@/lib/utils";

interface TicketCardProps {
  ticket: OpenTicket;
  isSelected?: boolean;
  onSelect?: (ticket: OpenTicket) => void;
  onEdit?: (ticket: OpenTicket) => void;
  onDelete?: (ticket: OpenTicket) => void;
  onProcessPayment?: (ticket: OpenTicket) => void;
  className?: string;
}

export function TicketCard({
  ticket,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onProcessPayment,
  className,
}: TicketCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    onSelect?.(ticket);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(ticket);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(ticket);
  };

  const handleProcessPayment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProcessPayment?.(ticket);
  };

  const getStatusColor = (status: OpenTicket["status"]) => {
    switch (status) {
      case "pending_payment":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "preparing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "ready":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getPaymentStatusColor = (status: OpenTicket["paymentStatus"]) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getPriorityColor = (priority: OpenTicket["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "normal":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: OpenTicket["status"]) => {
    switch (status) {
      case "pending_payment":
        return <CreditCard className="h-4 w-4" />;
      case "preparing":
        return <Clock className="h-4 w-4" />;
      case "ready":
        return <CheckCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority: OpenTicket["priority"]) => {
    switch (priority) {
      case "urgent":
        return <AlertTriangle className="h-3 w-3" />;
      case "high":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getDiningOptionIcon = (diningOption: string) => {
    switch (diningOption) {
      case "delivery":
        return <MapPin className="h-4 w-4" />;
      case "pickup":
        return <Utensils className="h-4 w-4" />;
      case "indoor":
      default:
        return <Utensils className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const totalItems = ticket.orderState.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const isUrgent = ticket.priority === "urgent" || ticket.priority === "high";
  const isPendingPayment = ticket.paymentStatus === "pending";

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isUrgent && "border-red-200 dark:border-red-800",
        isPendingPayment && "border-l-4 border-l-yellow-500",
        isHovered && "shadow-lg transform scale-[1.02]",
        className
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        {/* Header with Ticket Number and Badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="font-semibold text-lg flex items-center gap-2">
                {ticket.ticketNumber}
                {isUrgent && (
                  <span className="text-red-500">
                    {getPriorityIcon(ticket.priority)}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(ticket.createdAt)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {ticket.priority !== "normal" && (
              <Badge className={getPriorityColor(ticket.priority)}>
                {getPriorityIcon(ticket.priority)}
                {ticket.priority}
              </Badge>
            )}
            <Badge className={getStatusColor(ticket.status)}>
              {getStatusIcon(ticket.status)}
              {ticket.status.replace("_", " ")}
            </Badge>
            <Badge className={getPaymentStatusColor(ticket.paymentStatus)}>
              {ticket.paymentStatus}
            </Badge>
          </div>
        </div>

        {/* Customer Information */}
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {ticket.orderState.customer.name || "Walk-in Customer"}
            </span>
          </div>

          {ticket.orderState.customer.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {ticket.orderState.customer.phone}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {getDiningOptionIcon(ticket.orderState.diningOption)}
            <span className="capitalize">
              {ticket.orderState.diningOption === "indoor"
                ? "Dine In"
                : ticket.orderState.diningOption}
            </span>
          </div>

          {ticket.orderState.tableNumber && (
            <div className="text-sm text-muted-foreground">
              Table {ticket.orderState.tableNumber}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">
            {ticket.orderState.items.length} menu item
            {ticket.orderState.items.length !== 1 ? "s" : ""} • {totalItems}{" "}
            total item
            {totalItems !== 1 ? "s" : ""}
          </div>
          <div className="font-semibold text-lg">
            {formatAmount(ticket.orderState.calculations.total)}
          </div>
        </div>

        {/* Order Items Preview (first 3 items) */}
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Items:</div>
          <div className="space-y-1">
            {ticket.orderState.items.slice(0, 3).map((item, index) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="truncate">
                  {item.quantity}x {item.menu_item_name}
                </span>
                <span className="font-medium ml-2">
                  {formatAmount(item.total_price)}
                </span>
              </div>
            ))}
            {ticket.orderState.items.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{ticket.orderState.items.length - 3} more item
                {ticket.orderState.items.length - 3 !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Special Instructions */}
        {ticket.orderState.specialInstructions && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Special Instructions:</strong>{" "}
                {ticket.orderState.specialInstructions}
              </div>
            </div>
          </div>
        )}

        {/* Time Indicators */}
        <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div>Created: {ticket.createdAt.toLocaleTimeString()}</div>
          <div>Modified: {ticket.lastModified.toLocaleTimeString()}</div>
          {ticket.estimatedCompletionTime && (
            <div>
              ETA: {ticket.estimatedCompletionTime.toLocaleTimeString()}
            </div>
          )}
        </div>

        <Separator className="my-3" />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Created by: {ticket.createdBy}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="h-8"
            >
              <Eye className="h-3 w-3 mr-1" />
              Edit
            </Button>

            {isPendingPayment && (
              <Button
                size="sm"
                onClick={handleProcessPayment}
                className="h-8 bg-green-600 hover:bg-green-700"
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Pay
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
