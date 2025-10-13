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
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { StaffSession } from "@/types/auth";
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

interface InventoryRequestsListProps {
  staffSession: StaffSession;
  refreshTrigger?: number;
}

export default function InventoryRequestsList({
  staffSession,
  refreshTrigger,
}: InventoryRequestsListProps) {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<InventoryRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [refreshTrigger]);

  useEffect(() => {
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const supabase = createClient();

    const channel = supabase
      .channel("inventory-requests-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_requests",
        },
        (payload) => {
          console.log("Inventory requests realtime change:", payload);
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
          console.log("Inventory request items realtime change:", payload);
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
      const response = await fetch(
        `/api/inventory/requests?business_id=${staffSession.business.id}&staff_id=${staffSession.staff.id}&limit=50`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

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
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total</p>
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
                <p className="text-sm font-medium text-yellow-700">Pending</p>
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
              My Inventory Requests
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
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search requests by justification or items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
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
                    ? "You haven't submitted any requests yet"
                    : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <RequestCard
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

      {/* Request Details Modal */}
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getUrgencyColor={getUrgencyColor}
        />
      )}
    </div>
  );
}

// Request Card Component
interface RequestCardProps {
  request: InventoryRequest;
  onViewDetails: (request: InventoryRequest) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getUrgencyColor: (urgency: string) => string;
}

function RequestCard({
  request,
  onViewDetails,
  getStatusColor,
  getStatusIcon,
  getUrgencyColor,
}: RequestCardProps) {
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
              <User className="h-3 w-3" />
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
          View Details
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

// Request Details Modal Component
interface RequestDetailsModalProps {
  request: InventoryRequest;
  onClose: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getUrgencyColor: (urgency: string) => string;
}

function RequestDetailsModal({
  request,
  onClose,
  getStatusColor,
  getStatusIcon,
  getUrgencyColor,
}: RequestDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Request Details</h2>
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

          <div className="mb-6">
            <h3 className="font-medium mb-3">Requested Items</h3>
            <div className="space-y-3">
              {request.inventory_request_items.map((item) => (
                <div key={item.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{item.inventory_item.name}</h4>
                    <div className="text-right">
                      <p className="font-medium">
                        ₦
                        {(
                          item.requested_quantity * item.estimated_unit_cost
                        ).toLocaleString()}
                      </p>
                    </div>
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
                  {item.notes && (
                    <div className="mt-2">
                      <span className="text-gray-600 text-sm">Notes:</span>
                      <p className="text-sm">{item.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {(request.admin_notes || request.denied_reason) && (
            <div className="mb-6">
              <h3 className="font-medium mb-3">Admin Response</h3>
              {request.admin_notes && (
                <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-700 mb-1">
                    Admin Notes:
                  </p>
                  <p className="text-sm text-blue-600">{request.admin_notes}</p>
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
