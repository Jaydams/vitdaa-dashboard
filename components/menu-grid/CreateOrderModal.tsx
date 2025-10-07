"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateOrderForm } from "@/app/(dashboard)/orders/_components/CreateOrderForm";
import { OrderStateItem } from "@/hooks/use-order-state";

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItems: OrderStateItem[];
  onSuccess: () => void;
}

/**
 * Modal wrapper for the CreateOrderForm component
 * Handles opening the order creation form with pre-populated items from the menu grid
 * Manages modal state and success/cancellation callbacks
 */
export function CreateOrderModal({
  open,
  onOpenChange,
  initialItems,
  onSuccess,
}: CreateOrderModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Order</DialogTitle>
        </DialogHeader>
        <CreateOrderForm
          initialItems={initialItems}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
