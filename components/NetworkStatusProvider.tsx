"use client";

import React, { useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useOrderStore } from "@/stores/order-store";
import { toast } from "sonner";

interface NetworkStatusProviderProps {
  children: React.ReactNode;
}

export function NetworkStatusProvider({
  children,
}: NetworkStatusProviderProps) {
  const networkStatus = useNetworkStatus();
  const { setOnlineStatus, isOnline, operationQueue, processOperationQueue } =
    useOrderStore();

  useEffect(() => {
    // Update store with network status
    setOnlineStatus(networkStatus.isOnline);

    // Show notifications for network status changes
    if (networkStatus.isOnline && !isOnline) {
      toast.success("Connection restored", {
        description: "Syncing pending changes...",
      });
    } else if (!networkStatus.isOnline && isOnline) {
      toast.warning("Connection lost", {
        description:
          "Changes will be saved locally and synced when connection is restored.",
      });
    }
  }, [networkStatus.isOnline, setOnlineStatus, isOnline]);

  useEffect(() => {
    // Show notification about queued operations
    if (operationQueue.length > 0 && networkStatus.isOnline) {
      toast.info(`Processing ${operationQueue.length} pending operations...`);
    }
  }, [operationQueue.length, networkStatus.isOnline]);

  useEffect(() => {
    // Show slow connection warning
    if (networkStatus.isSlowConnection && networkStatus.isOnline) {
      toast.warning("Slow connection detected", {
        description: "Some operations may take longer than usual.",
      });
    }
  }, [networkStatus.isSlowConnection, networkStatus.isOnline]);

  return (
    <>
      {children}

      {/* Network status indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        {!networkStatus.isOnline && (
          <div className="bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">Offline</span>
            {operationQueue.length > 0 && (
              <span className="text-xs bg-red-600 px-2 py-1 rounded">
                {operationQueue.length} pending
              </span>
            )}
          </div>
        )}

        {networkStatus.isOnline && networkStatus.isSlowConnection && (
          <div className="bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">Slow connection</span>
          </div>
        )}

        {networkStatus.isOnline && operationQueue.length > 0 && (
          <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-spin" />
            <span className="text-sm font-medium">Syncing...</span>
            <span className="text-xs bg-blue-600 px-2 py-1 rounded">
              {operationQueue.length}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
