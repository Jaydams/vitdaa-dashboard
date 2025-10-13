"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Plus,
  Search,
  ShoppingCart,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Send,
  X,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { StaffSession } from "@/types/auth";

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit_of_measure: string;
  category: string;
  last_updated: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  estimated_unit_cost?: number;
}

interface RequestItem {
  inventory_item_id: string;
  inventory_item: InventoryItem;
  requested_quantity: number;
  estimated_unit_cost: number;
  supplier_id?: string;
  notes?: string;
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
  created_at: string;
  updated_at: string;
  inventory_request_items: RequestItem[];
  requested_by_staff: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface InventoryRequestFormProps {
  staffSession: StaffSession;
  onRequestSubmitted?: (request: InventoryRequest) => void;
}

export default function InventoryRequestForm({
  staffSession,
  onRequestSubmitted,
}: InventoryRequestFormProps) {
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<RequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState<
    "low" | "normal" | "high" | "urgent"
  >("normal");
  const [justification, setJustification] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/inventory/items?business_id=${staffSession.business.id}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableItems(data.items || []);
      } else {
        console.error("Failed to fetch inventory items");
        toast.error("Failed to load inventory items");
      }
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      toast.error("Failed to load inventory items");
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToRequest = (item: InventoryItem) => {
    const existingItem = selectedItems.find(
      (selected) => selected.inventory_item_id === item.id
    );

    if (existingItem) {
      toast.error("Item already added to request");
      return;
    }

    const newRequestItem: RequestItem = {
      inventory_item_id: item.id,
      inventory_item: item,
      requested_quantity: 1,
      estimated_unit_cost: item.estimated_unit_cost || 0,
      notes: "",
    };

    setSelectedItems([...selectedItems, newRequestItem]);
    toast.success(`${item.name} added to request`);
  };

  const removeItemFromRequest = (itemId: string) => {
    setSelectedItems(
      selectedItems.filter((item) => item.inventory_item_id !== itemId)
    );
    toast.success("Item removed from request");
  };

  const updateRequestItem = (
    itemId: string,
    field: keyof RequestItem,
    value: any
  ) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateTotalCost = () => {
    return selectedItems.reduce(
      (total, item) =>
        total + item.requested_quantity * item.estimated_unit_cost,
      0
    );
  };

  const submitRequest = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please add at least one item to the request");
      return;
    }

    if (!justification.trim()) {
      toast.error("Please provide a justification for this request");
      return;
    }

    try {
      setIsSubmitting(true);
      const startTime = Date.now();

      const requestData = {
        business_id: staffSession.business.id,
        requested_by_staff_id: staffSession.staff.id,
        urgency_level: urgencyLevel,
        justification: justification.trim(),
        items: selectedItems.map((item) => ({
          inventory_item_id: item.inventory_item_id,
          requested_quantity: item.requested_quantity,
          estimated_unit_cost: item.estimated_unit_cost,
          supplier_id: item.supplier_id || null,
          notes: item.notes || null,
        })),
        staff_session_id: staffSession.sessionRecord.id,
        start_time: startTime,
      };

      const response = await fetch("/api/inventory/requests", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Inventory request submitted successfully");

        // Reset form
        setSelectedItems([]);
        setJustification("");
        setUrgencyLevel("normal");
        setShowForm(false);

        // Notify parent component
        if (onRequestSubmitted) {
          onRequestSubmitted(data.request);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
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

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "out_of_stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredItems = availableItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = availableItems.filter(
    (item) => item.status === "low_stock" || item.status === "out_of_stock"
  );

  if (!showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Inventory Requests
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockItems.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-orange-700">
                  Low Stock Alert
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {lowStockItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        {item.current_stock} {item.unit_of_measure} remaining
                      </p>
                    </div>
                    <Badge className={getStockStatusColor(item.status)}>
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
              {lowStockItems.length > 6 && (
                <p className="text-sm text-gray-600 mt-2">
                  And {lowStockItems.length - 6} more items need restocking
                </p>
              )}
            </div>
          )}
          <p className="text-gray-600">
            Click "New Request" to submit an inventory request to admin for
            approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              New Inventory Request
            </div>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Request Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="urgency">Urgency Level</Label>
              <select
                id="urgency"
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <Label>Total Estimated Cost</Label>
              <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {calculateTotalCost().toLocaleString("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="justification">Justification *</Label>
            <Textarea
              id="justification"
              placeholder="Explain why these items are needed..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">
                Selected Items ({selectedItems.length})
              </h3>
              <div className="space-y-3">
                {selectedItems.map((item) => (
                  <div
                    key={item.inventory_item_id}
                    className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.inventory_item.name}</p>
                      <p className="text-sm text-gray-600">
                        Current: {item.inventory_item.current_stock}{" "}
                        {item.inventory_item.unit_of_measure}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.requested_quantity}
                          onChange={(e) =>
                            updateRequestItem(
                              item.inventory_item_id,
                              "requested_quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-20"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit Cost</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.estimated_unit_cost}
                          onChange={(e) =>
                            updateRequestItem(
                              item.inventory_item_id,
                              "estimated_unit_cost",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <div className="px-2 py-1 bg-white border rounded text-sm font-medium">
                          ₦
                          {(
                            item.requested_quantity * item.estimated_unit_cost
                          ).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          removeItemFromRequest(item.inventory_item_id)
                        }
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Available Items</h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading items...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-600">{item.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`text-xs ${getStockStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {item.current_stock} {item.unit_of_measure}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addItemToRequest(item)}
                      disabled={selectedItems.some(
                        (selected) => selected.inventory_item_id === item.id
                      )}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Badge className={getUrgencyColor(urgencyLevel)}>
                {urgencyLevel} priority
              </Badge>
              <span className="text-sm text-gray-600">
                {selectedItems.length} items selected
              </span>
            </div>
            <Button
              onClick={submitRequest}
              disabled={
                isSubmitting ||
                selectedItems.length === 0 ||
                !justification.trim()
              }
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
