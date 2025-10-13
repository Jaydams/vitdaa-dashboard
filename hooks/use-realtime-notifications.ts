import { useState, useEffect, useCallback, useRef } from "react";
import {
  useNotificationService,
  type NotificationData,
  type NotificationPreferences,
} from "@/lib/realtime-notification-service";

interface NotificationState {
  notifications: any[];
  unreadCount: number;
  isLoading: boolean;
  error?: string;
}

interface UseRealtimeNotificationsOptions {
  businessId: string;
  staffId: string;
  autoFetch?: boolean;
  pollInterval?: number;
  maxNotifications?: number;
}

/**
 * React hook for managing real-time notifications
 */
export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions
) {
  const {
    businessId,
    staffId,
    autoFetch = true,
    pollInterval = 30000, // 30 seconds
    maxNotifications = 50,
  } = options;

  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
  });

  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const notificationService = useNotificationService(businessId, staffId);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch notifications from the server
   */
  const fetchNotifications = useCallback(
    async (unreadOnly = false) => {
      setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

      try {
        const result = await notificationService.getNotifications({
          unreadOnly,
          limit: maxNotifications,
        });

        if (result.success) {
          setState((prev) => ({
            ...prev,
            notifications: result.notifications || [],
            unreadCount: result.unreadCount || 0,
            isLoading: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: result.error,
            isLoading: false,
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: "Failed to fetch notifications",
          isLoading: false,
        }));
      }
    },
    [notificationService, maxNotifications]
  );

  /**
   * Send a notification
   */
  const sendNotification = useCallback(
    async (notification: NotificationData) => {
      try {
        const result = await notificationService.sendNotification(notification);
        if (!result.success) {
          console.error("Failed to send notification:", result.error);
        }
        return result;
      } catch (error) {
        console.error("Failed to send notification:", error);
        return { success: false, error: "Failed to send notification" };
      }
    },
    [notificationService]
  );

  /**
   * Broadcast a notification to all staff
   */
  const broadcastNotification = useCallback(
    async (notification: NotificationData) => {
      try {
        const result = await notificationService.broadcastNotification(
          notification
        );
        if (!result.success) {
          console.error("Failed to broadcast notification:", result.error);
        }
        return result;
      } catch (error) {
        console.error("Failed to broadcast notification:", error);
        return { success: false, error: "Failed to broadcast notification" };
      }
    },
    [notificationService]
  );

  /**
   * Mark notifications as read
   */
  const markAsRead = useCallback(
    async (notificationIds?: string[]) => {
      try {
        const result = await notificationService.markAsRead(notificationIds);

        if (result.success) {
          // Update local state
          setState((prev) => ({
            ...prev,
            notifications: prev.notifications.map((notification) => {
              if (
                !notificationIds ||
                notificationIds.includes(notification.notification_id)
              ) {
                return {
                  ...notification,
                  is_read: true,
                  read_at: new Date().toISOString(),
                };
              }
              return notification;
            }),
            unreadCount: notificationIds
              ? Math.max(0, prev.unreadCount - notificationIds.length)
              : 0,
          }));
        }

        return result;
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
        return {
          success: false,
          error: "Failed to mark notifications as read",
        };
      }
    },
    [notificationService]
  );

  /**
   * Get notification preferences
   */
  const getPreferences = useCallback(async () => {
    try {
      const result = await notificationService.getNotificationPreferences();
      if (result.success && result.preferences) {
        setPreferences(result.preferences);
      }
      return result;
    } catch (error) {
      console.error("Failed to get notification preferences:", error);
      return {
        success: false,
        error: "Failed to get notification preferences",
      };
    }
  }, [notificationService]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(
    async (newPreferences: NotificationPreferences) => {
      try {
        const result = await notificationService.updateNotificationPreferences(
          newPreferences
        );
        if (result.success) {
          setPreferences(newPreferences);
        }
        return result;
      } catch (error) {
        console.error("Failed to update notification preferences:", error);
        return {
          success: false,
          error: "Failed to update notification preferences",
        };
      }
    },
    [notificationService]
  );

  /**
   * Play notification sound if enabled
   */
  const playNotificationSound = useCallback(() => {
    if (preferences?.sound_enabled) {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  }, [preferences]);

  /**
   * Handle new notification received via real-time subscription
   */
  const handleNewNotification = useCallback(
    (notification: any) => {
      setState((prev) => ({
        ...prev,
        notifications: [
          notification,
          ...prev.notifications.slice(0, maxNotifications - 1),
        ],
        unreadCount: prev.unreadCount + 1,
      }));

      // Play sound if enabled
      playNotificationSound();

      // Show browser notification if enabled and supported
      if (
        preferences?.popup_enabled &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(
          notification.notification?.title || "New Notification",
          {
            body:
              notification.notification?.message ||
              "You have a new notification",
            icon: "/favicon.ico",
            tag: notification.notification_id,
          }
        );
      }
    },
    [maxNotifications, playNotificationSound, preferences]
  );

  /**
   * Request browser notification permission
   */
  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return Notification.permission === "granted";
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (businessId && staffId) {
      unsubscribeRef.current = notificationService.subscribeToNotifications(
        handleNewNotification
      );
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [businessId, staffId, notificationService, handleNewNotification]);

  // Set up polling for notifications
  useEffect(() => {
    if (autoFetch && pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        fetchNotifications();
      }, pollInterval);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [autoFetch, pollInterval, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
      getPreferences();
    }
  }, [autoFetch, fetchNotifications, getPreferences]);

  // Convenience methods for common notification types
  const notifyOrderUpdate = useCallback(
    (orderId: string, status: string, targetRoles?: string[]) => {
      return notificationService.notifyOrderUpdate(
        orderId,
        status,
        targetRoles
      );
    },
    [notificationService]
  );

  const notifyInventoryAlert = useCallback(
    (itemName: string, currentStock: number, minimumStock: number) => {
      return notificationService.notifyInventoryAlert(
        itemName,
        currentStock,
        minimumStock
      );
    },
    [notificationService]
  );

  const notifyTableAssignment = useCallback(
    (tableNumber: string, customerName: string) => {
      return notificationService.notifyTableAssignment(
        tableNumber,
        customerName
      );
    },
    [notificationService]
  );

  const notifyPaymentProcessed = useCallback(
    (orderId: string, amount: number, method: string) => {
      return notificationService.notifyPaymentProcessed(
        orderId,
        amount,
        method
      );
    },
    [notificationService]
  );

  const notifyInventoryRequest = useCallback(
    (
      requestId: string,
      status: "approved" | "denied",
      requesterName: string
    ) => {
      return notificationService.notifyInventoryRequest(
        requestId,
        status,
        requesterName
      );
    },
    [notificationService]
  );

  const notifySystemAlert = useCallback(
    (
      title: string,
      message: string,
      priority?: "low" | "normal" | "high" | "urgent"
    ) => {
      return notificationService.notifySystemAlert(title, message, priority);
    },
    [notificationService]
  );

  return {
    // State
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isLoading: state.isLoading,
    error: state.error,
    preferences,

    // Actions
    fetchNotifications,
    sendNotification,
    broadcastNotification,
    markAsRead,
    getPreferences,
    updatePreferences,
    requestNotificationPermission,

    // Convenience methods
    notifyOrderUpdate,
    notifyInventoryAlert,
    notifyTableAssignment,
    notifyPaymentProcessed,
    notifyInventoryRequest,
    notifySystemAlert,

    // Utility
    clearError: () => setState((prev) => ({ ...prev, error: undefined })),
    refresh: () => fetchNotifications(),
  };
}

/**
 * Hook for notification preferences management
 */
export function useNotificationPreferences(
  businessId: string,
  staffId: string
) {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const notificationService = useNotificationService(businessId, staffId);

  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await notificationService.getNotificationPreferences();
      if (result.success) {
        setPreferences(result.preferences || null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to fetch preferences");
    } finally {
      setIsLoading(false);
    }
  }, [notificationService]);

  const updatePreferences = useCallback(
    async (newPreferences: NotificationPreferences) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const result = await notificationService.updateNotificationPreferences(
          newPreferences
        );
        if (result.success) {
          setPreferences(newPreferences);
          return { success: true };
        } else {
          setError(result.error);
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMessage = "Failed to update preferences";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [notificationService]
  );

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refresh: fetchPreferences,
    clearError: () => setError(undefined),
  };
}
