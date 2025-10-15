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
  Phone,
  Mail,
  Eye,
  DollarSign,
  RefreshCw,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveGrid,
  ResponsiveContainer,
} from "@/components/responsive/ResponsiveLayout";
import { AdaptiveStatsGrid } from "@/components/responsive/AdaptiveLayouts";
import {
  TouchButton,
  TouchInput,
  TouchCard,
} from "@/components/responsive/TouchOptimizedControls";
import { useResponsive } from "@/components/responsive/ResponsiveDashboardProvider";
import { StaffSession } from "@/types/auth";
import { PermissionGuard } from "./RoleBasedDashboard";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// import { ReceptionOrderCreationModal } from "./ReceptionOrderCreationModal"; // Removed - Quick Order functionality disabled
import { TableManagementGrid } from "./TableManagementGrid";
import { CustomerManagement } from "./CustomerManagement";
import { PaymentProcessing } from "./PaymentProcessing";
import { StaffMenuGridOrderInterface } from "./StaffMenuGridOrderInterface";
import { cn } from "@/lib/utils";

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
  const { isMobile } = useResponsive();
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
  // const [tables, setTables] = useState<ReceptionTable[]>([]);
  // const [isOrderModalOpen, setIsOrderModalOpen] = useState(false); // Removed - Quick Order functionality disabled
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] =
    useState<ReceptionOrder | null>(null);
  const [showMenuGrid, setShowMenuGrid] = useState(false);
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
      .channel("reception-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Reception orders realtime change:", payload);
          fetchReceptionData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        (payload) => {
          console.log("Reception order items realtime change:", payload);
          fetchReceptionData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
        },
        (payload) => {
          console.log("Reception payments realtime change:", payload);
          fetchReceptionData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          console.log("Reception tables realtime change:", payload);
          fetchReceptionData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_status_history",
        },
        (payload) => {
          console.log(
            "Reception order status history realtime change:",
            payload
          );
          fetchReceptionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchReceptionData = async () => {
    setIsLoading(true);
    try {
      // Import server actions
      const { fetchOrders, getOrderStats } = await import(
        "@/actions/order-actions"
      );

      // Fetch data using server actions
      const [statsData, ordersData] = await Promise.all([
        getOrderStats(),
        fetchOrders({ page: 1, perPage: 10 }),
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
      const transformedOrders =
        ordersData.data?.map((order: any) => ({
          id: order.id,
          invoice_no: order.invoice_no,
          tableNumber: order.table?.table_number || null,
          customerName: order.customer_name || "Walk-in Customer",
          customerPhone: order.customer_phone || null,
          customerEmail: order.customer?.email || null,
          items:
            order.items?.map((item: any) => ({
              name: item.menu_item_name,
              quantity: item.quantity,
              price: item.menu_item_price,
            })) || [],
          itemCount:
            order.items?.reduce(
              (sum: number, item: any) => sum + item.quantity,
              0
            ) || 0,
          total: order.total_amount || 0,
          status: order.status,
          time: new Date(order.created_at).toLocaleTimeString(),
          paymentStatus: order.payment?.[0]?.status || "pending",
          paymentMethod: order.payment?.[0]?.payment_method || null,
          specialRequests: order.notes,
          createdAt: order.created_at,
        })) || [];
      setRecentOrders(transformedOrders);

      // For tables, we'll use a simple approach for now
      // setTables([]);
    } catch (error) {
      console.error("Error fetching reception data:", error);
      toast.error("Failed to load reception data");
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

  // const getTableStatusColor = (status: string) => {
  //   switch (status) {
  //     case "occupied":
  //       return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  //     case "available":
  //       return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  //     case "reserved":
  //       return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  //     case "cleaning":
  //       return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  //     default:
  //       return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  //   }
  // };

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
    setShowMenuGrid(true);
  };

  // const handleCreateOrderModal = () => {
  //   setIsOrderModalOpen(true);
  // }; // Removed - Quick Order functionality disabled

  const handleOrderCreated = (orderId: string) => {
    toast.success("Order created successfully!");
    setShowMenuGrid(false);
    fetchReceptionData(); // Refresh data
    // Optionally navigate to order details
    router.push(`/orders/${orderId}`);
  };

  const handleAssignTable = (tableNumber: number) => {
    // Navigate to table assignment page
    router.push(`/admin/tables/${tableNumber}/assign`);
  };

  const handleProcessPayment = async (orderId: string) => {
    const order = recentOrders.find((o) => o.id === orderId);
    if (!order) {
      toast.error("Order not found");
      return;
    }

    setSelectedOrderForPayment(order);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentComplete = (orderId: string) => {
    toast.success("Payment processed successfully!");
    setIsPaymentModalOpen(false);
    setSelectedOrderForPayment(null);
    fetchReceptionData(); // Refresh data
  };

  // const handleCustomerLookup = (customerInfo: string) => {
  //   // Navigate to customer lookup page
  //   router.push(`/admin/customers?search=${encodeURIComponent(customerInfo)}`);
  // }; // Removed - Customer Lookup functionality disabled

  const handleViewOrderDetails = (orderId: string) => {
    // Navigate to order details page
    router.push(`/admin/orders/${orderId}`);
  };

  const filteredOrders = recentOrders.filter(
    (order) =>
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.invoice_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            Loading reception dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer>
      {/* Menu Grid Order Interface */}
      {showMenuGrid && (
        <PermissionGuard
          permissions={permissions}
          requiredPermission="orders:create"
        >
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Create New Order
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenuGrid(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <StaffMenuGridOrderInterface
                businessId={staffSession.business.id}
                staffRole="reception"
                onOrderCreated={handleOrderCreated}
              />
            </CardContent>
          </Card>
        </PermissionGuard>
      )}

      {/* Enhanced Quick Stats */}
      <AdaptiveStatsGrid>
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
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Today's total
              </p>
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
      </AdaptiveStatsGrid>

      {/* Enhanced Quick Actions */}
      <TouchCard className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveGrid
            cols={{ mobile: 1, tablet: 2, desktop: 3 }}
            gap={{ mobile: "gap-3", tablet: "gap-4", desktop: "gap-4" }}
          >
            <PermissionGuard
              permissions={permissions}
              requiredPermission="orders:create"
            >
              <TouchButton
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                onClick={handleCreateOrder}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </TouchButton>
            </PermissionGuard>

            <PermissionGuard
              permissions={permissions}
              requiredPermission="tables:update"
            >
              <TouchButton
                variant="outline"
                className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleAssignTable(0)}
              >
                <Table className="h-4 w-4 mr-2" />
                Assign Table
              </TouchButton>
            </PermissionGuard>

            {/* Quick Order and Customer Lookup buttons removed due to API issues */}

            <PermissionGuard
              permissions={permissions}
              requiredPermission="payments:process"
            >
              <TouchButton
                variant="outline"
                className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleProcessPayment("ORD-001")}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Process Payment
              </TouchButton>
            </PermissionGuard>
          </ResponsiveGrid>
        </CardContent>
      </TouchCard>

      {/* Main Content Grid */}
      <div className="mt-6 space-y-6">
        {/* Recent Orders Section */}
        <ResponsiveGrid
          cols={{ mobile: 1, tablet: 2, desktop: 2 }}
          gap={{ mobile: "gap-6", tablet: "gap-6", desktop: "gap-6" }}
        >
          <PermissionGuard
            permissions={permissions}
            requiredPermission="orders:read"
          >
            <TouchCard>
              <CardHeader>
                <div
                  className={cn(
                    "flex items-center justify-between",
                    isMobile && "flex-col gap-4"
                  )}
                >
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Recent Orders
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <TouchInput
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn("pl-8", isMobile ? "w-full" : "w-[200px]")}
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
                          <Badge
                            className={getPaymentStatusColor(
                              order.paymentStatus
                            )}
                          >
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
                          <strong>Special Requests:</strong>{" "}
                          {order.specialRequests}
                        </div>
                      )}

                      <Separator className="my-3" />

                      <div className={cn("flex gap-2", isMobile && "flex-col")}>
                        <TouchButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOrderDetails(order.id)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </TouchButton>
                        {order.paymentStatus === "pending" && (
                          <PermissionGuard
                            permissions={permissions}
                            requiredPermission="payments:process"
                          >
                            <TouchButton
                              size="sm"
                              onClick={() => handleProcessPayment(order.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Process Payment
                            </TouchButton>
                          </PermissionGuard>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </TouchCard>
          </PermissionGuard>

          {/* Two Column Layout for Table Management and Customer Management */}

          {/* Table Management Section */}
          {/* <PermissionGuard
            permissions={permissions}
            requiredPermission="tables:read"
          >
            <TableManagementGrid
              businessId={staffSession.business.id}
              onTableUpdate={() => {
                // Refresh data when table is updated
                fetchReceptionData();
              }}
              onOrderView={(orderId) => {
                // Navigate to order details
                handleViewOrderDetails(orderId);
              }}
            />
          </PermissionGuard> */}

          {/* Customer Management Section */}
          <PermissionGuard
            permissions={permissions}
            requiredPermission="customers:read"
          >
            <CustomerManagement
              businessId={staffSession.business.id}
              onCustomerSelect={(customer) => {
                // Handle customer selection for order creation
                console.log("Selected customer:", customer);
              }}
              onOrderView={(orderId) => {
                // Navigate to order details
                handleViewOrderDetails(orderId);
              }}
            />
          </PermissionGuard>
        </ResponsiveGrid>
      </div>

      {/* Order Creation Modal - Removed due to API issues */}
      {/* <ReceptionOrderCreationModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      /> */}

      {/* Payment Processing Modal */}
      {selectedOrderForPayment && (
        <PaymentProcessing
          order={selectedOrderForPayment}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedOrderForPayment(null);
          }}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </ResponsiveContainer>
  );
}
