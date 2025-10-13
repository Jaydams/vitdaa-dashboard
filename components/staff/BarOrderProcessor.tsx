"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Wine,
  CheckCircle,
  AlertTriangle,
  Timer,
  MessageSquare,
  Star,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Coffee,
  Droplets,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface BarOrder {
  id: string;
  invoice_no: string;
  customer_name: string;
  table_number?: string;
  items: BarOrderItem[];
  total_amount: number;
  status: "pending" | "processing" | "ready" | "delivered" | "cancelled";
  created_at: string;
  special_instructions?: string;
  priority_level: "low" | "normal" | "high" | "urgent";
  estimated_completion_time?: string;
  preparation_started_at?: string;
  preparation_completed_at?: string;
  bar_notes?: string;
}

interface BarOrderItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  special_instructions?: string;
  item_status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  is_bar_item: boolean;
  preparation_time?: number; // in minutes
  preparation_started_at?: string;
  preparation_completed_at?: string;
  preparation_notes?: string;
}

interface BarOrderProcessorProps {
  orders: BarOrder[];
  onStatusUpdate: (orderId: string, status: string, notes?: string) => void;
  onItemStatusUpdate: (
    orderId: string,
    itemId: string,
    status: string,
    notes?: string
  ) => void;
  onAddNotes: (orderId: string, notes: string) => void;
  onSetPriority: (orderId: string, priority: string) => void;
  onStartPreparation: (orderId: string) => void;
  onCompletePreparation: (orderId: string) => void;
}

