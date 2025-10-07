"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreateOrderModal } from "./CreateOrderModal";
import { OrderStateItem } from "@/hooks/use-order-state";

interface OrderActionsProps {
  onCompleteOrder: () => void;
  onClearOrder: () => void;
  hasItems: boolean;
  totalAmount: number;
  orderItems: OrderStateItem[];
  isProcessing?: boolean;
  className?: string;
}

/**
 * Component for order action buttons
 * Handles order completion flow and order clearing functionality
 * Includes confirmation dialogs and loading states
 */
export function OrderActions({
  onCompleteOrder,
  onClearOrder,
  hasItems,
  totalAmount,
  orderItems,
  isProcessing = false,
  className,
}: OrderActionsProps) {
  const [isClearing, setIsClearing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClearOrder = async () => {
    setIsClearing(true);

    // Add slight delay for visual feedback
    setTimeout(() => {
      onClearOrder();
      setIsClearing(false);
    }, 300);
  };

  const handleCompleteOrder = () => {
    if (!hasItems || isProcessing) return;
    setIsModalOpen(true);
  };

  const handleOrderSuccess = () => {
    // Clear the order after successful creation
    onClearOrder();
    // Call the original completion handler if needed
    onCompleteOrder();
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Complete Order Button */}
        <Button
          onClick={handleCompleteOrder}
          disabled={!hasItems || isProcessing}
          className={cn(
            "w-full h-12 text-base font-semibold transition-all duration-300",
            "hover:scale-[1.02] active:scale-[0.98]",
            "hover:shadow-lg hover:shadow-primary/25",
            hasItems && "animate-pulse",
            !hasItems && "opacity-50 cursor-not-allowed"
          )}
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ShoppingCart
                className={cn(
                  "mr-2 h-4 w-4 transition-transform duration-200",
                  hasItems && "animate-bounce"
                )}
              />
              Complete Order
            </>
          )}
        </Button>

        {/* Clear Order Button with Confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!hasItems || isProcessing || isClearing}
              className={cn(
                "w-full transition-all duration-200",
                "hover:scale-[1.01] active:scale-[0.99]",
                "hover:border-destructive/30 hover:text-destructive",
                !hasItems && "opacity-50 cursor-not-allowed"
              )}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Order
                </>
              )}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear all items from this order? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearOrder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Order Info */}
        {hasItems && (
          <div className="pt-2 text-center animate-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs text-muted-foreground animate-pulse">
              Ready to complete your order
            </p>
          </div>
        )}

        {/* Order Creation Modal */}
        <CreateOrderModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          initialItems={orderItems}
          onSuccess={handleOrderSuccess}
        />
      </CardContent>
    </Card>
  );
}
