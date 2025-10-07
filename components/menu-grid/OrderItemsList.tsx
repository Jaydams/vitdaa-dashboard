"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Trash2 } from "lucide-react";
import { OrderStateItem } from "@/hooks/use-order-state";
import { formatAmount } from "@/helpers/formatAmount";

interface OrderItemsListProps {
  items: OrderStateItem[];
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onRemoveItem: (itemId: number) => void;
  className?: string;
}

/**
 * Component for displaying and managing order items
 * Shows item details with quantity controls and removal functionality
 * Includes smooth animations for item updates
 */
export function OrderItemsList({
  items,
  onUpdateQuantity,
  onRemoveItem,
  className,
}: OrderItemsListProps) {
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    // Add visual feedback for quantity changes
    setUpdatingItems((prev) => new Set(prev).add(itemId));

    // Remove the updating state after animation
    setTimeout(() => {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, 200);

    onUpdateQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = (itemId: number) => {
    // Add visual feedback for item removal
    setUpdatingItems((prev) => new Set(prev).add(itemId));

    // Delay removal for smooth animation
    setTimeout(() => {
      onRemoveItem(itemId);
    }, 150);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <div
          key={item.menu_item_id}
          className="animate-in slide-in-from-right-4 duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <OrderItemCard
            item={item}
            isUpdating={updatingItems.has(item.menu_item_id)}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
          />
        </div>
      ))}
    </div>
  );
}

interface OrderItemCardProps {
  item: OrderStateItem;
  isUpdating: boolean;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
}

function OrderItemCard({
  item,
  isUpdating,
  onQuantityChange,
  onRemove,
}: OrderItemCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleDecrease = () => {
    if (item.quantity > 1) {
      onQuantityChange(item.menu_item_id, item.quantity - 1);
    } else {
      onRemove(item.menu_item_id);
    }
  };

  const handleIncrease = () => {
    onQuantityChange(item.menu_item_id, item.quantity + 1);
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 ease-out",
        "hover:shadow-md hover:scale-[1.01]",
        "border-l-4 border-l-transparent hover:border-l-primary/30",
        isUpdating && "scale-[0.98] opacity-80 border-l-primary animate-pulse"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          {/* Item Image */}
          <div
            className={cn(
              "relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0",
              "transition-all duration-200 hover:scale-105"
            )}
          >
            {item.image_url && !imageError ? (
              <Image
                src={item.image_url}
                alt={item.menu_item_name}
                fill
                className="object-cover transition-transform duration-200 hover:scale-110"
                onError={handleImageError}
                sizes="48px"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full bg-muted">
                <span className="text-lg animate-pulse">🍽️</span>
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h4
                className="font-medium text-sm leading-tight line-clamp-2"
                title={item.menu_item_name}
              >
                {item.menu_item_name}
              </h4>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.menu_item_id)}
                className={cn(
                  "h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-2 flex-shrink-0",
                  "transition-all duration-200 hover:scale-110 active:scale-95",
                  "hover:bg-destructive/10"
                )}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Price and Quantity Controls */}
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium text-primary">
                  {formatAmount(item.menu_item_price)}
                </span>
                {item.quantity > 1 && (
                  <span className="text-muted-foreground ml-1">
                    × {item.quantity}
                  </span>
                )}
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDecrease}
                  className={cn(
                    "h-6 w-6 p-0 transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    "hover:bg-destructive/10 hover:border-destructive/30",
                    isUpdating && "animate-pulse"
                  )}
                  disabled={isUpdating}
                >
                  <Minus className="h-3 w-3" />
                </Button>

                <span
                  className={cn(
                    "min-w-[2rem] text-center text-sm font-medium transition-all duration-300",
                    "px-2 py-1 rounded-md",
                    isUpdating &&
                      "scale-110 text-primary bg-primary/10 animate-pulse"
                  )}
                >
                  {item.quantity}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIncrease}
                  className={cn(
                    "h-6 w-6 p-0 transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    "hover:bg-primary/10 hover:border-primary/30",
                    isUpdating && "animate-pulse"
                  )}
                  disabled={isUpdating}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Total Price for this item */}
            {item.quantity > 1 && (
              <div className="mt-1 text-right">
                <span className="text-sm font-semibold text-primary">
                  Total: {formatAmount(item.total_price)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
