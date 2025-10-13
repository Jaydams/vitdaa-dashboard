"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Wine,
  Coffee,
  Droplets,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  TrendingUp,
  Clock,
  Search,
  RefreshCw,
  Bell,
  BellOff,
  BarChart3,
  Target,
  DollarSign,
  Package,
  ShoppingCart,
  Calculator,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import InventoryRequestForm from "./InventoryRequestForm";

interface BeverageItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit_of_measure: string;
  category_type: string;
  unit_cost: number;
  selling_price: number;
  last_updated: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  is_alcoholic: boolean;
  usage_prediction?: number;
  restock_suggestion?: {
    suggested_quantity: number;
    urgency: "low" | "medium" | "high";
    reason: string;
    estimated_cost: number;
  };
  sales_analytics?: {
    daily_sales: number;
    weekly_sales: number;
    profit_margin: number;
    popularity_score: number;
  };
}

interface BarInventoryManagerProps {
  staffSession: any; // Using any for now to match existing pattern
}

export default function BarInventoryManager({
  staffSession,
}: BarInventoryManagerProps) {
  const [beverageInventory, setBeverageInventory] = useState<BeverageItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "inventory" | "analytics" | "requests"
  >("inventory");
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Fetch beverage inventory data
  const fetchBeverageInventory = async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/inventory/beverages", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const enhancedBeverages = data.items.map((item: any) => ({
          ...item,
          status: getItemStatus(item),
          usage_prediction: calculateUsagePrediction(item),
          restock_suggestion: generateRestockSuggestion(item),
          sales_analytics: generateSalesAnalytics(item),
        }));
        setBeverageInventory(enhancedBeverages);
      } else {
        console.error("Failed to fetch beverage inventory");
        toast.error("Failed to load beverage inventory");
      }
    } catch (error) {
      console.error("Error fetching beverage inventory:", error);
      toast.error("Failed to load beverage inventory");
    } finally {
      setIsLoading(false);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    fetchBeverageInventory();

    const supabase = createClient();
    const channel = supabase
      .channel("bar-inventory-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_items",
          filter: "category_type=eq.beverage",
        },
        (payload) => {
          console.log("Bar inventory realtime change:", payload);
          fetchBeverageInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Utility functions
  const getItemStatus = (
    item: any
  ): "in_stock" | "low_stock" | "out_of_stock" => {
    if (item.current_stock === 0) return "out_of_stock";
    if (item.current_stock <= item.minimum_stock) return "low_stock";
    return "in_stock";
  };

  const calculateUsagePrediction = (item: any): number => {
    const stockRatio = item.current_stock / (item.minimum_stock || 1);

    // Factor in if it's alcoholic (typically higher demand)
    const alcoholicMultiplier = item.is_alcoholic ? 1.2 : 1.0;

    let basePrediction = 20;
    if (stockRatio <= 0.5) basePrediction = 90;
    else if (stockRatio <= 1) basePrediction = 70;
    else if (stockRatio <= 2) basePrediction = 40;

    return Math.min(95, Math.round(basePrediction * alcoholicMultiplier));
  };

  const generateRestockSuggestion = (item: any) => {
    const stockRatio = item.current_stock / (item.minimum_stock || 1);
    const estimatedCost = (quantity: number) =>
      quantity * (item.unit_cost || 0);

    if (item.current_stock === 0) {
      const quantity = item.minimum_stock * 3;
      return {
        suggested_quantity: quantity,
        urgency: "high" as const,
        reason: "Out of stock - immediate restock required",
        estimated_cost: estimatedCost(quantity),
      };
    }

    if (stockRatio <= 0.5) {
      const quantity = item.minimum_stock * 2;
      return {
        suggested_quantity: quantity,
        urgency: "high" as const,
        reason: "Critical low stock - restock soon",
        estimated_cost: estimatedCost(quantity),
      };
    }

    if (stockRatio <= 1) {
      const quantity = Math.round(item.minimum_stock * 1.5);
      return {
        suggested_quantity: quantity,
        urgency: "medium" as const,
        reason: "Below minimum stock - consider restocking",
        estimated_cost: estimatedCost(quantity),
      };
    }

    return null;
  };

  const generateSalesAnalytics = (item: any) => {
    // Mock analytics - in real implementation, this would come from actual sales data
    const profitMargin =
      item.selling_price && item.unit_cost
        ? ((item.selling_price - item.unit_cost) / item.selling_price) * 100
        : 0;

    return {
      daily_sales: Math.floor(Math.random() * 20) + 1,
      weekly_sales: Math.floor(Math.random() * 100) + 10,
      profit_margin: Math.round(profitMargin),
      popularity_score: Math.floor(Math.random() * 100) + 1,
    };
  };

  // Handle stock level updates with automatic cost calculation
  const handleStockUpdate = async (itemId: string, newStock: number) => {
    try {
      const item = beverageInventory.find((i) => i.id === itemId);
      if (!item) return;

      const stockDifference = newStock - item.current_stock;
      const transactionType = stockDifference > 0 ? "purchase" : "sale";
      const totalCost = Math.abs(stockDifference) * (item.unit_cost || 0);

      const response = await fetch("/api/inventory/beverages", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_id: itemId,
          current_stock: newStock,
          transaction_type: transactionType,
          quantity: Math.abs(stockDifference),
          total_cost: totalCost,
          staff_id: staffSession.staff_id,
        }),
      });

      if (response.ok) {
        toast.success(
          `Stock updated successfully. Cost: ₦${totalCost.toFixed(2)}`
        );
        fetchBeverageInventory();

        // Log staff activity
        await logStaffActivity({
          activity_type: "bar_inventory_updated",
          activity_details: {
            resource_id: itemId,
            resource_type: "beverage_item",
            action_duration: 0,
            success: true,
            additional_data: {
              old_stock: item.current_stock,
              new_stock: newStock,
              cost_impact: totalCost,
            },
          },
          performance_metrics: {
            response_time: Date.now(),
          },
        });
      } else {
        toast.error("Failed to update stock");
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Failed to update stock");
    }
  };

  // Handle editing
  const handleEdit = (item: BeverageItem) => {
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
    const item = beverageInventory.find((i) => i.id === itemId);
    if (!item) return;

    const newStock = item.current_stock + adjustment;
    if (newStock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    handleStockUpdate(itemId, newStock);
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
          staff_id: staffSession.staff_id,
          staff_session_id: staffSession.id,
          ...activityData,
        }),
      });
    } catch (error) {
      console.error("Error logging staff activity:", error);
    }
  };

  // Filter beverage items
  const filteredBeverages = beverageInventory.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "alcoholic" && item.is_alcoholic) ||
      (categoryFilter === "non-alcoholic" && !item.is_alcoholic);
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get beverage icon
  const getBeverageIcon = (item: BeverageItem) => {
    const name = item.name.toLowerCase();
    if (name.includes("coffee") || name.includes("espresso")) {
      return <Coffee className="w-5 h-5 text-amber-600" />;
    }
    if (item.is_alcoholic || name.includes("wine") || name.includes("beer")) {
      return <Wine className="w-5 h-5 text-purple-600" />;
    }
    return <Droplets className="w-5 h-5 text-blue-600" />;
  };

  // Utility color functions
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading bar inventory...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wine className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold">Bar Inventory Management</h2>
            <p className="text-gray-600">
              Manage beverage stock levels and costs
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowRequestForm(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Request Stock
          </Button>
          <Button
            onClick={fetchBeverageInventory}
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory ({beverageInventory.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Requests
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
                      placeholder="Search beverages..."
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
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="alcoholic">Alcoholic</option>
                    <option value="non-alcoholic">Non-Alcoholic</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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

          {/* Beverage Items */}
          <div className="space-y-4">
            {filteredBeverages.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getBeverageIcon(item)}
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <Badge
                          className={`text-xs ${getStatusColor(item.status)}`}
                        >
                          {getStatusIcon(item.status)}
                          {item.status.replace("_", " ")}
                        </Badge>
                        {item.is_alcoholic && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            Alcoholic
                          </Badge>
                        )}
                        {item.usage_prediction &&
                          item.usage_prediction > 70 && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              High Demand
                            </Badge>
                          )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Minimum Stock</p>
                          <p>
                            {item.minimum_stock} {item.unit_of_measure}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Unit Cost</p>
                          <p>₦{(item.unit_cost || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Selling Price</p>
                          <p>₦{(item.selling_price || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Profit Margin</p>
                          <p>{item.sales_analytics?.profit_margin || 0}%</p>
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
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-purple-800">
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
                          <p className="text-sm text-purple-700">
                            {item.restock_suggestion.reason} - Suggested
                            quantity:{" "}
                            {item.restock_suggestion.suggested_quantity}{" "}
                            {item.unit_of_measure}
                          </p>
                          <p className="text-sm text-purple-600 font-medium">
                            Estimated Cost: ₦
                            {item.restock_suggestion.estimated_cost.toFixed(2)}
                          </p>
                        </div>
                      )}

                      {/* Sales Analytics */}
                      {item.sales_analytics && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-800">
                              Sales Analytics
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-blue-600">Daily Sales</p>
                              <p className="font-medium">
                                {item.sales_analytics.daily_sales} units
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600">Weekly Sales</p>
                              <p className="font-medium">
                                {item.sales_analytics.weekly_sales} units
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600">Popularity</p>
                              <p className="font-medium">
                                {item.sales_analytics.popularity_score}/100
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600">Revenue Impact</p>
                              <p className="font-medium">
                                ₦
                                {(
                                  item.sales_analytics.daily_sales *
                                  (item.selling_price || 0)
                                ).toFixed(2)}
                                /day
                              </p>
                            </div>
                          </div>
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
                            {item.unit_of_measure}
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
                              {item.current_stock} {item.unit_of_measure}
                            </div>
                            <div className="text-sm text-gray-600">
                              Current Stock
                            </div>
                            <div className="text-xs text-gray-500">
                              Value: ₦
                              {(
                                item.current_stock * (item.unit_cost || 0)
                              ).toFixed(2)}
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

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Beverages
                    </p>
                    <p className="text-2xl font-bold">
                      {beverageInventory.length}
                    </p>
                  </div>
                  <Wine className="w-8 h-8 text-purple-600" />
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
                        beverageInventory.filter(
                          (item) => item.status === "low_stock"
                        ).length
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
                      Total Inventory Value
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      ₦
                      {beverageInventory
                        .reduce(
                          (total, item) =>
                            total + item.current_stock * (item.unit_cost || 0),
                          0
                        )
                        .toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Alcoholic Items
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {
                        beverageInventory.filter((item) => item.is_alcoholic)
                          .length
                      }
                    </p>
                  </div>
                  <Wine className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Submit requests for beverage inventory items that need
                restocking.
              </p>
              <Button
                onClick={() => setShowRequestForm(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Request
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inventory Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Request Bar Inventory</h3>
              <Button variant="ghost" onClick={() => setShowRequestForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <InventoryRequestForm
              staffSession={staffSession}
              onRequestSubmitted={() => {
                setShowRequestForm(false);
                toast.success("Inventory request submitted successfully");
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
