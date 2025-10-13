"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
  X,
  Eye,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface RequestNotification {
  id: string;
  request_id: string;
  notification_type: "status_update" | "admin_response" | "approval" | "denial";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  inventory_request: {
    id: string;
    status: string;
    urgency_level: string;
    total_estimated_cost: number;
    inventory_request_items: Array<{
      inventory_item: {
        name: string;
      };
    }>;
  };
}

interface InventoryRequestNotificationsProps {
  staffSession: any;
  onViewRequest?: (requestId: string) => void;
}

export default function InventoryRequestNotifications({
  staffSession,
  onViewRequest,
}: InventoryRequestNotificationsProps) {
  const [notifications, setNotifications] = useState<RequestNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchNotifications();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const supabase = createClient();

    const channel = supabase
      .channel("inventory-request-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_requests",
          filter: `requested_by_staff_id=eq.${staffSession.staff.id}`,
        },
        (payload) => {
          console.log("Inventory request change:", payload);
          handleRequestUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleRequestUpdate = (payload: any) => {
    if (payload.eventType === "UPDATE") {
      const oldRecord = payload.old;
      const newRecord = payload.new;

      // Check if status changed
      if (oldRecord.status !== newRecord.status) {
        createNotification({
          request_id: newRecord.id,
          notification_type: "status_update",
          title: "Request Status Updated",
          message: `Your inventory request status changed from ${oldRecord.status} to ${newRecord.status}`,
        });
      }

      // Check if admin notes were added
      if (!oldRecord.admin_notes && newRecord.admin_notes) {
        createNotification({
          request_id: newRecord.id,
          notification_type: "admin_response",
          title: "Admin Response Received",
          message: "Admin has added notes to your inventory request",
        });
      }

      // Check if request was approved
      if (
        newRecord.status === "approved" ||
        newRecord.status === "partially_approved"
      ) {
        createNotification({
          request_id: newRecord.id,
          notification_type: "approval",
          title: "Request Approved",
          message: `Your inventory request has been ${newRecord.status.replace(
            "_",
            " "
          )}`,
        });
      }

      // Check if request was denied
      if (newRecord.status === "denied") {
        createNotification({
          request_id: newRecord.id,
          notification_type: "denial",
          title: "Request Denied",
          message: "Your inventory request has been denied",
        });
      }

      fetchNotifications();
    }
  };

  const createNotification = async (notificationData: {
    request_id: string;
    notification_type: string;
    title: string;
    message: string;
  }) => {
    try {
      await fetch("/api/inventory/requests/notifications", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...notificationData,
          staff_id: staffSession.staff.id,
        }),
      });

      // Show toast notification
      toast.success(notificationData.title, {
        description: notificationData.message,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/inventory/requests/notifications?staff_id=${staffSession.staff.id}&limit=20`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        console.error("Failed to fetch notifications");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/inventory/requests/notifications/${notificationId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_read: true,
          }),
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.is_read);

      await Promise.all(
        unreadNotifications.map((notification) => markAsRead(notification.id))
      );

      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "approval":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "denial":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "status_update":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "admin_response":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "approval":
        return "border-l-green-400 bg-green-50";
      case "denial":
        return "border-l-red-400 bg-red-50";
      case "status_update":
        return "border-l-blue-400 bg-blue-50";
      case "admin_response":
        return "border-l-orange-400 bg-orange-50";
      default:
        return "border-l-gray-400 bg-gray-50";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        {unreadCount > 0 ? (
          <Bell className="w-4 h-4" />
        ) : (
          <BellOff className="w-4 h-4" />
        )}
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Request Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <BellOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(
                      notification.notification_type
                    )} ${
                      !notification.is_read ? "bg-opacity-100" : "bg-opacity-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.notification_type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4
                            className={`text-sm font-medium ${
                              !notification.is_read
                                ? "text-gray-900"
                                : "text-gray-600"
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>

                        <p
                          className={`text-sm ${
                            !notification.is_read
                              ? "text-gray-700"
                              : "text-gray-500"
                          } mb-2`}
                        >
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              {
                                addSuffix: true,
                              }
                            )}
                          </span>

                          <div className="flex items-center gap-2">
                            {onViewRequest && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  onViewRequest(notification.request_id);
                                  markAsRead(notification.id);
                                  setShowNotifications(false);
                                }}
                                className="text-xs h-6 px-2"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}

                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs h-6 px-2"
                              >
                                Mark read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNotifications(false);
                  // Navigate to full notifications page if needed
                }}
                className="text-xs"
              >
                View all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
