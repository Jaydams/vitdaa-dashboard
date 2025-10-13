"use client";

import { useState, useEffect } from "react";
import { Wine, RefreshCw, Filter, AlertCircle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import BarOrderProcessor from "./BarOrderProcessor";
import BarInventoryManager from "./BarInventoryManager";

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
  preparation_time?: number;
  preparation_started_at?: string;
  preparation_completed_at?: string;
  preparation_notes?: string;
}

interface BarDashboardProps {
  staffSession: {
    id: string;
    staff_id: string;
    business_id: string;
    role: string;
  };
}

export default function BarDashboard({ staffSession }: BarDashboardProps) {
  const [orders, setOrders] = useState<BarOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "inventory">("orders");

  // Fetch bar orders
  const fetchBarOrders = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (priorityFilter !== "all") {
        params.append("priority", priorityFilter);
      }

      const response = await fetch(`/api/orders/bar?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch bar orders");
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching bar orders:", error);
      toast.error("Failed to load bar orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchBarOrders();

    // Refresh every 30 seconds
    const interval = setInterval(fetchBarOrders, 30000);

    return () => clearInterval(interval);
  }, [statusFilter, priorityFilter]);

  // Handle order status updates
  const handleStatusUpdate = async (
    orderId: string,
    status: string,
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          notes,
          staff_id: staffSession.staff_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      // Refresh orders to get updated data
      await fetchBarOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  };

  // Handle item status updates
  const handleItemStatusUpdate = async (
    orderId: string,
    itemId: string,
    status: string,
    notes?: string
  ) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/items/${itemId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            notes,
            staff_id: staffSession.staff_id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update item status");
      }

      // Refresh orders to get updated data
      await fetchBarOrders();
    } catch (error) {
      console.error("Error updating item status:", error);
      throw error;
    }
  };

  // Handle adding notes
  const handleAddNotes = async (orderId: string, notes: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bar_notes: notes,
          staff_id: staffSession.staff_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add notes");
      }

      // Refresh orders to get updated data
      await fetchBarOrders();
    } catch (error) {
      console.error("Error adding notes:", error);
      throw error;
    }
  };

  // Handle priority updates
  const handleSetPriority = async (orderId: string, priority: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/priority`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priority_level: priority,
          staff_id: staffSession.staff_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set priority");
      }

      // Refresh orders to get updated data
      await fetchBarOrders();
    } catch (error) {
      console.error("Error setting priority:", error);
      throw error;
    }
  };

  // Handle start preparation
  const handleStartPreparation = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/preparation/start`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staff_id: staffSession.staff_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start preparation");
      }

      // Refresh orders to get updated data
      await fetchBarOrders();
    } catch (error) {
      console.error("Error starting preparation:", error);
      throw error;
    }
  };

  // Handle complete preparation
  const handleCompletePreparation = async (orderId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/preparation/complete`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            staff_id: staffSession.staff_id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to complete preparation");
      }

      // Refresh orders to get updated data
      await fetchBarOrders();
    } catch (error) {
      console.error("Error completing preparation:", error);
      throw error;
    }
  };

  // Calculate dashboard stats
  const stats = {
    pending: orders.filter((order) => order.status === "pending").length,
    processing: orders.filter((order) => order.status === "processing").length,
    ready: orders.filter((order) => order.status === "ready").length,
    urgent: orders.filter((order) => order.priority_level === "urgent").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wine className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold">Bar Dashboard</h1>
              <p className="text-gray-600">
                Manage beverage orders and preparation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading bar orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wine className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Bar Dashboard</h1>
            <p className="text-gray-600">
              Manage beverage orders and inventory
            </p>
          </div>
        </div>

        <Button
          onClick={fetchBarOrders}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Wine className="w-4 h-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Orders</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.pending}
                    </p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {stats.pending}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.processing}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {stats.processing}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ready to Serve</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.ready}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {stats.ready}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Urgent Orders</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.urgent}
                    </p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">
                    {stats.urgent}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Priority
                  </label>
                  <Select
                    value={priorityFilter}
                    onValueChange={setPriorityFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Beverage Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Wine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No beverage orders found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Orders with bar items will appear here
                  </p>
                </div>
              ) : (
                <BarOrderProcessor
                  orders={orders}
                  onStatusUpdate={handleStatusUpdate}
                  onItemStatusUpdate={handleItemStatusUpdate}
                  onAddNotes={handleAddNotes}
                  onSetPriority={handleSetPriority}
                  onStartPreparation={handleStartPreparation}
                  onCompletePreparation={handleCompletePreparation}
                />
              )}
            </CardContent>
          </Card>

          {/* Service Coordination Notice */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">
                    Service Coordination
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    When drinks are ready, notify the service staff for prompt
                    delivery to customers. Coordinate timing with food orders
                    for the best customer experience.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <BarInventoryManager staffSession={staffSession} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
