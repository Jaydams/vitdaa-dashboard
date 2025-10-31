"use client";

import React, { useEffect } from "react";
import { NetworkStatusProvider } from "../NetworkStatusProvider";
import { useOrderStore } from "@/stores/order-store";
import { StaffSession } from "@/types/auth";
import EnhancedReceptionDashboard from "./EnhancedReceptionDashboard";

interface ReceptionDashboardWithSyncProps {
  staffSession: StaffSession;
}

export function ReceptionDashboardWithSync({
  staffSession,
}: ReceptionDashboardWithSyncProps) {
  const { startBackgroundSync, stopBackgroundSync, syncWithServer } =
    useOrderStore();

  useEffect(() => {
    // Start background sync when component mounts
    startBackgroundSync();

    // Initial sync
    syncWithServer().catch((error) => {
      console.error("Initial sync failed:", error);
    });

    // Cleanup on unmount
    return () => {
      stopBackgroundSync();
    };
  }, [startBackgroundSync, stopBackgroundSync, syncWithServer]);

  return (
    <NetworkStatusProvider>
      <EnhancedReceptionDashboard staffSession={staffSession} />
    </NetworkStatusProvider>
  );
}
