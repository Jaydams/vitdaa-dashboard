"use client";

import { useState, useCallback, useMemo } from "react";
import { MenuItem } from "@/data/menu";
import { OrderItem } from "@/types/order.d";

// Extended OrderItem interface for the order state
export interface OrderStateItem
  extends Omit<OrderItem, "id" | "order_id" | "created_at"> {
  menu_item_id: number;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}

export interface OrderCalculations {
  subtotal: number;
  vatAmount: number;
  serviceChargeAmount: number;
  total: number;
  vatRate: number;
  serviceChargeRate: number;
}

export interface UseOrderStateReturn {
  orderItems: OrderStateItem[];
  isOrderPanelVisible: boolean;
  addItem: (item: MenuItem) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  removeItem: (itemId: number) => void;
  clearOrder: () => void;
  toggleOrderPanel: () => void;
  showOrderPanel: () => void;
  hideOrderPanel: () => void;
  calculations: OrderCalculations;
  itemCount: number;
}

interface UseOrderStateProps {
  vatRate?: number;
  serviceChargeRate?: number;
}

/**
 * Custom hook for managing order state in the menu grid interface
 * Handles adding, updating, and removing items from the order
 * Calculates totals with dynamic VAT and service charge rates
 */
export function useOrderState({
  vatRate = 7.5,
  serviceChargeRate = 2.5,
}: UseOrderStateProps = {}): UseOrderStateReturn {
  const [orderItems, setOrderItems] = useState<OrderStateItem[]>([]);
  const [isOrderPanelVisible, setIsOrderPanelVisible] = useState(false);

  // Add item to order or increase quantity if already exists
  const addItem = useCallback(
    (item: MenuItem) => {
      setOrderItems((prevItems) => {
        const existingItemIndex = prevItems.findIndex(
          (orderItem) => orderItem.menu_item_id === item.id
        );

        if (existingItemIndex >= 0) {
          // Item already exists, increase quantity
          const updatedItems = [...prevItems];
          const existingItem = updatedItems[existingItemIndex];
          const newQuantity = existingItem.quantity + 1;

          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            total_price: newQuantity * existingItem.menu_item_price,
          };

          return updatedItems;
        } else {
          // New item, add to order
          const newOrderItem: OrderStateItem = {
            menu_item_id: item.id,
            menu_item_name: item.name,
            menu_item_price: item.price,
            quantity: 1,
            total_price: item.price,
            image_url: item.image_url,
          };

          return [...prevItems, newOrderItem];
        }
      });

      // Show order panel when item is added
      if (!isOrderPanelVisible) {
        setIsOrderPanelVisible(true);
      }
    },
    [isOrderPanelVisible]
  );

  // Update quantity of specific item
  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setOrderItems((prevItems) =>
      prevItems.map((item) =>
        item.menu_item_id === itemId
          ? {
              ...item,
              quantity,
              total_price: quantity * item.menu_item_price,
            }
          : item
      )
    );
  }, []);

  // Remove item from order
  const removeItem = useCallback((itemId: number) => {
    setOrderItems((prevItems) =>
      prevItems.filter((item) => item.menu_item_id !== itemId)
    );
  }, []);

  // Clear all items from order
  const clearOrder = useCallback(() => {
    setOrderItems([]);
  }, []);

  // Toggle order panel visibility
  const toggleOrderPanel = useCallback(() => {
    setIsOrderPanelVisible((prev) => !prev);
  }, []);

  // Show order panel
  const showOrderPanel = useCallback(() => {
    setIsOrderPanelVisible(true);
  }, []);

  // Hide order panel
  const hideOrderPanel = useCallback(() => {
    setIsOrderPanelVisible(false);
  }, []);

  // Calculate order totals
  const calculations = useMemo((): OrderCalculations => {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    const vatAmount = (subtotal * vatRate) / 100;
    const serviceChargeAmount = (subtotal * serviceChargeRate) / 100;
    const total = subtotal + vatAmount + serviceChargeAmount;

    return {
      subtotal,
      vatAmount,
      serviceChargeAmount,
      total,
      vatRate,
      serviceChargeRate,
    };
  }, [orderItems, vatRate, serviceChargeRate]);

  // Total item count
  const itemCount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  return {
    orderItems,
    isOrderPanelVisible,
    addItem,
    updateQuantity,
    removeItem,
    clearOrder,
    toggleOrderPanel,
    showOrderPanel,
    hideOrderPanel,
    calculations,
    itemCount,
  };
}
