"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  Filter,
  Calendar,
  User,
  DollarSign,
  FileText,
  Search,
  Edit,
  Save,
  X,
  Check,
  Building,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface RequestItem {
  id: string;
  inventory_item_id: string;
  requested_quantity: number;
  approved_quantity?: number;
  estimated_unit_cost: number;
  approved_unit_cost?: number;
  supplier_id?: string;
  notes?: string;
  inventory_item: {
    id: string;
    name: string;
    unit_of_measure: string;
    current_stock: number;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

interface InventoryRequest {
  id: string;
  business_id: string;
  requested_by_staff_id: string;
  status: "pending" | "approved" | "denied" | "partially_approved";
  urgency_level: "low" | "normal" | "high" | "urgent";
  justification: string;
  total_estimated_cost: number;
  admin_notes?: string;
  approved_by_admin_id?: string;
  approved_at?: string;
  denied_reason?: string;
  created_at: string;
  updated_at: string;
  inventory_request_items: RequestItem[];
  requested_by_staff: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  approved_by_admin?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

export default function InventoryRequestsManager() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<InventoryRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchSuppliers();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-inventory-requests-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_requests",
        },
        (payload) => {
          console.log("Admin inventory requests realtime change:", payload);
          fetchRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_request_items",
        },
        (payload) => {
          console.log(
            "Admin inventory request items realtime change:",
            payload
          );
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);

      // Get business ID from current session/context
      // For now, we'll fetch all requests and filter on the frontend
      const response = await fetch("/api/inventory/requests?limit=100", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        console.error("Failed to fetch inventory requests");
        toast.error("Failed to load inventory requests");
      }
    } catch (error) {
      console.error("Error fetching inventory requests:", error);
      toast.error("Failed to load inventory requests");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      // Fetch suppliers from the API
      const response = await fetch("/api/suppliers", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      } else {
        // If suppliers API doesn't exist, use mock data
        setSuppliers([
          {
            id: "1",
            name: "Local Food Supplier",
            contact_person: "John Doe",
            phone: "+234-123-456-7890",
          },
          {
            id: "2",
            name: "Fresh Produce Ltd",
            contact_person: "Jane Smith",
            phone: "+234-987-654-3210",
          },
          {
            id: "3",
            name: "Meat & Poultry Co",
            contact_person: "Mike Johnson",
            phone: "+234-555-123-4567",
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      // Use mock data as fallback
      setSuppliers([
        {
          id: "1",
          name: "Local Food Supplier",
          contact_person: "John Doe",
          phone: "+234-123-456-7890",
        },
        {
          id: "2",
          name: "Fresh Produce Ltd",
          contact_person: "Jane Smith",
          phone: "+234-987-654-3210",
        },
        {
          id: "3",
          name: "Meat & Poultry Co",
          contact_person: "Mike Johnson",
          phone: "+234-555-123-4567",
        },
      ]);
    }
  };

  const approveRequest = async (
    requestId: string,
    modifications: any[],
    adminNotes?: string
  ) => {
    try {
      setIsProcessing(true);
      const startTime = Date.now();

      const response = await fetch(
        `/api/inventory/requests/${requestId}/approve`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approved_by_admin_id: "current-admin-id", // This should come from auth context
            admin_notes: adminNotes,
            item_modifications: modifications,
            start_time: startTime,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Request approved successfully");
        setSelectedRequest(null);
        fetchRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const denyRequest = async (
    requestId: string,
    denialReason: string,
    adminNotes?: string
  ) => {
    try {
      setIsProcessing(true);
      const startTime = Date.now();

      const response = await fetch(
        `/api/inventory/requests/${requestId}/deny`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approved_by_admin_id: "current-admin-id", // This should come from auth context
            denied_reason: denialReason,
            admin_notes: adminNotes,
            start_time: startTime,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Request denied successfully");
        setSelectedRequest(null);
        fetchRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to deny request");
      }
    } catch (error) {
      console.error("Error denying request:", error);
      toast.error("Failed to deny request");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "partially_approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "denied":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "approved":
        return <CheckCircle className="h-3 w-3" />;
      case "partially_approved":
        return <CheckCircle className="h-3 w-3" />;
      case "denied":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.justification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requested_by_staff.first_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      request.requested_by_staff.last_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      request.inventory_request_items.some((item) =>
        item.inventory_item.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    const matchesUrgency =
      urgencyFilter === "all" || request.urgency_level === urgencyFilter;

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter(
      (r) => r.status === "approved" || r.status === "partially_approved"
    ).length,
    denied: requests.filter((r) => r.status === "denied").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.total}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-yellow-900">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Approved</p>
                <p className="text-2xl font-bold text-green-900">
                  {stats.approved}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Denied</p>
                <p className="text-2xl font-bold text-red-900">
                  {stats.denied}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Inventory Requests Management
            </div>
            <Button
              onClick={fetchRequests}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by staff name, justification, or items..."
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="partially_approved">Partially Approved</option>
                <option value="denied">Denied</option>
              </select>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
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

          {/* Requests List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No inventory requests found</p>
                <p className="text-sm text-gray-500">
                  {requests.length === 0
                    ? "No requests have been submitted yet"
                    : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <AdminRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={setSelectedRequest}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getUrgencyColor={getUrgencyColor}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Approval Modal */}
      {selectedRequest && (
        <RequestApprovalModal
          request={selectedRequest}
          suppliers={suppliers}
          onClose={() => setSelectedRequest(null)}
          onApprove={approveRequest}
          onDeny={denyRequest}
          isProcessing={isProcessing}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getUrgencyColor={getUrgencyColor}
        />
      )}
    </div>
  );
}

// Admin Request Card Component
interface AdminRequestCardProps {
  request: InventoryRequest;
  onViewDetails: (request: InventoryRequest) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getUrgencyColor: (urgency: string) => string;
}

function AdminRequestCard({
  request,
  onViewDetails,
  getStatusColor,
  getStatusIcon,
  getUrgencyColor,
}: AdminRequestCardProps) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`text-xs ${getStatusColor(request.status)}`}>
              {getStatusIcon(request.status)}
              {request.status.replace("_", " ")}
            </Badge>
            <Badge
              className={`text-xs ${getUrgencyColor(request.urgency_level)}`}
            >
              {request.urgency_level}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-sm">
              {request.requested_by_staff.first_name}{" "}
              {request.requested_by_staff.last_name}
            </span>
            <Badge variant="outline" className="text-xs">
              {request.requested_by_staff.role}
            </Badge>
          </div>
          <p className="font-medium text-sm mb-1">
            {request.inventory_request_items.length} items requested
          </p>
          <p className="text-xs text-gray-600 line-clamp-2">
            {request.justification}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm">
            ₦{request.total_estimated_cost.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(request.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(request.created_at).toLocaleDateString()}
          </div>
          {request.approved_at && (
            <div className="flex items-center gap-1">
              <Building className="h-3 w-3" />
              Reviewed{" "}
              {formatDistanceToNow(new Date(request.approved_at), {
                addSuffix: true,
              })}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewDetails(request)}
          className="gap-1"
        >
          <Eye className="h-3 w-3" />
          Review
        </Button>
      </div>

      {request.admin_notes && (
        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs font-medium text-blue-700 mb-1">Admin Notes:</p>
          <p className="text-xs text-blue-600">{request.admin_notes}</p>
        </div>
      )}

      {request.denied_reason && (
        <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
          <p className="text-xs font-medium text-red-700 mb-1">
            Denial Reason:
          </p>
          <p className="text-xs text-red-600">{request.denied_reason}</p>
        </div>
      )}
    </div>
  );
}

// Request Approval Modal Component
interface RequestApprovalModalProps {
  request: InventoryRequest;
  suppliers: Supplier[];
  onClose: () => void;
  onApprove: (
    requestId: string,
    modifications: any[],
    adminNotes?: string
  ) => void;
  onDeny: (
    requestId: string,
    denialReason: string,
    adminNotes?: string
  ) => void;
  isProcessing: boolean;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getUrgencyColor: (urgency: string) => string;
}

function RequestApprovalModal({
  request,
  suppliers,
  onClose,
  onApprove,
  onDeny,
  isProcessing,
  getStatusColor,
  getStatusIcon,
  getUrgencyColor,
}: RequestApprovalModalProps) {
  const [itemModifications, setItemModifications] = useState<any[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [showDenialForm, setShowDenialForm] = useState(false);

  const updateItemModification = (
    itemId: string,
    field: string,
    value: any
  ) => {
    setItemModifications((prev) => {
      const existing = prev.find((mod) => mod.item_id === itemId);
      if (existing) {
        return prev.map((mod) =>
          mod.item_id === itemId ? { ...mod, [field]: value } : mod
        );
      } else {
        return [...prev, { item_id: itemId, [field]: value }];
      }
    });
  };

  const getModificationValue = (
    itemId: string,
    field: string,
    defaultValue: any
  ) => {
    const modification = itemModifications.find(
      (mod) => mod.item_id === itemId
    );
    return modification?.[field] ?? defaultValue;
  };

  const calculateTotalApprovedCost = () => {
    return request.inventory_request_items.reduce((total, item) => {
      const approvedQuantity = getModificationValue(
        item.id,
        "approved_quantity",
        item.requested_quantity
      );
      const approvedCost = getModificationValue(
        item.id,
        "approved_unit_cost",
        item.estimated_unit_cost
      );
      return total + approvedQuantity * approvedCost;
    }, 0);
  };

  const handleApprove = () => {
    onApprove(request.id, itemModifications, adminNotes);
  };

  const handleDeny = () => {
    if (!denialReason.trim()) {
      toast.error("Please provide a reason for denial");
      return;
    }
    onDeny(request.id, denialReason, adminNotes);
  };

  if (request.status !== "pending") {
    // Show read-only view for non-pending requests
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                Request Details (Read Only)
              </h2>
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-medium mb-3">Request Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusIcon(request.status)}
                      {request.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Priority:</span>
                    <Badge className={getUrgencyColor(request.urgency_level)}>
                      {request.urgency_level}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Requested by:</span>{" "}
                    {request.requested_by_staff.first_name}{" "}
                    {request.requested_by_staff.last_name}
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>{" "}
                    {new Date(request.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-600">Total Cost:</span> ₦
                    {request.total_estimated_cost.toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Justification</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {request.justification}
                </p>
              </div>
            </div>

            {/* Items List (Read Only) */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Items</h3>
              <div className="space-y-3">
                {request.inventory_request_items.map((item) => (
                  <div key={item.id} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {item.inventory_item.name}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Requested:</span>
                        <p>
                          {item.requested_quantity}{" "}
                          {item.inventory_item.unit_of_measure}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit Cost:</span>
                        <p>₦{item.estimated_unit_cost.toLocaleString()}</p>
                      </div>
                      {item.approved_quantity !== undefined && (
                        <div>
                          <span className="text-gray-600">Approved:</span>
                          <p>
                            {item.approved_quantity}{" "}
                            {item.inventory_item.unit_of_measure}
                          </p>
                        </div>
                      )}
                      {item.approved_unit_cost !== undefined && (
                        <div>
                          <span className="text-gray-600">Approved Cost:</span>
                          <p>₦{item.approved_unit_cost.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Response */}
            {(request.admin_notes || request.denied_reason) && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">Admin Response</h3>
                {request.admin_notes && (
                  <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-700 mb-1">
                      Admin Notes:
                    </p>
                    <p className="text-sm text-blue-600">
                      {request.admin_notes}
                    </p>
                  </div>
                )}
                {request.denied_reason && (
                  <div className="p-3 bg-red-50 rounded border border-red-200">
                    <p className="text-sm font-medium text-red-700 mb-1">
                      Denial Reason:
                    </p>
                    <p className="text-sm text-red-600">
                      {request.denied_reason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Review Inventory Request</h2>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium mb-3">Request Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getStatusColor(request.status)}>
                    {getStatusIcon(request.status)}
                    {request.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Priority:</span>
                  <Badge className={getUrgencyColor(request.urgency_level)}>
                    {request.urgency_level}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Requested by:</span>{" "}
                  {request.requested_by_staff.first_name}{" "}
                  {request.requested_by_staff.last_name}
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>{" "}
                  {new Date(request.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="text-gray-600">Original Cost:</span> ₦
                  {request.total_estimated_cost.toLocaleString()}
                </div>
                <div>
                  <span className="text-gray-600">Approved Cost:</span> ₦
                  {calculateTotalApprovedCost().toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Justification</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                {request.justification}
              </p>
            </div>
          </div>

          {/* Items Review */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Review Items</h3>
            <div className="space-y-4">
              {request.inventory_request_items.map((item) => (
                <div key={item.id} className="border rounded p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{item.inventory_item.name}</h4>
                    <div className="text-sm text-gray-600">
                      Current Stock: {item.inventory_item.current_stock}{" "}
                      {item.inventory_item.unit_of_measure}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs">Requested Quantity</Label>
                      <div className="mt-1 px-3 py-2 bg-white border rounded text-sm">
                        {item.requested_quantity}{" "}
                        {item.inventory_item.unit_of_measure}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Approve Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        max={item.requested_quantity}
                        value={getModificationValue(
                          item.id,
                          "approved_quantity",
                          item.requested_quantity
                        )}
                        onChange={(e) =>
                          updateItemModification(
                            item.id,
                            "approved_quantity",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Unit Cost (₦)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={getModificationValue(
                          item.id,
                          "approved_unit_cost",
                          item.estimated_unit_cost
                        )}
                        onChange={(e) =>
                          updateItemModification(
                            item.id,
                            "approved_unit_cost",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Supplier</Label>
                      <select
                        value={getModificationValue(
                          item.id,
                          "supplier_id",
                          item.supplier_id || ""
                        )}
                        onChange={(e) =>
                          updateItemModification(
                            item.id,
                            "supplier_id",
                            e.target.value
                          )
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs">Item Notes</Label>
                    <Textarea
                      placeholder="Add notes for this item..."
                      value={getModificationValue(
                        item.id,
                        "notes",
                        item.notes || ""
                      )}
                      onChange={(e) =>
                        updateItemModification(item.id, "notes", e.target.value)
                      }
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div className="mt-3 text-right">
                    <span className="text-sm font-medium">
                      Item Total: ₦
                      {(
                        getModificationValue(
                          item.id,
                          "approved_quantity",
                          item.requested_quantity
                        ) *
                        getModificationValue(
                          item.id,
                          "approved_unit_cost",
                          item.estimated_unit_cost
                        )
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="mb-6">
            <Label htmlFor="admin-notes">Admin Notes</Label>
            <Textarea
              id="admin-notes"
              placeholder="Add notes about this approval/modification..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          {!showDenialForm ? (
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Total Approved Cost: ₦
                {calculateTotalApprovedCost().toLocaleString()}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDenialForm(true)}
                  disabled={isProcessing}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deny Request
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {isProcessing ? "Processing..." : "Approve Request"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="denial-reason">Reason for Denial *</Label>
                <Textarea
                  id="denial-reason"
                  placeholder="Explain why this request is being denied..."
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDenialForm(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeny}
                  disabled={isProcessing || !denialReason.trim()}
                  variant="destructive"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {isProcessing ? "Processing..." : "Deny Request"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
