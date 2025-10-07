"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, ShoppingCart } from "lucide-react";
import { OrderStateItem, OrderCalculations } from "@/hooks/use-order-state";
import { OrderItemsList } from "./OrderItemsList";
import { OrderCalculations as OrderCalculationsComponent } from "./OrderCalculations";
import { OrderActions } from "./OrderActions";

interface OrderFormPanelProps {
  visible: boolean;
  orderItems: OrderStateItem[];
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onRemoveItem: (itemId: number) => void;
  onCompleteOrder: () => void;
  onClearOrder: () => void;
  onToggleVisibility: () => void;
  calculations: OrderCalculations;
  className?: string;
}

/**
 * Collapsible order form panel component
 * Displays selected items, calculations, and order actions
 * Includes smooth slide animations and empty state handling
 */
export function OrderFormPanel({
  visible,
  orderItems,
  onUpdateQuantity,
  onRemoveItem,
  onCompleteOrder,
  onClearOrder,
  onToggleVisibility,
  calculations,
  className,
}: OrderFormPanelProps) {
  const hasItems = orderItems.length > 0;
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={cn(
        // Enhanced responsive design for order panel
        "h-full transition-all duration-300 ease-in-out",
        // Mobile: Full screen overlay behavior handled by parent
        "w-full",
        className
      )}
    >
      <Card
        className={cn(
          "h-full shadow-lg transition-all duration-300 ease-in-out",
          // Mobile: Full screen with rounded corners only on left
          "rounded-none md:rounded-l-lg border-l",
          // Desktop: Standard card styling
          "lg:border lg:rounded-lg"
        )}
      >
        {/* Panel Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "transition-all duration-300 ease-out",
                hasItems
                  ? "text-primary animate-pulse"
                  : "text-muted-foreground"
              )}
            >
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">
              Current Order
              {hasItems && (
                <span
                  className={cn(
                    "ml-2 text-sm text-muted-foreground transition-all duration-300",
                    "animate-in slide-in-from-left-2"
                  )}
                >
                  ({totalItems} item{totalItems !== 1 ? "s" : ""})
                </span>
              )}
            </h3>
          </div>

          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className={cn(
              "h-8 w-8 p-0 transition-all duration-200",
              "hover:bg-primary/10 hover:scale-110 active:scale-95"
            )}
          >
            <div className="transition-transform duration-300 ease-out">
              {visible ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </div>
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col h-[calc(100%-80px)] p-0">
          {hasItems ? (
            <div className="animate-in slide-in-from-right-4 duration-300">
              {/* Order Items List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="animate-in fade-in-50 duration-500 delay-100">
                  <OrderItemsList
                    items={orderItems}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemoveItem={onRemoveItem}
                  />
                </div>
              </div>

              {/* Order Calculations */}
              <div className="border-t p-4 bg-muted/30">
                <div className="animate-in slide-in-from-bottom-2 duration-400 delay-200">
                  <OrderCalculationsComponent calculations={calculations} />
                </div>
              </div>

              {/* Order Actions */}
              <div className="border-t p-4 bg-gradient-to-t from-muted/20 to-transparent">
                <div className="animate-in slide-in-from-bottom-4 duration-500 delay-300">
                  <OrderActions
                    onCompleteOrder={onCompleteOrder}
                    onClearOrder={onClearOrder}
                    hasItems={hasItems}
                    totalAmount={calculations.total}
                    orderItems={orderItems}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in-50 duration-500">
              <div
                className={cn(
                  "w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4",
                  "animate-in zoom-in-50 duration-500 delay-100",
                  "hover:scale-110 transition-transform duration-200"
                )}
              >
                <ShoppingCart className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
              <h4 className="text-lg font-medium mb-2 animate-in slide-in-from-bottom-2 duration-400 delay-200">
                No items selected
              </h4>
              <p className="text-sm text-muted-foreground mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                Click on menu items to add them to your order
              </p>
              <div className="animate-in slide-in-from-bottom-6 duration-600 delay-400">
                <Button
                  variant="outline"
                  onClick={onToggleVisibility}
                  className={cn(
                    "w-full transition-all duration-200",
                    "hover:scale-105 hover:shadow-md active:scale-95"
                  )}
                >
                  Browse Menu
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
