"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";
import { toast, Toaster } from "sonner";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Bell,
  X,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface NotificationOptions {
  id?: string;
  title?: string;
  description?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  priority?: "low" | "normal" | "high" | "critical";
  category?: "system" | "payment" | "order" | "network" | "user";
}

export interface ProgressNotificationOptions extends NotificationOptions {
  progress?: number;
  total?: number;
  status?: "pending" | "processing" | "completed" | "failed";
}

export interface PersistentNotification extends NotificationOptions {
  id: string;
  timestamp: Date;
  dismissed: boolean;
  type: "success" | "error" | "warning" | "info" | "progress";
}

interface NotificationContextType {
  // Basic notifications
  showSuccess: (message: string, options?: NotificationOptions) => string;
  showError: (message: string, options?: NotificationOptions) => string;
  showWarning: (message: string, options?: NotificationOptions) => string;
  showInfo: (message: string, options?: NotificationOptions) => string;

  // Progress notifications
  showProgress: (
    message: string,
    options?: ProgressNotificationOptions
  ) => string;
  updateProgress: (id: string, progress: number, message?: string) => void;
  completeProgress: (id: string, message?: string) => void;
  failProgress: (id: string, message?: string) => void;

  // Persistent notifications
  persistentNotifications: PersistentNotification[];
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Network status
  showNetworkStatus: (isOnline: boolean) => void;

  // Batch operations
  showBatchOperation: (operations: string[], onComplete?: () => void) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  maxPersistentNotifications?: number;
}

