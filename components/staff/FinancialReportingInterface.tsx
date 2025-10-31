"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  Calendar,
  Download,
  Filter,
  Search,
  RefreshCw,
  BarChart3,
  PieChart,
  Loader2,
  Eye,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EnhancedDatePicker } from "@/components/ui/enhanced-date-picker";
import { createClient } from "@/lib/supabase/client";
import { formatAmount } from "@/helpers/formatAmount";

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction_id?: string;
  payment_time?: string;
  created_at: string;
  orders: {
    id: string;
    invoice_no: string;
    customer_name?: string;
    customer_phone?: string;
    total: number;
    status: string;
    created_at: string;
    order_items?: Array<{
      id: string;
      menu_item_name: string;
      quantity: number;
      price: number;
    }>;
  };
}

interface ReportData {
  reportType: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    completedTransactions: number;
    refundedTransactions: number;
    pendingTransactions: number;
    averageOrderValue: number;
    totalRefunded: number;
  };
  paymentMethodBreakdown: Record<string, number>;
  dailyBreakdown: Array<{
    date: string;
    amount: number;
  }>;
  generatedAt: string;
}

interface FinancialReportingInterfaceProps {
  businessId: string;
}

export function FinancialReportingInterface({
  businessId,
}: FinancialReportingInterfaceProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("daily");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const supabase = createClient();

  // Fetch payments data
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (startDate) {
        params.append("start_date", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        params.append("end_date", endDate.toISOString().split("T")[0]);
      }
      if (paymentMethod) {
        params.append("payment_method", paymentMethod);
      }
      if (status) {
        params.append("status", status);
      }

      const response = await fetch(`/api/payments?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setPayments(data.payments || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      } else {
        toast.error(data.error || "Failed to fetch payments");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  }, [currentPage, startDate, endDate, paymentMethod, status]);

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        type: reportType,
      });

      if (startDate) {
        params.append("start_date", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        params.append("end_date", endDate.toISOString().split("T")[0]);
      }

      const response = await fetch(
        `/api/payments/reports?${params.toString()}`
      );
      const data = await response.json();

      if (response.ok) {
        setReportData(data);
      } else {
        toast.error(data.error || "Failed to fetch report data");
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to fetch report data");
    }
  }, [reportType, startDate, endDate]);

  // Export data
  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format,
      });

      if (startDate) {
        params.append("start_date", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        params.append("end_date", endDate.toISOString().split("T")[0]);
      }
      if (paymentMethod) {
        params.append("payment_method", paymentMethod);
      }
      if (status) {
        params.append("status", status);
      }

      const response = await fetch(`/api/payments/export?${params.toString()}`);

      if (response.ok) {
        if (format === "csv") {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `payments-export-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `payments-export-${
            new Date().toISOString().split("T")[0]
          }.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
        toast.success(`Data exported successfully as ${format.toUpperCase()}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to export data");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  // Filter payments by search term
  const filteredPayments = payments.filter(
    (payment) =>
      payment.orders.invoice_no
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.orders.customer_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
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

  // Get payment method icon
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "card":
        return <CreditCard className="h-4 w-4" />;
      case "cash":
        return <DollarSign className="h-4 w-4" />;
      case "wallet":
        return <RefreshCw className="h-4 w-4" />;
      case "transfer":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  // Reset filters
  const resetFilters = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setPaymentMethod("");
    setStatus("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="space-y-6">
      {/* Report Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(reportData.summary.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {reportData.summary.completedTransactions} completed
                transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Order Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(reportData.summary.averageOrderValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per completed transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Transactions
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reportData.summary.totalTransactions}
              </div>
              <p className="text-xs text-muted-foreground">
                {reportData.summary.pendingTransactions} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Refunds</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(reportData.summary.totalRefunded)}
              </div>
              <p className="text-xs text-muted-foreground">
                {reportData.summary.refundedTransactions} refunded transactions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Financial Reports & Transactions</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchPayments();
                  fetchReportData();
                }}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <EnhancedDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <EnhancedDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Select end date"
              />
            </div>
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Invoice, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={resetFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export JSON
            </Button>
          </div>

          {/* Transactions Table */}
          <div className="border rounded-lg">
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Transactions ({totalRecords} total)
                </h3>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading transactions...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No transactions found matching your criteria
              </div>
            ) : (
              <div className="divide-y">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <div>
                          <div className="font-medium">
                            {payment.orders.invoice_no}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.orders.customer_name || "Anonymous"} •{" "}
                            {new Date(payment.created_at).toLocaleString()}
                          </div>
                          {payment.transaction_id && (
                            <div className="text-xs text-muted-foreground">
                              Ref: {payment.transaction_id}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatAmount(payment.amount)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getPaymentStatusColor(payment.status)}
                          >
                            {payment.status}
                          </Badge>
                          <Badge variant="outline">
                            {payment.payment_method}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      {reportData &&
        Object.keys(reportData.paymentMethodBreakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Payment Method Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(reportData.paymentMethodBreakdown).map(
                  ([method, amount]) => (
                    <div key={method} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {getPaymentMethodIcon(method)}
                        <span className="font-medium capitalize">{method}</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatAmount(amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(
                          (amount / reportData.summary.totalRevenue) *
                          100
                        ).toFixed(1)}
                        % of total
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
