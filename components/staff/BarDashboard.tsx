"use client";

import { useState, useEffect } from "react";
import {
  Wine,
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
  GlassWater,
  Coffee,
  Beer,
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

interface BarDashboardProps {
  staffSession: StaffSession;
}

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

interface BarOrderItem {
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

export default function BarDashboard({
  staffSession,
}: BarDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [orders, setOrders] = useState<BarOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    lowStockItems: 0,
    totalOrders: 0,
  });

  const { permissions } = staffSession;

  useEffect(() => {
    fetchBarData();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const supabase = createClient();

    const channel = supabase
      .channel('bar-orders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, (payload) => {
        console.log('Bar orders realtime change:', payload);
        fetchBarData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items',
      }, (payload) => {
        console.log('Order items realtime change:', payload);
        fetchBarData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_status_history',
      }, (payload) => {
        console.log('Order status history realtime change:', payload);
        fetchBarData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchBarData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch bar orders
      const ordersResponse = await fetch('/api/staff/orders?role=bar', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);
        
        // Calculate stats
        const pending = ordersData.data?.filter((o: BarOrder) => o.status === 'pending').length || 0;
        const preparing = ordersData.data?.filter((o: BarOrder) => o.status === 'processing').length || 0;
        const ready = ordersData.data?.filter((o: BarOrder) => o.status === 'ready').length || 0;
        
        setStats({
          pendingOrders: pending,
          preparingOrders: preparing,
          readyOrders: ready,
          lowStockItems: 0, // Will be updated when inventory is fetched
          totalOrders: ordersData.data?.length || 0,
        });
      }
      
      // Fetch inventory alerts for bar items
      const inventoryResponse = await fetch('/api/inventory/alerts?type=low_stock&category=beverage', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        setInventory(inventoryData.alerts || []);
        setStats(prev => ({
          ...prev,
          lowStockItems: inventoryData.alerts?.length || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching bar data:', error);
      toast.error('Failed to load bar data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/staff/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status,
          notes,
        }),
      });

      if (response.ok) {
        toast.success(`Order status updated to ${status}`);
        fetchBarData();
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const updateItemStatus = async (itemId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/staff/order-items/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          status,
          notes,
        }),
      });

      if (response.ok) {
        toast.success(`Item status updated to ${status}`);
        fetchBarData();
      } else {
        toast.error('Failed to update item status');
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item status');
    }
  };

  const addBarNotes = async (orderId: string, notes: string) => {
    try {
      const response = await fetch('/api/staff/orders/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          noteType: 'bar',
          notes,
        }),
      });

      if (response.ok) {
        toast.success('Bar notes added');
        fetchBarData();
      } else {
        toast.error('Failed to add bar notes');
      }
    } catch (error) {
      console.error('Error adding bar notes:', error);
      toast.error('Failed to add bar notes');
    }
  };

  const setOrderPriority = async (orderId: string, priority: string) => {
    try {
      const response = await fetch('/api/staff/orders/priority', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          priority,
        }),
      });

      if (response.ok) {
        toast.success(`Order priority set to ${priority}`);
        fetchBarData();
      } else {
        toast.error('Failed to set order priority');
      }
    } catch (error) {
      console.error('Error setting order priority:', error);
      toast.error('Failed to set order priority');
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
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bar Dashboard</h1>
          <p className="text-gray-600">Manage drink preparation and bar operations</p>
        </div>
        <Button onClick={fetchBarData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                Pending Drinks
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {stats.pendingOrders}
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Waiting to prepare
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
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                In Progress
              </CardTitle>
              <Wine className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.preparingOrders}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Currently preparing
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
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                Ready Drinks
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.readyOrders}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Ready for pickup
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
              <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                Low Stock Items
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                {stats.lowStockItems}
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">
                Need restocking
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Total Orders
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {stats.totalOrders}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Today's total
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Drink Order Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
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
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Orders Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-yellow-600" />
              Pending Drinks ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No pending drink orders</p>
            ) : (
              pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={updateOrderStatus}
                  onItemStatusUpdate={updateItemStatus}
                  onAddNotes={addBarNotes}
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
              <Wine className="w-5 h-5 mr-2 text-blue-600" />
              In Progress ({processingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {processingOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No drinks in progress</p>
            ) : (
              processingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={updateOrderStatus}
                  onItemStatusUpdate={updateItemStatus}
                  onAddNotes={addBarNotes}
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
              Ready Drinks ({readyOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {readyOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No ready drinks</p>
            ) : (
              readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={updateOrderStatus}
                  onItemStatusUpdate={updateItemStatus}
                  onAddNotes={addBarNotes}
                  onSetPriority={setOrderPriority}
                  getPriorityColor={getPriorityColor}
                  getStatusColor={getStatusColor}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Alerts */}
      {inventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
              Low Stock Alerts ({inventory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                >
                  <div>
                    <p className="font-medium text-red-900">{item.name}</p>
                    <p className="text-sm text-red-700">
                      {item.current_stock} {item.unit} remaining
                    </p>
                  </div>
                  <Badge variant="destructive">Low Stock</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Order Card Component
interface OrderCardProps {
  order: BarOrder;
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
          .filter(item => item.is_bar_item)
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
            placeholder="Add bar notes..."
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
            {order.bar_notes && (
              <div>
                <span className="font-medium">Bar Notes:</span>
                <p className="text-gray-600 mt-1">{order.bar_notes}</p>
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
