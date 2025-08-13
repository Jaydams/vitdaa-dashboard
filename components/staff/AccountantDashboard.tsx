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
import { StaffSession } from "@/types/auth";
import { PermissionGuard } from "./RoleBasedDashboard";

interface AccountantDashboardProps {
  staffSession: StaffSession;
}

export default function AccountantDashboard({
  staffSession,
}: AccountantDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [selectedReportType, setSelectedReportType] = useState("sales");
  const { permissions } = staffSession;

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
      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PermissionGuard
          permissions={permissions}
          requiredPermission="reports:read"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${mockFinancialStats.todayRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {mockFinancialStats.todayOrders} orders completed
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="transactions:read"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Order Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${mockFinancialStats.averageOrderValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% from yesterday
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="payments:read"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Payments
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockFinancialStats.pendingPayments}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard
          permissions={permissions}
          requiredPermission="payments:refund"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Refunds Today
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockFinancialStats.refundsProcessed}
              </div>
              <p className="text-xs text-muted-foreground">
                $57.50 total refunded
              </p>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <PermissionGuard
              permissions={permissions}
              requiredPermission="reports:generate"
            >
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </PermissionGuard>

            <PermissionGuard
              permissions={permissions}
              requiredPermission="payments:refund"
            >
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Process Refund
              </Button>
            </PermissionGuard>

            <PermissionGuard
              permissions={permissions}
              requiredPermission="transactions:read"
            >
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Transactions
              </Button>
            </PermissionGuard>

            <PermissionGuard
              permissions={permissions}
              requiredPermission="reports:read"
            >
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <PermissionGuard
          permissions={permissions}
          requiredPermission="transactions:read"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockRecentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getPaymentMethodIcon(transaction.method)}
                      <div>
                        <div className="font-medium">
                          Table {transaction.table}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.orderId} • {transaction.time}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${transaction.amount.toFixed(2)}
                      </div>
                      <Badge
                        className={getTransactionStatusColor(
                          transaction.status
                        )}
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* Pending Refunds */}
        <PermissionGuard
          permissions={permissions}
          requiredPermission="payments:refund"
        >
          <Card>
            <CardHeader>
              <CardTitle>Pending Refunds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockPendingRefunds.map((refund) => (
                  <div key={refund.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{refund.orderId}</span>
                      <Badge
                        variant={
                          refund.status === "approved" ? "default" : "secondary"
                        }
                      >
                        {refund.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <div>Amount: ${refund.amount.toFixed(2)}</div>
                      <div>Reason: {refund.reason}</div>
                      <div>Requested by: {refund.requestedBy}</div>
                      <div>Time: {refund.requestTime}</div>
                    </div>
                    {refund.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleProcessRefund(refund.id)}
                        >
                          Approve
                        </Button>
                        <Button size="sm" variant="outline">
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Reports Section */}
      <PermissionGuard
        permissions={permissions}
        requiredPermission="reports:read"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Financial Reports</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedReportType}
                  onValueChange={setSelectedReportType}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Report</SelectItem>
                    <SelectItem value="revenue">Revenue Report</SelectItem>
                    <SelectItem value="financial">Financial Report</SelectItem>
                    <SelectItem value="payments">Payment Analysis</SelectItem>
                  </SelectContent>
                </Select>
                <PermissionGuard
                  permissions={permissions}
                  requiredPermission="reports:generate"
                >
                  <Button
                    size="sm"
                    onClick={() =>
                      handleGenerateReport(selectedReportType, selectedPeriod)
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </PermissionGuard>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockReports.map((report, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{report.name}</span>
                    <Badge variant="outline">{report.period}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Last generated: {report.lastGenerated}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  );
}