export function NotificationProvider({
  children,
  maxPersistentNotifications = 10,
}: NotificationProviderProps) {
  const [persistentNotifications, setPersistentNotifications] = useState<
    PersistentNotification[]
  >([]);
  const [progressNotifications, setProgressNotifications] = useState<
    Map<string, ProgressNotificationOptions>
  >(new Map());

  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    return `notification_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }, []);

  // Add to persistent notifications
  const addPersistentNotification = useCallback(
    (
      type: PersistentNotification["type"],
      message: string,
      options: NotificationOptions = {}
    ) => {
      const notification: PersistentNotification = {
        id: options.id || generateId(),
        title: options.title,
        description: message,
        timestamp: new Date(),
        dismissed: false,
        type,
        priority: options.priority || "normal",
        category: options.category || "system",
        persistent: options.persistent,
        action: options.action,
        onDismiss: options.onDismiss,
      };

      setPersistentNotifications((prev) => {
        const updated = [notification, ...prev];
        // Keep only the most recent notifications
        return updated.slice(0, maxPersistentNotifications);
      });

      return notification.id;
    },
    [generateId, maxPersistentNotifications]
  );

  // Show success notification
  const showSuccess = useCallback(
    (message: string, options: NotificationOptions = {}) => {
      const id = options.id || generateId();

      toast.success(message, {
        id,
        duration: options.duration || 4000,
        description: options.description,
        action: options.action
          ? {
              label: options.action.label,
              onClick: options.action.onClick,
            }
          : undefined,
        onDismiss: options.onDismiss,
      });

      if (
        options.persistent ||
        options.priority === "high" ||
        options.priority === "critical"
      ) {
        addPersistentNotification("success", message, { ...options, id });
      }

      return id;
    },
    [generateId, addPersistentNotification]
  );

  // Show error notification
  const showError = useCallback(
    (message: string, options: NotificationOptions = {}) => {
      const id = options.id || generateId();

      toast.error(message, {
        id,
        duration: options.duration || 6000,
        description: options.description,
        action: options.action
          ? {
              label: options.action.label,
              onClick: options.action.onClick,
            }
          : undefined,
        onDismiss: options.onDismiss,
      });

      // Always persist error notifications
      addPersistentNotification("error", message, {
        ...options,
        id,
        persistent: true,
      });

      return id;
    },
    [generateId, addPersistentNotification]
  );

  // Show warning notification
  const showWarning = useCallback(
    (message: string, options: NotificationOptions = {}) => {
      const id = options.id || generateId();

      toast.warning(message, {
        id,
        duration: options.duration || 5000,
        description: options.description,
        action: options.action
          ? {
              label: options.action.label,
              onClick: options.action.onClick,
            }
          : undefined,
        onDismiss: options.onDismiss,
      });

      if (
        options.persistent ||
        options.priority === "high" ||
        options.priority === "critical"
      ) {
        addPersistentNotification("warning", message, { ...options, id });
      }

      return id;
    },
    [generateId, addPersistentNotification]
  );

  // Show info notification
  const showInfo = useCallback(
    (message: string, options: NotificationOptions = {}) => {
      const id = options.id || generateId();

      toast.info(message, {
        id,
        duration: options.duration || 4000,
        description: options.description,
        action: options.action
          ? {
              label: options.action.label,
              onClick: options.action.onClick,
            }
          : undefined,
        onDismiss: options.onDismiss,
      });

      if (options.persistent) {
        addPersistentNotification("info", message, { ...options, id });
      }

      return id;
    },
    [generateId, addPersistentNotification]
  );

  // Show progress notification
  const showProgress = useCallback(
    (message: string, options: ProgressNotificationOptions = {}) => {
      const id = options.id || generateId();

      const progressOptions = {
        ...options,
        id,
        progress: options.progress || 0,
        total: options.total || 100,
        status: options.status || ("processing" as const),
      };

      setProgressNotifications(
        (prev) => new Map(prev.set(id, progressOptions))
      );

      // Show initial toast
      toast.loading(message, {
        id,
        duration: Infinity, // Keep open until manually dismissed
        description: options.description,
      });

      addPersistentNotification("progress", message, {
        ...options,
        id,
        persistent: true,
      });

      return id;
    },
    [generateId, addPersistentNotification]
  );

  // Update progress notification
  const updateProgress = useCallback(
    (id: string, progress: number, message?: string) => {
      setProgressNotifications((prev) => {
        const existing = prev.get(id);
        if (!existing) return prev;

        const updated = {
          ...existing,
          progress,
          description: message || existing.description,
        };

        const newMap = new Map(prev);
        newMap.set(id, updated);

        // Update toast
        toast.loading(message || existing.description || "Processing...", {
          id,
          description: `${Math.round(progress)}% complete`,
        });

        return newMap;
      });
    },
    []
  );

  // Complete progress notification
  const completeProgress = useCallback(
    (id: string, message?: string) => {
      const progressNotification = progressNotifications.get(id);

      setProgressNotifications((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      // Update to success toast
      toast.success(message || "Operation completed successfully", {
        id,
        duration: 4000,
      });

      // Update persistent notification
      setPersistentNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                type: "success" as const,
                description: message || notification.description,
              }
            : notification
        )
      );
    },
    [progressNotifications]
  );

  // Fail progress notification
  const failProgress = useCallback(
    (id: string, message?: string) => {
      const progressNotification = progressNotifications.get(id);

      setProgressNotifications((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      // Update to error toast
      toast.error(message || "Operation failed", {
        id,
        duration: 6000,
      });

      // Update persistent notification
      setPersistentNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                type: "error" as const,
                description: message || notification.description,
              }
            : notification
        )
      );
    },
    [progressNotifications]
  );

  // Show network status
  const showNetworkStatus = useCallback((isOnline: boolean) => {
    const id = "network_status";

    if (isOnline) {
      toast.success("Connection restored", {
        id,
        duration: 3000,
        icon: <Wifi className="h-4 w-4" />,
      });
    } else {
      toast.error("Connection lost", {
        id,
        duration: Infinity,
        icon: <WifiOff className="h-4 w-4" />,
        description: "Working in offline mode",
      });
    }
  }, []);

  // Show batch operation
  const showBatchOperation = useCallback(
    (operations: string[], onComplete?: () => void) => {
      const id = generateId();
      let completedCount = 0;

      const updateBatchProgress = () => {
        completedCount++;
        const progress = (completedCount / operations.length) * 100;

        updateProgress(
          id,
          progress,
          `Processing ${completedCount}/${operations.length} operations`
        );

        if (completedCount === operations.length) {
          completeProgress(id, "All operations completed successfully");
          onComplete?.();
        }
      };

      showProgress(`Processing ${operations.length} operations`, {
        id,
        progress: 0,
        total: 100,
        category: "system",
        priority: "normal",
      });

      return id;
    },
    [generateId, showProgress, updateProgress, completeProgress]
  );

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    setPersistentNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, dismissed: true }
          : notification
      )
    );

    // Also dismiss toast if it exists
    toast.dismiss(id);
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setPersistentNotifications([]);
    setProgressNotifications(new Map());
    toast.dismiss();
  }, []);

  const contextValue: NotificationContextType = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showProgress,
    updateProgress,
    completeProgress,
    failProgress,
    persistentNotifications: persistentNotifications.filter(
      (n) => !n.dismissed
    ),
    dismissNotification,
    clearAllNotifications,
    showNetworkStatus,
    showBatchOperation,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Toaster
        position="top-right"
        expand={true}
        richColors={true}
        closeButton={true}
        toastOptions={{
          duration: 4000,
          style: {
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />
    </NotificationContext.Provider>
  );
}

// Persistent Notifications Panel Component
export function PersistentNotificationsPanel() {
  const {
    persistentNotifications,
    dismissNotification,
    clearAllNotifications,
  } = useNotifications();

  if (persistentNotifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (type: PersistentNotification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-600" />;
      case "progress":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 border-red-300 text-red-800";
      case "high":
        return "bg-orange-100 border-orange-300 text-orange-800";
      case "normal":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "low":
        return "bg-gray-100 border-gray-300 text-gray-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-96 overflow-y-auto z-50">
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications ({persistentNotifications.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>

          <div className="space-y-2">
            {persistentNotifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-2 p-2 rounded border bg-white dark:bg-gray-800"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <div className="font-medium text-sm">
                      {notification.title}
                    </div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {notification.description}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(
                        notification.priority || "normal"
                      )}`}
                    >
                      {notification.priority || "normal"}
                    </Badge>

                    <span className="text-xs text-gray-500">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {notification.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  {notification.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={notification.action.onClick}
                      className="mt-2 text-xs"
                    >
                      {notification.action.label}
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissNotification(notification.id)}
                  className="flex-shrink-0 p-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Progress Indicator Component
interface ProgressIndicatorProps {
  id: string;
  title?: string;
  description?: string;
  progress?: number;
  total?: number;
  status?: "pending" | "processing" | "completed" | "failed";
  showPercentage?: boolean;
  className?: string;
}

export function ProgressIndicator({
  id,
  title,
  description,
  progress = 0,
  total = 100,
  status = "processing",
  showPercentage = true,
  className = "",
}: ProgressIndicatorProps) {
  const percentage = Math.round((progress / total) * 100);

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "processing":
        return "bg-blue-500";
      case "pending":
        return "bg-gray-400";
      default:
        return "bg-blue-500";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case "pending":
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {(title || description) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              {title && <div className="font-medium text-sm">{title}</div>}
              {description && (
                <div className="text-xs text-gray-600">{description}</div>
              )}
            </div>
          </div>
          {showPercentage && (
            <span className="text-sm font-medium">{percentage}%</span>
          )}
        </div>
      )}

      <Progress value={percentage} className="h-2" />
    </div>
  );
}
