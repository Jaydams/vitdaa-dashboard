"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  Clock,
  MapPin,
  Phone,
  Eye,
  UserPlus,
  CheckCircle,
  XCircle,
  RotateCcw,
  GripVertical,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  customer_name?: string;
  customer_phone?: string;
  party_size?: number;
  seated_at?: string;
  order_id?: string;
  order_total?: number;
  location?: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface TableAssignment {
  customer_name: string;
  customer_phone?: string;
  party_size: number;
  notes?: string;
}

interface TableManagementGridProps {
  businessId: string;
  onTableUpdate?: (tableId: string, status: string) => void;
  onOrderView?: (orderId: string) => void;
}

export function TableManagementGrid({
  businessId,
  onTableUpdate,
  onOrderView,
}: TableManagementGridProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState<TableAssignment>({
    customer_name: "",
    customer_phone: "",
    party_size: 1,
    notes: "",
  });
  const [customerSearch, setCustomerSearch] = useState("");

  const supabase = createClient();

  // Fetch tables and customers
  useEffect(() => {
    fetchTablesAndCustomers();
    setupRealtimeSubscription();
  }, [businessId]);

  const fetchTablesAndCustomers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch tables with current assignments
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select(
          `
          id,
          table_number,
          capacity,
          status,
          customer_name,
          customer_phone,
          party_size,
          seated_at,
          order_id,
          location,
          orders!inner(id, total_amount, status)
        `
        )
        .eq("restaurant_id", businessId)
        .order("table_number");

      if (tablesError) {
        console.error("Error fetching tables:", tablesError);
        toast.error("Could not load table information");
      } else {
        const transformedTables = (tablesData || []).map((table: any) => ({
          id: table.id,
          table_number: table.table_number,
          capacity: table.capacity,
          status: table.status,
          customer_name: table.customer_name,
          customer_phone: table.customer_phone,
          party_size: table.party_size,
          seated_at: table.seated_at,
          order_id: table.order_id,
          order_total: table.orders?.[0]?.total_amount || 0,
          location: table.location,
        }));
        setTables(transformedTables);
      }

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("business_id", businessId)
        .order("name");

      if (customersError) {
        console.error("Error fetching customers:", customersError);
        toast.error("Could not load customer data");
      } else {
        setCustomers(customersData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Could not load table data");
    } finally {
      setLoading(false);
    }
  }, [businessId, supabase]);

  const setupRealtimeSubscription = useCallback(() => {
    const channel = supabase
      .channel("table-management-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          console.log("Table realtime change:", payload);
          fetchTablesAndCustomers();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Order realtime change:", payload);
          fetchTablesAndCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchTablesAndCustomers]);

  // Assign table to customer
  const handleTableAssign = useCallback(
    async (tableId: string, assignment: TableAssignment) => {
      try {
        const { error } = await supabase
          .from("tables")
          .update({
            status: "occupied",
            customer_name: assignment.customer_name,
            customer_phone: assignment.customer_phone,
            party_size: assignment.party_size,
            seated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", tableId);

        if (error) {
          console.error("Error assigning table:", error);
          toast.error("Failed to assign table");
          return;
        }

        // Create customer record if it doesn't exist
        if (assignment.customer_name && assignment.customer_phone) {
          const { error: customerError } = await supabase
            .from("customers")
            .upsert(
              {
                business_id: businessId,
                name: assignment.customer_name,
                phone: assignment.customer_phone,
              },
              {
                onConflict: "business_id,phone",
                ignoreDuplicates: false,
              }
            );

          if (customerError) {
            console.error("Error creating customer:", customerError);
            // Don't fail the table assignment if customer creation fails
          }
        }

        toast.success("Table assigned successfully!");
        onTableUpdate?.(tableId, "occupied");
        fetchTablesAndCustomers();
      } catch (error) {
        console.error("Error assigning table:", error);
        toast.error("Failed to assign table");
      }
    },
    [businessId, supabase, onTableUpdate, fetchTablesAndCustomers]
  );

  // Update table status
  const handleTableStatusUpdate = useCallback(
    async (tableId: string, status: string) => {
      try {
        const updateData: any = {
          status,
          updated_at: new Date().toISOString(),
        };

        // Clear customer data when table becomes available
        if (status === "available") {
          updateData.customer_name = null;
          updateData.customer_phone = null;
          updateData.party_size = null;
          updateData.seated_at = null;
          updateData.order_id = null;
        }

        const { error } = await supabase
          .from("tables")
          .update(updateData)
          .eq("id", tableId);

        if (error) {
          console.error("Error updating table status:", error);
          toast.error("Failed to update table status");
          return;
        }

        toast.success(`Table status updated to ${status}`);
        onTableUpdate?.(tableId, status);
        fetchTablesAndCustomers();
      } catch (error) {
        console.error("Error updating table status:", error);
        toast.error("Failed to update table status");
      }
    },
    [supabase, onTableUpdate, fetchTablesAndCustomers]
  );

  // Open assignment modal
  const openAssignModal = useCallback((table: Table) => {
    setSelectedTable(table);
    setAssignmentData({
      customer_name: "",
      customer_phone: "",
      party_size: 1,
      notes: "",
    });
    setCustomerSearch("");
    setIsAssignModalOpen(true);
  }, []);

  // Select customer from search
  const selectCustomer = useCallback((customer: Customer) => {
    setAssignmentData((prev) => ({
      ...prev,
      customer_name: customer.name,
      customer_phone: customer.phone || "",
    }));
    setCustomerSearch("");
  }, []);

  // Submit table assignment
  const handleAssignSubmit = useCallback(() => {
    if (!selectedTable || !assignmentData.customer_name) {
      toast.error("Please enter customer name");
      return;
    }

    handleTableAssign(selectedTable.id, assignmentData);
    setIsAssignModalOpen(false);
  }, [selectedTable, assignmentData, handleTableAssign]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "occupied":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "reserved":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "cleaning":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4" />;
      case "occupied":
        return <Users className="h-4 w-4" />;
      case "reserved":
        return <Clock className="h-4 w-4" />;
      case "cleaning":
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (customer.phone && customer.phone.includes(customerSearch))
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Table Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading tables...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Table Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => (
              <Card
                key={table.id}
                className={`relative transition-all duration-200 hover:shadow-md ${
                  table.status === "available"
                    ? "border-green-200 hover:border-green-300"
                    : table.status === "occupied"
                    ? "border-red-200 hover:border-red-300"
                    : table.status === "reserved"
                    ? "border-yellow-200 hover:border-yellow-300"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          T{table.table_number}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">
                          Table {table.table_number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Capacity: {table.capacity}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(table.status)}>
                      {getStatusIcon(table.status)}
                      <span className="ml-1 capitalize">{table.status}</span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Customer Information */}
                  {table.customer_name && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {table.customer_name}
                        </span>
                      </div>
                      {table.customer_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {table.customer_phone}
                          </span>
                        </div>
                      )}
                      {table.party_size && (
                        <div className="text-sm text-muted-foreground">
                          Party of {table.party_size}
                        </div>
                      )}
                      {table.seated_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Seated:{" "}
                            {new Date(table.seated_at).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Information */}
                  {table.order_id && table.order_total && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Order Total: ₦{table.order_total.toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Order ID: {table.order_id}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {table.status === "available" && (
                      <Button
                        size="sm"
                        onClick={() => openAssignModal(table)}
                        className="flex-1"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    )}

                    {table.status === "occupied" && (
                      <>
                        {table.order_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOrderView?.(table.order_id!)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Order
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleTableStatusUpdate(table.id, "cleaning")
                          }
                          className="flex-1"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      </>
                    )}

                    {table.status === "cleaning" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleTableStatusUpdate(table.id, "available")
                        }
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Clean
                      </Button>
                    )}

                    {table.status === "reserved" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleTableStatusUpdate(table.id, "occupied")
                          }
                          className="flex-1"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Seat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleTableStatusUpdate(table.id, "available")
                          }
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {tables.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tables found</p>
              <p className="text-sm text-muted-foreground">
                Add tables in your restaurant settings to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Assignment Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Table {selectedTable?.table_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Search */}
            <div>
              <Label htmlFor="customer_search">Search Existing Customer</Label>
              <Input
                id="customer_search"
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerSearch && filteredCustomers.length > 0 && (
                <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
                  {filteredCustomers.slice(0, 5).map((customer) => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => selectCustomer(customer)}
                    >
                      <div className="font-medium">{customer.name}</div>
                      {customer.phone && (
                        <div className="text-sm text-muted-foreground">
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div>
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                placeholder="Enter customer name"
                value={assignmentData.customer_name}
                onChange={(e) =>
                  setAssignmentData((prev) => ({
                    ...prev,
                    customer_name: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="customer_phone">Phone Number</Label>
              <Input
                id="customer_phone"
                placeholder="Enter phone number"
                value={assignmentData.customer_phone}
                onChange={(e) =>
                  setAssignmentData((prev) => ({
                    ...prev,
                    customer_phone: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="party_size">Party Size</Label>
              <Select
                value={assignmentData.party_size.toString()}
                onValueChange={(value) =>
                  setAssignmentData((prev) => ({
                    ...prev,
                    party_size: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: selectedTable?.capacity || 8 },
                    (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1} {i === 0 ? "person" : "people"}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit}>Assign Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
