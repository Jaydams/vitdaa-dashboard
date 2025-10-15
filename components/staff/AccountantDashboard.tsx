"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Users,
  Plus,
  ShoppingCart,
  X,
} from "lucide-react";

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
import { StaffSession } from "@/types/auth";
import { PermissionGuard } from "./RoleBasedDashboard";
import { FinancialReportingInterface } from "./FinancialReportingInterface";
import { RefundProcessingInterface } from "./RefundProcessingInterface";
import { StaffPerformanceAnalytics } from "./StaffPerformanceAnalytics";
import { StaffMenuGridOrderInterface } from "./StaffMenuGridOrderInterface";
import { toast } from "sonner";

interface AccountantDashboardProps {
  staffSession: StaffSession;
}

export default function AccountantDashboard({
  staffSession,
}: AccountantDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [selectedReportType, setSelectedReportType] = useState("sales");
  const [showMenuGrid, setShowMenuGrid] = useState(false);
  const { permissions } = staffSession;

  // Handle order creation
  const handleOrderCreated = (orderId: string) => {
    toast.success("Order created successfully!");
    setShowMenuGrid(false);
  };

  // Mock data - in real implementation, this would come from API calls
  const mockFinancialStats = {
    todayRevenue: 2450.75,
    todayOrders: 48,
    pendingPayments: 3,
    refundsProcessed: 2,
    averageOrderValue: 51.06,
    paymentMethods: {
      cash: 35,
      card: 60,
      digital: 5,
    },
  };

  const mockRecentTransactions = [
    {
      id: "TXN-001",
      orderId: "ORD-001",
      amount: 45.5,
      method: "card",
      status: "completed",
      time: "2:30 PM",
      table: 5,
    },
    {
      id: "TXN-002",
      orderId: "ORD-002",
      amount: 28.75,
      method: "cash",
      status: "completed",
      time: "2:25 PM",
      table: 12,
    },
    {
      id: "TXN-003",
      orderId: "ORD-003",
      amount: 62.25,
      method: "digital",
      status: "pending",
      time: "2:20 PM",
      table: 3,
    },
    {
      id: "TXN-004",
      orderId: "ORD-004",
      amount: 35.0,
      method: "card",
      status: "refunded",
      time: "2:15 PM",
      table: 8,
    },
  ];

  const mockPendingRefunds = [
    {
      id: "REF-001",
      orderId: "ORD-045",
      amount: 35.0,
      reason: "Food quality issue",
      requestedBy: "Reception Staff",
      requestTime: "1:45 PM",
      status: "pending",
    },
    {
      id: "REF-002",
      orderId: "ORD-038",
      amount: 22.5,
      reason: "Wrong order delivered",
      requestedBy: "Manager",
      requestTime: "12:30 PM",
      status: "approved",
    },
  ];

  const mockReports = [
    {
      name: "Daily Sales Report",
      type: "sales",
      period: "daily",
      lastGenerated: "Today 3:00 PM",
    },
    {
      name: "Weekly Revenue Summary",
      type: "revenue",
      period: "weekly",
      lastGenerated: "Yesterday 6:00 PM",
    },
    {
      name: "Monthly Financial Report",
      type: "financial",
      period: "monthly",
      lastGenerated: "3 days ago",
    },
    {
      name: "Payment Methods Analysis",
      type: "payments",
      period: "daily",
      lastGenerated: "Today 2:00 PM",
    },
  ];

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "refunded":
        return "bg-red-100 text-red-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "card":
        return <CreditCard className="h-4 w-4" />;
      case "cash":
        return <DollarSign className="h-4 w-4" />;
      case "digital":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const handleProcessRefund = (refundId: string) => {
    // In real implementation, this would make an API call
    console.log(`Processing refund ${refundId}`);
  };

  const handleGenerateReport = (reportType: string, period: string) => {
    // In real implementation, this would make an API call
    console.log(`Generating ${reportType} report for ${period}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Order Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">
            Accountant Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 truncate">
            Financial management and reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard
            permissions={permissions}
            requiredPermission="orders:create"
          >
            <Button
              onClick={() => setShowMenuGrid(true)}
              variant="default"
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Create Order</span>
              <span className="sm:hidden">New Order</span>
            </Button>
          </PermissionGuard>
        </div>
      </div>

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
                staffRole="accountant"
                onOrderCreated={handleOrderCreated}
              />
            </CardContent>
          </Card>
        </PermissionGuard>
      )}

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Financial Reports
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refund Processing
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <PermissionGuard
            permissions={permissions}
            requiredPermission="reports:read"
          >
            <FinancialReportingInterface
              businessId={staffSession.business.id}
            />
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-6">
          <PermissionGuard
            permissions={permissions}
            requiredPermission="payments:refund"
          >
            <RefundProcessingInterface businessId={staffSession.business.id} />
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PermissionGuard
            permissions={permissions}
            requiredPermission="reports:read"
          >
            <StaffPerformanceAnalytics businessId={staffSession.business.id} />
          </PermissionGuard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