export default function BarOrderProcessor({
  orders,
  onStatusUpdate,
  onItemStatusUpdate,
  onAddNotes,
  onSetPriority,
  onStartPreparation,
  onCompletePreparation,
}: BarOrderProcessorProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [preparationTimers, setPreparationTimers] = useState<
    Record<string, number>
  >({});

  // Sort orders by priority and creation time
  const sortedOrders = [...orders].sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const aPriority = priorityOrder[a.priority_level];
    const bPriority = priorityOrder[b.priority_level];

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // Older orders first
  });

  // Update preparation timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setPreparationTimers((prev) => {
        const updated = { ...prev };
        orders.forEach((order) => {
          if (order.status === "processing" && order.preparation_started_at) {
            const startTime = new Date(order.preparation_started_at).getTime();
            const now = new Date().getTime();
            updated[order.id] = Math.floor((now - startTime) / 1000); // seconds
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [orders]);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      if (status === "processing") {
        onStartPreparation(orderId);
      } else if (status === "ready") {
        onCompletePreparation(orderId);
      }

      await onStatusUpdate(orderId, status, activeNotes[orderId]);
      setActiveNotes((prev) => ({ ...prev, [orderId]: "" }));
      toast.success(
        `Order ${status === "ready" ? "completed" : "updated"} successfully`
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleItemStatusUpdate = async (
    orderId: string,
    itemId: string,
    status: string
  ) => {
    try {
      await onItemStatusUpdate(orderId, itemId, status, itemNotes[itemId]);
      setItemNotes((prev) => ({ ...prev, [itemId]: "" }));
      toast.success(
        `Drink ${status === "ready" ? "ready" : "updated"} successfully`
      );
    } catch (error) {
      console.error("Error updating item status:", error);
      toast.error("Failed to update drink status");
    }
  };

  const handleAddNotes = async (orderId: string) => {
    const notes = activeNotes[orderId]?.trim();
    if (!notes) {
      toast.error("Please enter notes before adding");
      return;
    }

    try {
      await onAddNotes(orderId, notes);
      setActiveNotes((prev) => ({ ...prev, [orderId]: "" }));
      toast.success("Notes added successfully");
    } catch (error) {
      console.error("Error adding notes:", error);
      toast.error("Failed to add notes");
    }
  };

  const handleSetPriority = async (orderId: string, priority: string) => {
    try {
      await onSetPriority(orderId, priority);
      toast.success(`Priority set to ${priority}`);
    } catch (error) {
      console.error("Error setting priority:", error);
      toast.error("Failed to set priority");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ready":
        return "bg-green-100 text-green-800 border-green-200";
      case "delivered":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "preparing":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ready":
        return "bg-green-50 text-green-700 border-green-200";
      case "served":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatPreparationTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getEstimatedCompletionTime = (order: BarOrder) => {
    if (order.estimated_completion_time) {
      return new Date(order.estimated_completion_time);
    }

    // Calculate based on items and current time (beverages are typically faster)
    const totalPrepTime = order.items.reduce((total, item) => {
      return total + (item.preparation_time || 3); // Default 3 minutes per beverage
    }, 0);

    const startTime = order.preparation_started_at
      ? new Date(order.preparation_started_at)
      : new Date();

    return new Date(startTime.getTime() + totalPrepTime * 60 * 1000);
  };

  const getDrinkIcon = (itemName: string) => {
    const name = itemName.toLowerCase();
    if (
      name.includes("coffee") ||
      name.includes("espresso") ||
      name.includes("latte")
    ) {
      return <Coffee className="w-4 h-4" />;
    }
    if (
      name.includes("wine") ||
      name.includes("beer") ||
      name.includes("alcohol")
    ) {
      return <Wine className="w-4 h-4" />;
    }
    return <Droplets className="w-4 h-4" />;
  };

  if (sortedOrders.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Wine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No bar orders to process</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedOrders.map((order) => {
        const isExpanded = expandedOrders.has(order.id);
        const preparationTime = preparationTimers[order.id] || 0;
        const estimatedCompletion = getEstimatedCompletionTime(order);
        const isOverdue =
          order.status === "processing" && new Date() > estimatedCompletion;

        return (
          <Card
            key={order.id}
            className={`transition-all duration-200 ${
              order.priority_level === "urgent"
                ? "border-red-300 shadow-red-100"
                : order.priority_level === "high"
                ? "border-orange-300 shadow-orange-100"
                : ""
            } ${isOverdue ? "bg-red-50" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Wine className="w-5 h-5 text-purple-600" />
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {order.invoice_no}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {order.customer_name}
                        {order.table_number && ` • Table ${order.table_number}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(order.priority_level)}>
                      {order.priority_level}
                    </Badge>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {order.status === "processing" && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Timer className="w-4 h-4" />
                      <span
                        className={
                          isOverdue ? "text-red-600 font-semibold" : ""
                        }
                      >
                        {formatPreparationTime(preparationTime)}
                      </span>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleOrderExpansion(order.id)}
                  >
                    {isExpanded ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  Ordered {formatDistanceToNow(new Date(order.created_at))} ago
                </span>
                {order.status === "processing" && (
                  <span className={isOverdue ? "text-red-600" : ""}>
                    ETA: {estimatedCompletion.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {order.special_instructions && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Special Instructions:</strong>{" "}
                    {order.special_instructions}
                  </p>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {/* Beverage Items */}
              <div className="space-y-3 mb-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        {getDrinkIcon(item.menu_item_name)}
                        <span className="font-medium">{item.quantity}x</span>
                        <span>{item.menu_item_name}</span>
                        <Badge className={getItemStatusColor(item.item_status)}>
                          {item.item_status}
                        </Badge>
                      </div>

                      {item.special_instructions && (
                        <p className="text-sm text-gray-600 mt-1 ml-8">
                          Note: {item.special_instructions}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.item_status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleItemStatusUpdate(
                              order.id,
                              item.id,
                              "preparing"
                            )
                          }
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Start
                        </Button>
                      )}

                      {item.item_status === "preparing" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleItemStatusUpdate(order.id, item.id, "ready")
                          }
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ready
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                {order.status === "pending" && (
                  <Button
                    onClick={() => handleStatusUpdate(order.id, "processing")}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Preparation
                  </Button>
                )}

                {order.status === "processing" && (
                  <Button
                    onClick={() => handleStatusUpdate(order.id, "ready")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Ready
                  </Button>
                )}

                {(order.status === "pending" ||
                  order.status === "processing") && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(order.id, "cancelled")}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Cancel Order
                  </Button>
                )}

                {/* Priority Controls */}
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPriority(order.id, "high")}
                    disabled={order.priority_level === "urgent"}
                    title="Increase Priority"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPriority(order.id, "low")}
                    disabled={order.priority_level === "low"}
                    title="Decrease Priority"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Bar Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Bar Notes
                    </label>
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Add preparation notes..."
                        value={activeNotes[order.id] || ""}
                        onChange={(e) =>
                          setActiveNotes((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                        className="flex-1"
                        rows={2}
                      />
                      <Button
                        onClick={() => handleAddNotes(order.id)}
                        disabled={!activeNotes[order.id]?.trim()}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Existing Notes */}
                  {order.bar_notes && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                      <p className="text-sm text-purple-800">
                        <strong>Previous Notes:</strong> {order.bar_notes}
                      </p>
                    </div>
                  )}

                  {/* Order Timeline */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Order Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Order Created:</span>
                        <span>
                          {new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>

                      {order.preparation_started_at && (
                        <div className="flex justify-between">
                          <span>Preparation Started:</span>
                          <span>
                            {new Date(
                              order.preparation_started_at
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {order.preparation_completed_at && (
                        <div className="flex justify-between">
                          <span>Preparation Completed:</span>
                          <span>
                            {new Date(
                              order.preparation_completed_at
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drink Preparation Tips */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">
                      💡 Preparation Tips
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Check ice levels and glassware availability</li>
                      <li>• Verify special dietary requirements</li>
                      <li>• Coordinate with service staff for timing</li>
                      <li>• Ensure garnishes and mixers are ready</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
