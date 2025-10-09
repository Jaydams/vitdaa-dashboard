"use client";

import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Trash2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmationDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
  requiresConfirmation?: boolean;
  confirmationText?: string;
  confirmationPlaceholder?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  requiresConfirmation = false,
  confirmationText = "",
  confirmationPlaceholder = "Type to confirm",
  isLoading = false,
  onConfirm,
  onCancel,
  disabled = false,
  children,
}: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const isConfirmationValid =
    !requiresConfirmation || inputValue === confirmationText;

  const handleConfirm = async () => {
    if (!isConfirmationValid || isProcessing) return;

    setIsProcessing(true);
    try {
      await onConfirm();
      setOpen(false);
      setInputValue("");
    } catch (error) {
      // Error handling is done by the parent component
      console.error("Confirmation action failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (isProcessing) return;

    setOpen(false);
    setInputValue("");
    onCancel?.();
  };

  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <Trash2 className="h-6 w-6 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      default:
        return <Ban className="h-6 w-6 text-blue-600" />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case "destructive":
        return "destructive";
      case "warning":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {(requiresConfirmation || children) && (
          <div className="space-y-4">
            {requiresConfirmation && (
              <div className="space-y-2">
                <Label htmlFor="confirmation-input">
                  Type{" "}
                  <span className="font-mono font-semibold">
                    {confirmationText}
                  </span>{" "}
                  to confirm
                </Label>
                <Input
                  id="confirmation-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={confirmationPlaceholder}
                  disabled={isProcessing || isLoading}
                  className={cn(
                    "font-mono",
                    !isConfirmationValid &&
                      inputValue.length > 0 &&
                      "border-red-300 focus:border-red-500"
                  )}
                />
                {!isConfirmationValid && inputValue.length > 0 && (
                  <p className="text-sm text-red-600">
                    Text doesn't match. Please type exactly: {confirmationText}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        )}

        <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isProcessing || isLoading}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isProcessing || isLoading}
            className={cn(
              getButtonVariant() === "destructive" &&
                "bg-red-600 hover:bg-red-700 focus:ring-red-600"
            )}
          >
            {(isProcessing || isLoading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Specialized confirmation dialogs for common use cases

export interface DeleteConfirmationProps {
  trigger: React.ReactNode;
  itemName: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  requiresConfirmation?: boolean;
}

export function DeleteConfirmation({
  trigger,
  itemName,
  itemType = "item",
  onConfirm,
  onCancel,
  isLoading = false,
  disabled = false,
  requiresConfirmation = true,
}: DeleteConfirmationProps) {
  const confirmationText = requiresConfirmation ? "DELETE" : "";

  return (
    <ConfirmationDialog
      trigger={trigger}
      title={`Delete ${itemType}`}
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone and will permanently remove the ${itemType} from the system.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="destructive"
      requiresConfirmation={requiresConfirmation}
      confirmationText={confirmationText}
      confirmationPlaceholder="Type DELETE to confirm"
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      disabled={disabled}
    />
  );
}

export interface VoidOrderConfirmationProps {
  trigger: React.ReactNode;
  orderNumber: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function VoidOrderConfirmation({
  trigger,
  orderNumber,
  onConfirm,
  onCancel,
  isLoading = false,
  disabled = false,
}: VoidOrderConfirmationProps) {
  return (
    <ConfirmationDialog
      trigger={trigger}
      title="Void Order"
      description={`Are you sure you want to void order #${orderNumber}? This will permanently delete the order and all associated data. This action cannot be undone.`}
      confirmText="Void Order"
      cancelText="Cancel"
      variant="destructive"
      requiresConfirmation={true}
      confirmationText="VOID"
      confirmationPlaceholder="Type VOID to confirm"
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      disabled={disabled}
    >
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-200">
            <p className="font-medium mb-1">
              Warning: This action is irreversible
            </p>
            <ul className="text-xs space-y-1 text-red-700 dark:text-red-300">
              <li>• Order will be permanently deleted from the database</li>
              <li>• All order items and payment records will be removed</li>
              <li>• Order history and audit logs will be updated</li>
              <li>• This cannot be undone</li>
            </ul>
          </div>
        </div>
      </div>
    </ConfirmationDialog>
  );
}

export interface StatusChangeConfirmationProps {
  trigger: React.ReactNode;
  currentStatus: string;
  newStatus: string;
  orderNumber?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function StatusChangeConfirmation({
  trigger,
  currentStatus,
  newStatus,
  orderNumber,
  onConfirm,
  onCancel,
  isLoading = false,
  disabled = false,
}: StatusChangeConfirmationProps) {
  const isDestructive = newStatus === "cancelled";
  const orderText = orderNumber ? ` for order #${orderNumber}` : "";

  return (
    <ConfirmationDialog
      trigger={trigger}
      title="Change Order Status"
      description={`Are you sure you want to change the status from "${currentStatus}" to "${newStatus}"${orderText}? ${
        isDestructive ? "This action may not be reversible." : ""
      }`}
      confirmText={`Change to ${newStatus}`}
      cancelText="Cancel"
      variant={isDestructive ? "warning" : "default"}
      requiresConfirmation={false}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      disabled={disabled}
    />
  );
}

// Hook for managing confirmation dialogs
export function useConfirmationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  const executeWithConfirmation = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
      closeDialog();
    } catch (error) {
      // Error is handled by the action itself
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isOpen,
    isLoading,
    openDialog,
    closeDialog,
    executeWithConfirmation,
  };
}
