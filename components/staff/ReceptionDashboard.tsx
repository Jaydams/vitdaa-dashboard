"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Users,
  CreditCard,
  Table,
  Clock,
  Plus,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Eye,
  DollarSign,
  RefreshCw,
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
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ReceptionDashboardProps {
  staffSession: StaffSession;
}

interface ReceptionStats {
  activeOrders: number;
  availableTables: number;
  totalTables: number;
  pendingPayments: number;
  todayRevenue: number;
  customersServed: number;
  todayOrders: number;
}

interface ReceptionOrder {
  id: string;
  invoice_no: string;
  tableNumber: number | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  itemCount: number;
  total: number;
  status: string;
  time: string;
  paymentStatus: string;
  paymentMethod: string | null;
  specialRequests: string | null;
  createdAt: string;
}

interface ReceptionTable {
  number: number;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  partySize: number;
  orderTotal: number;
  seatedAt: string | null;
  orderId: string | null;
  capacity: number;
  location: string | null;
}

export default function ReceptionDashboard({
  staffSession,
}: ReceptionDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReceptionStats>({
    activeOrders: 0,
    availableTables: 0,
    totalTables: 0,
    pendingPayments: 0,
    todayRevenue: 0,
    customersServed: 0,
    todayOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<ReceptionOrder[]>([]);
  const [tables, setTables] = useState<ReceptionTable[]>([]);
  const { permissions } = staffSession;
  const router = useRouter();

  // Fetch data on component mount
  useEffect(() => {
    fetchReceptionData();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const supabase = createClient();

    const channel = supabase
      .channel('reception-dashboard-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, (payload) => {
        console.log('Reception orders realtime change:', payload);
        fetchReceptionData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items',
      }, (payload) => {
        console.log('Reception order items realtime change:', payload);
        fetchReceptionData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
      }, (payload) => {
        console.log('Reception payments realtime change:', payload);
        fetchReceptionData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tables',
      }, (payload) => {
        console.log('Reception tables realtime change:', payload);
        fetchReceptionData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_status_history',
      }, (payload) => {
        console.log('Reception order status history realtime change:', payload);
        fetchReceptionData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchReceptionData = async () => {
    setIsLoading(true);
    try {
      // Import server actions
      const { fetchOrders, getOrderStats } = await import('@/actions/order-actions');
      
      // Fetch data using server actions
      const [statsData, ordersData] = await Promise.all([
        getOrderStats(),
        fetchOrders({ page: 1, perPage: 10 })
      ]);

      // Transform stats data
      setStats({
        activeOrders: statsData.today.pending + statsData.today.processing || 0,
        availableTables: 0, // We'll add this later
        totalTables: 0, // We'll add this later
        pendingPayments: statsData.today.pending || 0,
        todayRevenue: statsData.today.revenue || 0,
        customersServed: statsData.today.total || 0,
        todayOrders: statsData.today.total || 0,
      });

      // Transform orders data
      const transformedOrders = ordersData.data?.map((order: any) => ({
        id: order.id,
        invoice_no: order.invoice_no,
        tableNumber: order.table?.table_number || null,
        customerName: order.customer_name || "Walk-in Customer",
        customerPhone: order.customer_phone || null,
        customerEmail: order.customer?.email || null,
        items: order.items?.map((item: any) => ({
          name: item.menu_item_name,
          quantity: item.quantity,
          price: item.menu_item_price
        })) || [],
        itemCount: order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        total: order.total_amount || 0,
        status: order.status,
        time: new Date(order.created_at).toLocaleTimeString(),
        paymentStatus: order.payment?.[0]?.status || "pending",
        paymentMethod: order.payment?.[0]?.payment_method || null,
        specialRequests: order.notes,
        createdAt: order.created_at
      })) || [];
      setRecentOrders(transformedOrders);

      // For tables, we'll use a simple approach for now
      setTables([]);
    } catch (error) {
      console.error('Error fetching reception data:', error);
      toast.error('Failed to load reception data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "preparing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "ready":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "served":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "delivered":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "reserved":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "cleaning":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "preparing":
        return <Clock className="h-4 w-4" />;
      case "ready":
        return <CheckCircle className="h-4 w-4" />;
      case "served":
        return <CheckCircle className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Handler functions for order and table management
  const handleCreateOrder = () => {
    // Navigate to order creation page
    router.push('/admin/orders/create');
  };

  const handleAssignTable = (tableNumber: number) => {
    // Navigate to table assignment page
    router.push(`/admin/tables/${tableNumber}/assign`);
  };

    const handleProcessPayment = async (orderId: string) => {
    try {
      // Import server action
      const { updateOrderStatus } = await import('@/actions/order-actions');
      
      // Update order status to delivered
      await updateOrderStatus(orderId, 'delivered');
      
      toast.success('Order marked as delivered');
      fetchReceptionData(); // Refresh data
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Failed to process payment');
    }
  };

  const handleCustomerLookup = (customerInfo: string) => {
    // Navigate to customer lookup page
    router.push(`/admin/customers?search=${encodeURIComponent(customerInfo)}`);
  };

  const handleViewOrderDetails = (orderId: string) => {
    // Navigate to order details page
    router.push(`/admin/orders/${orderId}`);
  };

  const filteredOrders = recentOrders.filter(order =>
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.invoice_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading reception dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Active Orders
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.activeOrders}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Currently being prepared
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="tables:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                Available Tables
              </CardTitle>
              <Table className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.availableTables}/{stats.totalTables}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Tables ready for seating
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="customers:read"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Customers Served
              </CardTitle>
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {stats.customersServed}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">Today's total</p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="payments:process"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Today's Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                ₦{stats.todayRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                +12% from yesterday
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Enhanced Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <PermissionGuard
              permissions={permissions}
              requiredPermission="orders:create"
            >
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg" onClick={handleCreateOrder}>
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </PermissionGuard>

            <PermissionGuard
              permissions={permissions}
              requiredPermission="tables:update"
            >
              <Button variant="outline" className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => handleAssignTable(0)}>
                <Table className="h-4 w-4 mr-2" />
                Assign Table
              </Button>
            </PermissionGuard>

            <PermissionGuard
              permissions={permissions}
              requiredPermission="customers:read"
            >
              <Button variant="outline" className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => handleCustomerLookup("All Customers")}>
                <Users className="h-4 w-4 mr-2" />
                Customer Lookup
              </Button>
            </PermissionGuard>

            <PermissionGuard
              permissions={permissions}
              requiredPermission="payments:process"
            >
              <Button variant="outline" className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => handleProcessPayment("ORD-001")}>
                <CreditCard className="h-4 w-4 mr-2" />
                Process Payment
              </Button>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Recent Orders */}
        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:read"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Recent Orders
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            T{order.tableNumber}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {order.customerPhone}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {order.customerEmail}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          ₦{order.total.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.itemCount} items
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                          {order.paymentStatus}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {order.time}
                      </div>
                    </div>

                    {order.specialRequests && (
                      <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                        <strong>Special Requests:</strong> {order.specialRequests}
                      </div>
                    )}

                    <Separator className="my-3" />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrderDetails(order.id)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {order.paymentStatus === "pending" && (
                        <PermissionGuard
                          permissions={permissions}
                          requiredPermission="payments:process"
                        >
                          <Button
                            size="sm"
                            onClick={() => handleProcessPayment(order.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Process Payment
                          </Button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* Enhanced Table Status */}
        <PermissionGuard
          permissions={permissions}
          requiredPermission="tables:read"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Table Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tables.map((table) => (
                  <div key={table.number} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">Table {table.number}</span>
                        <Badge className={getTableStatusColor(table.status)}>
                          {table.status}
                        </Badge>
                      </div>
                    </div>

                    {table.customerName && (
                      <div className="space-y-2 mb-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {table.customerName}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {table.customerPhone}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Party of {table.partySize} • Seated: {table.seatedAt}
                        </div>
                        {table.orderId && (
                          <div className="text-sm text-muted-foreground">
                            Order: {table.orderId}
                          </div>
                        )}
                      </div>
                    )}

                    {table.status === "reserved" && (
                      <div className="text-sm text-muted-foreground mb-3 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                        Reserved
                      </div>
                    )}

                    {table.orderTotal > 0 && (
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">
                        ₦{table.orderTotal.toFixed(2)}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {table.status === "available" && (
                        <PermissionGuard
                          permissions={permissions}
                          requiredPermission="tables:update"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignTable(table.number)}
                            className="flex-1"
                          >
                            Assign
                          </Button>
                        </PermissionGuard>
                      )}

                      {table.status === "occupied" && table.customerName && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCustomerLookup(table.customerName!)}
                            className="flex-1"
                          >
                            Customer Info
                          </Button>
                          {table.orderId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewOrderDetails(table.orderId!)}
                              className="flex-1"
                            >
                              View Order
                            </Button>
                          )}
                        </>
                      )}

                      {table.status === "cleaning" && (
                        <PermissionGuard
                          permissions={permissions}
                          requiredPermission="tables:update"
                        >
                          <Button size="sm" variant="outline" className="flex-1">
                            Mark Clean
                          </Button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* Enhanced Customer Information */}
        <PermissionGuard
          permissions={permissions}
          requiredPermission="customers:read"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    className="pl-8"
                  />
                </div>

                <div className="space-y-4">
                  {recentOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {order.customerName}
                        </div>
                        <Badge variant="outline">
                          Table {order.tableNumber}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {order.customerPhone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {order.customerEmail}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          Order: {order.id}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                      {order.specialRequests && (
                        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                          <strong>Special Requests:</strong> {order.specialRequests}
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          View History
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Contact
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>
    </div>
  );
}
