"use client";

import { useEffect } from "react";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import OrderNotificationModal from "./OrderNotificationModal";

interface OrderNotificationProviderProps {
  businessId: string;
  children: React.ReactNode;
}

export default function OrderNotificationProvider({
  businessId,
  children,
}: OrderNotificationProviderProps) {
  const {
    pendingOrders,
    isModalOpen,
    unreadCount,
    openModal,
    closeModal,
    modalProps,
  } = useOrderNotifications({
    businessId,
    enableModal: true,
    enableSound: true,
    enableToast: true,
  });

  return (
    <>
      {children}
      <OrderNotificationModal businessId={businessId} />
    </>
  );
}
