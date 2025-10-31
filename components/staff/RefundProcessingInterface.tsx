"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  User,
  Calendar,
  Search,
  Filter,
  Eye,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatAmount } from "@/helpers/formatAmount";

interface RefundRequest {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "denied";
  requested_by_staff_id?: string;
  approved_by_staff_id?: string;
  denied_by_staff_id?: string;
  approved_at?: string;
  denied_at?: string;
  admin_notes?: string;
  denial_reason?: string;
  created_at: string;
  updated_at: string;
  payments: {
    id: string;
    amount: number;
    payment_method: string;
    status: string;
    orders: {
      id: string;
      invoice_no: string;
      customer_name?: string;
      customer_phone?: string;
      business_id: string;
    };
  };
  requested_by_staff?: {
    id: string;
    name: string;
    role: string;
  };
  approved_by_staff?: {
    id: string;
    name: string;
    role: string;
  };
}

interface RefundProcessingInterfaceProps {
  businessId: string;
}

export function RefundProcessingInterface({
  businessId,
}: RefundProcessingInterfaceProps) {
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal states
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(
    null
  );
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDenialModalOpen, setIsDenialModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [denialReason, setDenialReason] = useState("");

  const supabase = createClient();

  // Fetch refund requests
  const fetchRefundRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const response = await fetch(
        `/api/payments/refunds?${params.toString()}`
      );
      const data = await response.json();

      if (response.ok) {
        setRefundRequests(data.refundRequests || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      } else {
        toast.error(data.error || "Failed to fetch refund requests");
      }
    } catch (error) {
      console.error("Error fetching refund requests:", error);
      toast.error("Failed to fetch refund requests");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  // Approve refund
  const handleApproveRefund = async () => {
    if (!selectedRefund) return;

    setProcessing(selectedRefund.id);
    try {
      const response = await fetch(
        `/api/payments/refunds/${selectedRefund.id}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notes: approvalNotes,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Refund approved successfully");
        setIsApprovalModalOpen(false);
        setApprovalNotes("");
        setSelectedRefund(null);
        fetchRefundRequests();
      } else {
        toast.error(data.error || "Failed to approve refund");
      }
    } catch (error) {
      console.error("Error approving refund:", error);
      toast.error("Failed to approve refund");
    } finally {
      setProcessing(null);
    }
  };

  // Deny refund
  const handleDenyRefund = async () => {
    if (!selectedRefund || !denialReason.trim()) {
      toast.error("Denial reason is required");
      return;
    }

    setProcessing(selectedRefund.id);
    try {
      const response = await fetch(
        `/api/payments/refunds/${selectedRefund.id}/deny`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: denialReason,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Refund denied successfully");
        setIsDenialModalOpen(false);
        setDenialReason("");
        setSelectedRefund(null);
        fetchRefundRequests();
      } else {
        toast.error(data.error || "Failed to deny refund");
      }
    } catch (error) {
      console.error("Error denying refund:", error);
      toast.error("Failed to deny refund");
    } finally {
      setProcessing(null);
    }
  };

  // Filter refunds by search term
  const filteredRefunds = refundRequests.filter(
    (refund) =>
      refund.payments.orders.invoice_no
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      refund.payments.orders.customer_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      refund.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "denied":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "denied":
        return <XCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Reset filters
  const resetFilters = () => {
    setStatusFilter("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    fetchRefundRequests();
  }, [fetchRefundRequests]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {refundRequests.filter((r) => r.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {refundRequests.filter((r) => r.status === "approved").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {refundRequests.filter((r) => r.status === "denied").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Refund Requests</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRefundRequests}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Invoice, customer, reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Refund Requests List */}
          <div className="border rounded-lg">
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Refund Requests ({totalRecords} total)
                </h3>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading refund requests...</p>
              </div>
            ) : filteredRefunds.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No refund requests found matching your criteria
              </div>
            ) : (
              <div className="divide-y">
                {filteredRefunds.map((refund) => (
                  <div key={refund.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {refund.payments.orders.invoice_no}
                          </span>
                          <Badge className={getStatusColor(refund.status)}>
                            {getStatusIcon(refund.status)}
                            <span className="ml-1">{refund.status}</span>
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <div>
                            Customer:{" "}
                            {refund.payments.orders.customer_name ||
                              "Anonymous"}
                          </div>
                          <div>Amount: {formatAmount(refund.amount)}</div>
                          <div>Reason: {refund.reason}</div>
                          <div>
                            Requested:{" "}
                            {new Date(refund.created_at).toLocaleString()}
                          </div>
                          {refund.requested_by_staff && (
                            <div>
                              By: {refund.requested_by_staff.name} (
                              {refund.requested_by_staff.role})
                            </div>
                          )}
                        </div>

                        {refund.status === "approved" && refund.admin_notes && (
                          <div className="text-sm text-green-600">
                            <strong>Admin Notes:</strong> {refund.admin_notes}
                          </div>
                        )}

                        {refund.status === "denied" && refund.denial_reason && (
                          <div className="text-sm text-red-600">
                            <strong>Denial Reason:</strong>{" "}
                            {refund.denial_reason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {refund.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRefund(refund);
                                setIsApprovalModalOpen(true);
                              }}
                              disabled={processing === refund.id}
                            >
                              {processing === refund.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              <span className="ml-1">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRefund(refund);
                                setIsDenialModalOpen(true);
                              }}
                              disabled={processing === refund.id}
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="ml-1">Deny</span>
                            </Button>
                          </>
                        )}
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

      {/* Approval Modal */}
      <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Refund Request</DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Order:</strong>{" "}
                    {selectedRefund.payments.orders.invoice_no}
                  </div>
                  <div>
                    <strong>Customer:</strong>{" "}
                    {selectedRefund.payments.orders.customer_name ||
                      "Anonymous"}
                  </div>
                  <div>
                    <strong>Amount:</strong>{" "}
                    {formatAmount(selectedRefund.amount)}
                  </div>
                  <div>
                    <strong>Reason:</strong> {selectedRefund.reason}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="approval_notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="approval_notes"
                  placeholder="Add any notes about this approval..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApprovalModalOpen(false);
                setApprovalNotes("");
                setSelectedRefund(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveRefund}
              disabled={processing === selectedRefund?.id}
            >
              {processing === selectedRefund?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Denial Modal */}
      <Dialog open={isDenialModalOpen} onOpenChange={setIsDenialModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Refund Request</DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Order:</strong>{" "}
                    {selectedRefund.payments.orders.invoice_no}
                  </div>
                  <div>
                    <strong>Customer:</strong>{" "}
                    {selectedRefund.payments.orders.customer_name ||
                      "Anonymous"}
                  </div>
                  <div>
                    <strong>Amount:</strong>{" "}
                    {formatAmount(selectedRefund.amount)}
                  </div>
                  <div>
                    <strong>Reason:</strong> {selectedRefund.reason}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="denial_reason">Denial Reason *</Label>
                <Textarea
                  id="denial_reason"
                  placeholder="Please provide a reason for denying this refund..."
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDenialModalOpen(false);
                setDenialReason("");
                setSelectedRefund(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDenyRefund}
              disabled={
                processing === selectedRefund?.id || !denialReason.trim()
              }
            >
              {processing === selectedRefund?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Denying...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Deny Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
