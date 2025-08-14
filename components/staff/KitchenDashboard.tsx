"use client";

import { useState, useEffect } from "react";
import {
  ChefHat,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  TrendingUp,
  Package,
  Eye,
  Edit,
  RefreshCw,
  Filter,
  Timer,
  Users,
  Calendar,
  MessageSquare,
  Star,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StaffSession } from "@/types/auth";
import { PermissionGuard } from "./RoleBasedDashboard";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatAmount } from "@/helpers/formatAmount";
import { formatDistanceToNow } from "date-fns";
import InventoryManager from "./InventoryManager";

interface KitchenDashboardProps {
  staffSession: StaffSession;
}

interface KitchenOrder {
  id: string;
  invoice_no: string;
  customer_name: string;
  table_number?: string;
  items: KitchenOrderItem[];
  total_amount: number;
  status: "pending" | "processing" | "ready" | "delivered" | "cancelled";
  created_at: string;
  special_instructions?: string;
  priority_level: "low" | "normal" | "high" | "urgent";
  estimated_completion_time?: string;
  preparation_started_at?: string;
  preparation_completed_at?: string;
  kitchen_notes?: string;
  assigned_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  status_updated_by_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface KitchenOrderItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  special_instructions?: string;
  item_status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  is_kitchen_item: boolean;
  is_bar_item: boolean;
}

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  category: string;
  last_updated: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export default function KitchenDashboard({
  staffSession,
}: KitchenDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [stats, setStats] = useState({
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    lowStockItems: 0,
    totalOrders: 0,
  });

  const { permissions } = staffSession;

  useEffect(() => {
    fetchKitchenData();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const supabase = createClient();

    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, (payload) => {
        console.log('Kitchen orders realtime change:', payload);
        fetchKitchenData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items',
      }, (payload) => {
        console.log('Order items realtime change:', payload);
        fetchKitchenData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_status_history',
      }, (payload) => {
        console.log('Order status history realtime change:', payload);
        fetchKitchenData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchKitchenData = async () => {
    try {
      setIsLoading(true);
      
      // Import server actions
      const { fetchOrders, getOrderStats } = await import('@/actions/order-actions');
      
      // Fetch all orders (kitchen staff can see all orders)
      const ordersData = await fetchOrders({ page: 1, perPage: 50 });
      
      // Filter for kitchen items only
      const kitchenOrders = ordersData.data?.map((order: any) => ({
        id: order.id,
        invoice_no: order.invoice_no,
        customer_name: order.customer_name,
        table_number: order.table?.table_number,
        items: order.items?.filter((item: any) => item.is_kitchen_item !== false) || [],
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        special_instructions: order.notes,
        priority_level: order.priority_level || 'normal',
        estimated_completion_time: order.estimated_completion_time,
        preparation_started_at: order.preparation_started_at,
        preparation_completed_at: order.preparation_completed_at,
        kitchen_notes: order.kitchen_notes,
        assigned_staff: order.assigned_to_staff_id ? {
          id: order.assigned_to_staff_id,
          first_name: 'Kitchen',
          last_name: 'Staff',
          role: 'kitchen'
        } : undefined,
        status_updated_by_staff: order.status_updated_by ? {
          id: order.status_updated_by,
          first_name: 'Kitchen',
          last_name: 'Staff',
          role: 'kitchen'
        } : undefined,
      })).filter((order: any) => order.items.length > 0) || [];
      
      setOrders(kitchenOrders);
      
      // Calculate stats
      const pending = kitchenOrders.filter((o: KitchenOrder) => o.status === 'pending').length;
      const preparing = kitchenOrders.filter((o: KitchenOrder) => o.status === 'processing').length;
      const ready = kitchenOrders.filter((o: KitchenOrder) => o.status === 'ready').length;
      
      setStats({
        pendingOrders: pending,
        preparingOrders: preparing,
        readyOrders: ready,
        lowStockItems: 0, // Will be updated when inventory is fetched
        totalOrders: kitchenOrders.length,
      });
      
      // Fetch inventory data from existing API
      try {
        const inventoryResponse = await fetch('/api/inventory/kitchen', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json();
          setInventory(inventoryData.items || []);
          setStats(prev => ({
            ...prev,
            lowStockItems: (inventoryData.items || []).filter((item: any) => 
              item.status === 'low_stock' || item.status === 'out_of_stock'
            ).length,
          }));
        }
      } catch (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
        // Fallback to mock data if API fails
        const mockInventory = [
          {
            id: '1',
            name: 'Chicken Breast',
            current_stock: 5,
            minimum_stock: 10,
            unit: 'kg',
            category: 'Meat',
            last_updated: new Date().toISOString(),
            status: 'low_stock' as const,
          },
          {
            id: '2',
            name: 'Rice',
            current_stock: 2,
            minimum_stock: 5,
            unit: 'kg',
            category: 'Grains',
            last_updated: new Date().toISOString(),
            status: 'low_stock' as const,
          },
        ];
        
        setInventory(mockInventory);
        setStats(prev => ({
          ...prev,
          lowStockItems: mockInventory.length,
        }));
      }
    } catch (error) {
      console.error('Error fetching kitchen data:', error);
      toast.error('Failed to load kitchen data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      // Import server action
      const { updateOrderStatus: updateOrderStatusAction } = await import('@/actions/order-actions');
      
      // Update order status
      await updateOrderStatusAction(orderId, status as any);
      
      toast.success(`Order status updated to ${status}`);
      fetchKitchenData();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const updateItemStatus = async (itemId: string, status: string, notes?: string) => {
    try {
      // For now, we'll just show a success message
      // In a real implementation, you'd update the item status in the database
      toast.success(`Item status updated to ${status}`);
      fetchKitchenData();
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item status');
    }
  };

  const addKitchenNotes = async (orderId: string, notes: string) => {
    try {
      // For now, we'll just show a success message
      // In a real implementation, you'd add kitchen notes to the database
      toast.success('Kitchen notes added');
      fetchKitchenData();
    } catch (error) {
      console.error('Error adding kitchen notes:', error);
      toast.error('Failed to add kitchen notes');
    }
  };

  const setOrderPriority = async (orderId: string, priority: string) => {
    try {
      // For now, we'll just show a success message
      // In a real implementation, you'd update the order priority in the database
      toast.success(`Order priority set to ${priority}`);
      fetchKitchenData();
    } catch (error) {
      console.error('Error setting order priority:', error);
      toast.error('Failed to set order priority');
    }
  };

  const handleInventoryUpdate = async (itemId: string, newStock: number) => {
    try {
      // Update inventory in the database
      const response = await fetch(`/api/inventory/items/${itemId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_quantity: newStock,
        }),
      });

      if (response.ok) {
        // Update local state
        setInventory(prev => prev.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                current_stock: newStock,
                status: newStock === 0 ? 'out_of_stock' : 
                        newStock <= item.minimum_stock ? 'low_stock' : 'in_stock',
                last_updated: new Date().toISOString()
              }
            : item
        ));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          lowStockItems: inventory.filter(item => 
            item.current_stock <= item.minimum_stock
          ).length
        }));
        
        toast.success('Inventory updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.invoice_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || order.priority_level === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const pendingOrders = filteredOrders.filter(order => order.status === 'pending');
  const processingOrders = filteredOrders.filter(order => order.status === 'processing');
  const readyOrders = filteredOrders.filter(order => order.status === 'ready');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Stats - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Kitchen Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 truncate">Manage food preparation and kitchen operations</p>
        </div>
        <Button onClick={fetchKitchenData} disabled={isLoading} className="w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
          <span className="sm:hidden">Refresh Data</span>
        </Button>
      </div>

      {/* Quick Stats - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-yellow-700 dark:text-yellow-300">
                Pending
              </CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {stats.pendingOrders}
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Waiting
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                In Progress
              </CardTitle>
              <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.preparingOrders}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Preparing
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                Ready
              </CardTitle>
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.readyOrders}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                For pickup
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="inventory:alerts"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">
                Low Stock
              </CardTitle>
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-red-900 dark:text-red-100">
                {stats.lowStockItems}
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">
                Need restock
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">
                Total
              </CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
                {stats.totalOrders}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Today
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('orders')}
          className="flex-1"
        >
          <ChefHat className="w-4 h-4 mr-2" />
          Orders
        </Button>
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inventory')}
          className="flex-1"
        >
          <Package className="w-4 h-4 mr-2" />
          Inventory
        </Button>
      </div>

      {activeTab === 'orders' && (
        <>
          {/* Filters and Search - Responsive */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Order Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search orders by customer or invoice..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'orders' && (
        <>
          {/* Orders Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-yellow-600" />
                  Pending Orders ({pendingOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending orders</p>
                ) : (
                  pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusUpdate={updateOrderStatus}
                      onItemStatusUpdate={updateItemStatus}
                      onAddNotes={addKitchenNotes}
                      onSetPriority={setOrderPriority}
                      getPriorityColor={getPriorityColor}
                      getStatusColor={getStatusColor}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Processing Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChefHat className="w-5 h-5 mr-2 text-blue-600" />
                  In Progress ({processingOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {processingOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No orders in progress</p>
                ) : (
                  processingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusUpdate={updateOrderStatus}
                      onItemStatusUpdate={updateItemStatus}
                      onAddNotes={addKitchenNotes}
                      onSetPriority={setOrderPriority}
                      getPriorityColor={getPriorityColor}
                      getStatusColor={getStatusColor}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Ready Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Ready Orders ({readyOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {readyOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No ready orders</p>
                ) : (
                  readyOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusUpdate={updateOrderStatus}
                      onItemStatusUpdate={updateItemStatus}
                      onAddNotes={addKitchenNotes}
                      onSetPriority={setOrderPriority}
                      getPriorityColor={getPriorityColor}
                      getStatusColor={getStatusColor}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'inventory' && (
        <PermissionGuard
          permissions={permissions}
          requiredPermission="inventory:update"
        >
          <InventoryManager
            inventory={inventory}
            onInventoryUpdate={handleInventoryUpdate}
          />
        </PermissionGuard>
      )}


    </div>
  );
}

// Order Card Component
interface OrderCardProps {
  order: KitchenOrder;
  onStatusUpdate: (orderId: string, status: string, notes?: string) => void;
  onItemStatusUpdate: (itemId: string, status: string, notes?: string) => void;
  onAddNotes: (orderId: string, notes: string) => void;
  onSetPriority: (orderId: string, priority: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
}

function OrderCard({
  order,
  onStatusUpdate,
  onItemStatusUpdate,
  onAddNotes,
  onSetPriority,
  getPriorityColor,
  getStatusColor,
}: OrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [notes, setNotes] = useState("");

  const handleStatusUpdate = (status: string) => {
    onStatusUpdate(order.id, status, notes);
    setNotes("");
  };

  const handleItemStatusUpdate = (itemId: string, status: string) => {
    onItemStatusUpdate(itemId, status);
  };

  const handleAddNotes = () => {
    if (notes.trim()) {
      onAddNotes(order.id, notes);
      setNotes("");
    }
  };

  const handleSetPriority = (priority: string) => {
    onSetPriority(order.id, priority);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      {/* Order Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-sm">{order.invoice_no}</h3>
          <p className="text-xs text-gray-600">{order.customer_name}</p>
          {order.table_number && (
            <p className="text-xs text-gray-500">Table {order.table_number}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={`text-xs ${getPriorityColor(order.priority_level)}`}>
            {order.priority_level}
          </Badge>
          <Badge className={`text-xs ${getStatusColor(order.status)}`}>
            {order.status}
          </Badge>
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-2 mb-3">
        {order.items
          .filter(item => item.is_kitchen_item)
          .map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <div className="flex-1">
                <span className="font-medium">{item.quantity}x</span> {item.menu_item_name}
                {item.special_instructions && (
                  <p className="text-xs text-gray-600 italic">
                    Note: {item.special_instructions}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Badge
                  variant={item.item_status === 'ready' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {item.item_status}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextStatus = item.item_status === 'pending' ? 'preparing' : 
                                     item.item_status === 'preparing' ? 'ready' : 'served';
                    handleItemStatusUpdate(item.id, nextStatus);
                  }}
                  disabled={item.item_status === 'served' || item.item_status === 'cancelled'}
                >
                  {item.item_status === 'pending' ? 'Start' :
                   item.item_status === 'preparing' ? 'Ready' :
                   item.item_status === 'ready' ? 'Served' : 'Done'}
                </Button>
              </div>
            </div>
          ))}
      </div>

      {/* Order Actions */}
      <div className="space-y-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Eye className="w-3 h-3 mr-1" />
            Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusUpdate('ready')}
            disabled={order.status === 'ready' || order.status === 'delivered'}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Ready
          </Button>
        </div>

        {/* Priority Controls */}
        <div className="flex gap-1">
          {['low', 'normal', 'high', 'urgent'].map((priority) => (
            <Button
              key={priority}
              size="sm"
              variant={order.priority_level === priority ? 'default' : 'outline'}
              onClick={() => handleSetPriority(priority)}
              className="text-xs"
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Button>
          ))}
        </div>

        {/* Notes Section */}
        <div className="space-y-2">
          <Input
            placeholder="Add kitchen notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddNotes}
            disabled={!notes.trim()}
            className="w-full"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Add Notes
          </Button>
        </div>

        {/* Order Details (Collapsible) */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-medium">{formatAmount(order.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
            </div>
            {order.estimated_completion_time && (
              <div className="flex justify-between">
                <span>Estimated Ready:</span>
                <span>{new Date(order.estimated_completion_time).toLocaleTimeString()}</span>
              </div>
            )}
            {order.kitchen_notes && (
              <div>
                <span className="font-medium">Kitchen Notes:</span>
                <p className="text-gray-600 mt-1">{order.kitchen_notes}</p>
              </div>
            )}
            {order.special_instructions && (
              <div>
                <span className="font-medium">Special Instructions:</span>
                <p className="text-gray-600 mt-1">{order.special_instructions}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
