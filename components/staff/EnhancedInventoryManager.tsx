"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Bell,
  BellOff,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  category: string;
  last_updated: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  usage_prediction?: number;
  restock_suggestion?: {
    suggested_quantity: number;
    urgency: "low" | "medium" | "high";
    reason: string;
  };
}

interface InventoryAlert {
  id: string;
  alert_type: "low_stock" | "out_of_stock" | "expiring" | "expired";
  message: string;
  priority: "low" | "medium" | "high";
  is_active: boolean;
  created_at: string;
  inventory_items: {
    id: string;
    name: string;
    current_quantity: number;
    minimum_quantity: number;
    unit: string;
  };
}

interface EnhancedInventoryManagerProps {
  staffSession: any;
  onInventoryUpdate: (itemId: string, newStock: number) => void;
}

export default function EnhancedInventoryManager({
  staffSession,
  onInventoryUpdate,
}: EnhancedInventoryManagerProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "inventory" | "alerts" | "analytics"
  >("inventory");

  // Fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setIsLoading(true);

      // Fetch inventory items
      const inventoryResponse = await fetch("/api/inventory/kitchen", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        const enhancedInventory = inventoryData.items.map((item: any) => ({
          ...item,
          usage_prediction: calculateUsagePrediction(item),
          restock_suggestion: generateRestockSuggestion(item),
        }));
        setInventory(enhancedInventory);
      } else {
        console.error("Failed to fetch inventory");
        toast.error("Failed to load inventory data");
      }

      // Fetch inventory alerts
      const alertsResponse = await fetch(
        "/api/inventory/alerts?is_active=true",
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      } else {
        console.error("Failed to fetch alerts");
      }
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    fetchInventoryData();

    const supabase = createClient();
    const channel = supabase
      .channel("enhanced-inventory-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_items",
        },
        (payload) => {
          console.log("Inventory realtime change:", payload);
          fetchInventoryData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_alerts",
        },
        (payload) => {
          console.log("Inventory alerts realtime change:", payload);
          fetchInventoryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate usage prediction based on historical data
  const calculateUsagePrediction = (item: any): number => {
    // Simple prediction based on current stock vs minimum stock
    const stockRatio = item.current_stock / (item.minimum_stock || 1);

    if (stockRatio <= 0.5) return 90; // High usage predicted
    if (stockRatio <= 1) return 70; // Medium usage predicted
    if (stockRatio <= 2) return 40; // Low usage predicted
    return 20; // Very low usage predicted
  };

  // Generate restock suggestions
  const generateRestockSuggestion = (item: any) => {
    const stockRatio = item.current_stock / (item.minimum_stock || 1);

    if (item.current_stock === 0) {
      return {
        suggested_quantity: item.minimum_stock * 3,
        urgency: "high" as const,
        reason: "Out of stock - immediate restock required",
      };
    }

    if (stockRatio <= 0.5) {
      return {
        suggested_quantity: item.minimum_stock * 2,
        urgency: "high" as const,
        reason: "Critical low stock - restock soon",
      };
    }

    if (stockRatio <= 1) {
      return {
        suggested_quantity: item.minimum_stock * 1.5,
        urgency: "medium" as const,
        reason: "Below minimum stock - consider restocking",
      };
    }

    return null;
  };

  // Handle stock level updates
  const handleStockUpdate = async (itemId: string, newStock: number) => {
    try {
      // Log staff activity
      await logStaffActivity({
        activity_type: "inventory_updated",
        activity_details: {
          resource_id: itemId,
          resource_type: "inventory_item",
          action_duration: 0,
          success: true,
          additional_data: {
            new_stock: newStock,
          },
        },
        performance_metrics: {
          response_time: Date.now(),
        },
      });

      await onInventoryUpdate(itemId, newStock);
      fetchInventoryData(); // Refresh data
    } catch (error) {
      console.error("Error updating inventory:", error);
      toast.error("Failed to update inventory");
    }
  };

  // Handle editing
  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item.id);
    setEditValue(item.current_stock);
  };

  const handleSave = (itemId: string) => {
    if (editValue < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    handleStockUpdate(itemId, editValue);
    setEditingItem(null);
    setEditValue(0);
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditValue(0);
  };

  const handleQuickAdjust = (itemId: string, adjustment: number) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    const newStock = item.current_stock + adjustment;
    if (newStock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    handleStockUpdate(itemId, newStock);
  };

  // Dismiss alert
  const dismissAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/inventory/alerts/${alertId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: false,
        }),
      });

      if (response.ok) {
        toast.success("Alert dismissed");
        fetchInventoryData();
      } else {
        toast.error("Failed to dismiss alert");
      }
    } catch (error) {
      console.error("Error dismissing alert:", error);
      toast.error("Failed to dismiss alert");
    }
  };

  // Log staff activity
  const logStaffActivity = async (activityData: any) => {
    try {
      await fetch("/api/staff/activity/log", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staff_id: staffSession.staff.id,
          staff_session_id: staffSession.sessionRecord.id,
          ...activityData,
        }),
      });
    } catch (error) {
      console.error("Error logging staff activity:", error);
    }
  };

  // Filter inventory items
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories
  const categories = [...new Set(inventory.map((item) => item.category))];

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800 border-green-200";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "out_of_stock":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_stock":
        return <CheckCircle className="h-4 w-4" />;
      case "low_stock":
        return <AlertTriangle className="h-4 w-4" />;
      case "out_of_stock":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading inventory data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-gray-600">
            Monitor stock levels and manage inventory
          </p>
        </div>
        <Button onClick={fetchInventoryData} disabled={isLoading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory ({inventory.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search inventory items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Items */}
          <div className="space-y-4">
            {filteredInventory.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <Badge
                          className={`text-xs ${getStatusColor(item.status)}`}
                        >
                          {getStatusIcon(item.status)}
                          {item.status.replace("_", " ")}
                        </Badge>
                        {item.usage_prediction &&
                          item.usage_prediction > 70 && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              High Usage
                            </Badge>
                          )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Category</p>
                          <p>{item.category}</p>
                        </div>
                        <div>
                          <p className="font-medium">Minimum Stock</p>
                          <p>
                            {item.minimum_stock} {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Usage Prediction</p>
                          <p>{item.usage_prediction}% likely to be used</p>
                        </div>
                        <div>
                          <p className="font-medium">Last Updated</p>
                          <p>
                            {formatDistanceToNow(new Date(item.last_updated))}{" "}
                            ago
                          </p>
                        </div>
                      </div>

                      {/* Restock Suggestion */}
                      {item.restock_suggestion && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-800">
                              Restock Suggestion
                            </span>
                            <Badge
                              className={getUrgencyColor(
                                item.restock_suggestion.urgency
                              )}
                            >
                              {item.restock_suggestion.urgency} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-blue-700">
                            {item.restock_suggestion.reason} - Suggested
                            quantity:{" "}
                            {item.restock_suggestion.suggested_quantity}{" "}
                            {item.unit}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Stock Management */}
                    <div className="flex items-center gap-4">
                      {editingItem === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) =>
                              setEditValue(Number(e.target.value))
                            }
                            className="w-24"
                            min="0"
                          />
                          <span className="text-sm text-gray-600">
                            {item.unit}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleSave(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-xl">
                              {item.current_stock} {item.unit}
                            </div>
                            <div className="text-sm text-gray-600">
                              Current Stock
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickAdjust(item.id, 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickAdjust(item.id, -1)}
                              className="h-8 w-8 p-0"
                              disabled={item.current_stock <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active inventory alerts</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-orange-400">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                          <h3 className="font-semibold">
                            {alert.inventory_items.name}
                          </h3>
                          <Badge className={getPriorityColor(alert.priority)}>
                            {alert.priority} priority
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-800">
                            {alert.alert_type.replace("_", " ")}
                          </Badge>
                        </div>

                        <p className="text-gray-700 mb-2">{alert.message}</p>

                        <div className="text-sm text-gray-600">
                          <p>
                            Current Stock:{" "}
                            {alert.inventory_items.current_quantity}{" "}
                            {alert.inventory_items.unit}
                          </p>
                          <p>
                            Minimum Stock:{" "}
                            {alert.inventory_items.minimum_quantity}{" "}
                            {alert.inventory_items.unit}
                          </p>
                          <p>
                            Created:{" "}
                            {formatDistanceToNow(new Date(alert.created_at))}{" "}
                            ago
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        <BellOff className="w-4 h-4 mr-2" />
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Items
                    </p>
                    <p className="text-2xl font-bold">{inventory.length}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Low Stock Items
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {
                        inventory.filter((item) => item.status === "low_stock")
                          .length
                      }
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Out of Stock
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {
                        inventory.filter(
                          (item) => item.status === "out_of_stock"
                        ).length
                      }
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Active Alerts
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {alerts.length}
                    </p>
                  </div>
                  <Bell className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
