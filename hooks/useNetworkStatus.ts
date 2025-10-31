import { useState, useEffect } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  lastOnlineTime: Date | null;
  lastOfflineTime: Date | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: "unknown",
    lastOnlineTime: null,
    lastOfflineTime: null,
  });

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      return;
    }

    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      const now = new Date();

      setNetworkStatus((prev) => ({
        ...prev,
        isOnline,
        lastOnlineTime: isOnline ? now : prev.lastOnlineTime,
        lastOfflineTime: !isOnline ? now : prev.lastOfflineTime,
      }));
    };

    const checkConnectionSpeed = async () => {
      if (!navigator.onLine) return;

      try {
        const startTime = performance.now();

        // Make a small request to check connection speed
        const response = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-cache",
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Consider connection slow if request takes more than 2 seconds
        const isSlowConnection = duration > 2000;

        setNetworkStatus((prev) => ({
          ...prev,
          isSlowConnection,
        }));
      } catch (error) {
        // If request fails, consider it a slow/problematic connection
        setNetworkStatus((prev) => ({
          ...prev,
          isSlowConnection: true,
        }));
      }
    };

    const getConnectionType = () => {
      // @ts-ignore - navigator.connection is not in TypeScript types yet
      const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

      if (connection) {
        setNetworkStatus((prev) => ({
          ...prev,
          connectionType:
            connection.effectiveType || connection.type || "unknown",
        }));
      }
    };

    // Set up event listeners
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    // Check connection speed periodically when online
    const speedCheckInterval = setInterval(() => {
      if (navigator.onLine) {
        checkConnectionSpeed();
      }
    }, 30000); // Check every 30 seconds

    // Get initial connection type
    getConnectionType();

    // Listen for connection changes
    // @ts-ignore
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (connection) {
      connection.addEventListener("change", getConnectionType);
    }

    // Initial speed check
    if (navigator.onLine) {
      checkConnectionSpeed();
    }

    // Cleanup
    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
      clearInterval(speedCheckInterval);

      if (connection) {
        connection.removeEventListener("change", getConnectionType);
      }
    };
  }, []);

  return networkStatus;
}
