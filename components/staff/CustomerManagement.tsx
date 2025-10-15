"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit,
  Plus,
  Calendar,
  ShoppingBag,
  DollarSign,
  Clock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { formatAmount } from "@/helpers/formatAmount";

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  total_orders?: number;
  total_spent?: number;
  last_order_date?: string;
  favorite_items?: string[];
}

interface CustomerOrder {
  id: string;
  invoice_no: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: Array<{
    menu_item_name: string;
    quantity: number;
    menu_item_price: number;
  }>;
  payment_method?: string;
  dining_option?: string;
}

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface CustomerManagementProps {
  businessId: string;
  onCustomerSelect?: (customer: Customer) => void;
  onOrderView?: (orderId: string) => void;
}

export function CustomerManagement({
  businessId,
  onCustomerSelect,
  onOrderView,
}: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const supabase = createClient();

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, [businessId]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch customers with aggregated order data
      const { data: customersData, error } = await supabase
        .from("customers")
        .select(
          `
          id,
          name,
          phone,
          email,
          address,
          created_at,
          orders!inner(id, total_amount, created_at, status)
        `
        )
        .eq("business_id", businessId)
        .order("name");

      if (error) {
        console.warn("Customers not available:", error.message);
        setCustomers([]);
        return;
      }

      // Transform data to include aggregated statistics
      const transformedCustomers = (customersData || []).map(
        (customer: any) => {
          const orders = customer.orders || [];
          const completedOrders = orders.filter(
            (order: any) =>
              order.status === "completed" || order.status === "delivered"
          );

          return {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            created_at: customer.created_at,
            total_orders: orders.length,
            total_spent: completedOrders.reduce(
              (sum: number, order: any) => sum + (order.total_amount || 0),
              0
            ),
            last_order_date:
              orders.length > 0
                ? orders.sort(
                    (a: any, b: any) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )[0].created_at
                : null,
          };
        }
      );

      setCustomers(transformedCustomers);
    } catch (error) {
      console.warn("Customer data may not be available:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, supabase]);

  // Fetch customer orders
  const fetchCustomerOrders = useCallback(
    async (customerId: string) => {
      setOrdersLoading(true);
      try {
        const { data: ordersData, error } = await supabase
          .from("orders")
          .select(
            `
          id,
          invoice_no,
          total_amount,
          status,
          created_at,
          payment_method,
          dining_option,
          items:order_items(
            menu_item_name,
            quantity,
            menu_item_price
          )
        `
          )
          .eq("business_id", businessId)
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching customer orders:", error);
          toast.error("Could not load customer orders");
          return;
        }

        setCustomerOrders(ordersData || []);
      } catch (error) {
        console.error("Error fetching customer orders:", error);
        toast.error("Could not load customer orders");
      } finally {
        setOrdersLoading(false);
      }
    },
    [businessId, supabase]
  );

  // Create customer
  const handleCreateCustomer = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          business_id: businessId,
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating customer:", error);
        toast.error("Failed to create customer");
        return;
      }

      toast.success("Customer created successfully!");
      setIsCreateModalOpen(false);
      setFormData({ name: "", phone: "", email: "", address: "" });
      fetchCustomers();
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("Failed to create customer");
    }
  }, [formData, businessId, supabase, fetchCustomers]);

  // Update customer
  const handleUpdateCustomer = useCallback(async () => {
    if (!selectedCustomer || !formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCustomer.id);

      if (error) {
        console.error("Error updating customer:", error);
        toast.error("Failed to update customer");
        return;
      }

      toast.success("Customer updated successfully!");
      setIsEditModalOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer");
    }
  }, [selectedCustomer, formData, supabase, fetchCustomers]);

  // Open customer details
  const handleViewCustomerDetails = useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer);
      fetchCustomerOrders(customer.id);
      setIsDetailsModalOpen(true);
    },
    [fetchCustomerOrders]
  );

  // Open edit modal
  const handleEditCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setIsEditModalOpen(true);
  }, []);

  // Open create modal
  const handleCreateNew = useCallback(() => {
    setFormData({ name: "", phone: "", email: "", address: "" });
    setIsCreateModalOpen(true);
  }, []);

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchQuery)) ||
      (customer.email &&
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "preparing":
      case "ready":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading customers...</p>
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Management
            </CardTitle>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onCustomerSelect?.(customer)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {customer.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold text-lg">
                          {customer.name}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {customer.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCustomerDetails(customer);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCustomer(customer);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>

                      {/* Customer Stats */}
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-3 w-3" />
                          {customer.total_orders || 0} orders
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3" />
                          {formatAmount(customer.total_spent || 0)} spent
                        </div>
                        {customer.last_order_date && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Last:{" "}
                            {new Date(
                              customer.last_order_date
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No customers found matching your search"
                  : "No customers found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Add your first customer to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Customer Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="create_name">Customer Name *</Label>
              <Input
                id="create_name"
                placeholder="Enter customer name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="create_phone">Phone Number</Label>
              <Input
                id="create_phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="create_email">Email Address</Label>
              <Input
                id="create_email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="create_address">Address</Label>
              <Textarea
                id="create_address"
                placeholder="Enter customer address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer}>Create Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Customer Name *</Label>
              <Input
                id="edit_name"
                placeholder="Enter customer name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit_phone">Phone Number</Label>
              <Input
                id="edit_phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit_email">Email Address</Label>
              <Input
                id="edit_email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit_address">Address</Label>
              <Textarea
                id="edit_address"
                placeholder="Enter customer address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer}>Update Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Details - {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="orders">Order History</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedCustomer.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedCustomer.phone || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedCustomer.email || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          Customer Since
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(
                            selectedCustomer.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {selectedCustomer.address && (
                      <div>
                        <Label className="text-sm font-medium">Address</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedCustomer.address}
                        </p>
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedCustomer.total_orders || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Orders
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatAmount(selectedCustomer.total_spent || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Spent
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedCustomer.last_order_date
                            ? new Date(
                                selectedCustomer.last_order_date
                              ).toLocaleDateString()
                            : "Never"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Last Order
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2">Loading orders...</span>
                      </div>
                    ) : customerOrders.length > 0 ? (
                      <ScrollArea className="h-96">
                        <div className="space-y-4">
                          {customerOrders.map((order) => (
                            <Card key={order.id} className="border">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <div className="font-semibold">
                                      Order #{order.invoice_no}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(
                                        order.created_at
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-lg">
                                      {formatAmount(order.total_amount)}
                                    </div>
                                    <Badge
                                      className={getStatusColor(order.status)}
                                    >
                                      {order.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-sm">
                                    <strong>Items:</strong>
                                  </div>
                                  {order.items.map((item, index) => (
                                    <div
                                      key={index}
                                      className="text-sm text-muted-foreground pl-4"
                                    >
                                      {item.quantity}x {item.menu_item_name} -{" "}
                                      {formatAmount(item.menu_item_price)}
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                  <div className="text-sm text-muted-foreground">
                                    {order.payment_method && (
                                      <span>
                                        Payment: {order.payment_method}
                                      </span>
                                    )}
                                    {order.dining_option && (
                                      <span className="ml-4">
                                        Type: {order.dining_option}
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOrderView?.(order.id)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Details
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No orders found</p>
                        <p className="text-sm text-muted-foreground">
                          This customer hasn't placed any orders yet
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
