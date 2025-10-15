"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingCart,
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Minus,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/components/ui/dialog";
// Pagination component imports removed - using custom pagination
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { MenuGrid } from "@/components/menu-grid/MenuGrid";
import { MenuItemCard } from "@/components/menu-grid/MenuItemCard";
import { MenuGridSkeleton } from "@/components/menu-grid/MenuGridSkeleton";
import { useOrderState } from "@/hooks/use-order-state";
import { useBusinessSettings } from "@/hooks/use-business-settings";
import { formatAmount } from "@/helpers/formatAmount";
import { createOrder } from "@/actions/order-actions";
import { fetchMenu } from "@/data/menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Types
interface MenuItem {
  id: number;
  menu_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  created_at?: string;
  profile_image_url?: string;
  status?: "available" | "unavailable";
  menu_name?: string;
}

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  status: string;
}

interface DeliveryLocation {
  id: string;
  name: string;
  price: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface StaffMenuGridOrderInterfaceProps {
  businessId: string;
  staffRole: "reception" | "bar" | "kitchen" | "accountant";
  onOrderCreated?: (orderId: string) => void;
  className?: string;
}

export function StaffMenuGridOrderInterface({
  businessId,
  staffRole,
  onOrderCreated,
  className,
}: StaffMenuGridOrderInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Order form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [diningOption, setDiningOption] = useState<"indoor" | "delivery">(
    "indoor"
  );
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [selectedDeliveryLocationId, setSelectedDeliveryLocationId] =
    useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "wallet" | "card"
  >("cash");
  const [orderNotes, setOrderNotes] = useState("");

  // Data state
  const [tables, setTables] = useState<Table[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<
    DeliveryLocation[]
  >([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const supabase = createClient();
  const { settings: businessSettings } = useBusinessSettings();

  // Order state management
  const {
    orderItems,
    isOrderPanelVisible,
    addItem,
    updateQuantity,
    removeItem,
    clearOrder,
    toggleOrderPanel,
    calculations,
    itemCount,
  } = useOrderState({
    vatRate: businessSettings?.vat_rate ?? 7.5,
    serviceChargeRate: businessSettings?.service_charge_rate ?? 2.5,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Reduced from 100 for better performance

  // Fetch menu data with pagination
  const {
    data: menuData,
    isLoading: menuLoading,
    isError: menuError,
    refetch: refetchMenu,
  } = useQuery({
    queryKey: [
      "staff-menu",
      businessId,
      searchQuery,
      selectedCategory,
      currentPage,
    ],
    queryFn: async () => {
      const result = await fetchMenu({
        page: currentPage,
        perPage: itemsPerPage,
        ownerId: businessId,
        search: searchQuery || undefined,
      });
      return result;
    },
    placeholderData: keepPreviousData,
  });

  // Fetch supporting data
  useEffect(() => {
    fetchSupportingData();
  }, [businessId]);

  const fetchSupportingData = async () => {
    try {
      // Fetch tables
      const { data: tablesData } = await supabase
        .from("tables")
        .select("id, table_number, capacity, status")
        .eq("restaurant_id", businessId)
        .eq("status", "available");

      setTables(tablesData || []);

      // Fetch delivery locations
      const { data: locationsData } = await supabase
        .from("delivery_locations")
        .select("id, name, price")
        .eq("business_id", businessId);

      setDeliveryLocations(locationsData || []);

      // Fetch customers
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name, phone, email, address")
        .eq("business_id", businessId)
        .order("name");

      setCustomers(customersData || []);

      // Extract categories from menu data
      if (menuData?.data) {
        const uniqueCategories = Array.from(
          new Set(
            menuData.data
              .map((item) => item.menu_name)
              .filter((name): name is string => Boolean(name))
          )
        );
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Error fetching supporting data:", error);
    }
  };

  // Filter menu items
  const filteredMenuItems =
    menuData?.data?.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || item.menu_name === selectedCategory;
      const isAvailable = item.status !== "unavailable";
      return matchesSearch && matchesCategory && isAvailable;
    }) || [];

  // Handle menu item click
  const handleMenuItemClick = useCallback(
    (item: MenuItem) => {
      addItem(item);
      toast.success(`${item.name} added to order`);
    },
    [addItem]
  );

  // Handle order completion
  const handleCompleteOrder = useCallback(() => {
    if (orderItems.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
    setIsOrderModalOpen(true);
  }, [orderItems]);

  // Submit order
  const handleSubmitOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (diningOption === "indoor" && !selectedTableId) {
      toast.error("Please select a table for indoor dining");
      return;
    }

    if (diningOption === "delivery" && !selectedDeliveryLocationId) {
      toast.error("Please select a delivery location");
      return;
    }

    setIsLoading(true);
    try {
      const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone || undefined,
        customer_address: customerAddress || undefined,
        dining_option: diningOption,
        table_id: diningOption === "indoor" ? selectedTableId : undefined,
        delivery_location_id:
          diningOption === "delivery" ? selectedDeliveryLocationId : undefined,
        payment_method: paymentMethod,
        notes: orderNotes || undefined,
        items: orderItems,
        subtotal: calculations.subtotal,
        vat_amount: calculations.vatAmount,
        service_charge: calculations.serviceChargeAmount,
        total_amount: calculations.total,
        vat_rate: calculations.vatRate,
        service_charge_rate: calculations.serviceChargeRate,
        takeaway_packs: 0,
        takeaway_pack_price: 0,
        delivery_fee:
          diningOption === "delivery"
            ? deliveryLocations.find(
                (loc) => loc.id === selectedDeliveryLocationId
              )?.price || 0
            : 0,
      };

      const result = await createOrder(orderData);

      if (result?.orderId) {
        toast.success("Order created successfully!");
        clearOrder();
        setIsOrderModalOpen(false);
        resetOrderForm();
        onOrderCreated?.(result.orderId);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    } finally {
      setIsLoading(false);
    }
  };

  const resetOrderForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setDiningOption("indoor");
    setSelectedTableId("");
    setSelectedDeliveryLocationId("");
    setPaymentMethod("cash");
    setOrderNotes("");
  };

  // Calculate pagination
  const totalItems = menuData?.items || 0;
  const totalPages = menuData?.pages || 1;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Reset to first page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header and Controls - Compact */}
      <Card className="mb-4">
        <CardContent className="p-4">
          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {totalItems} items
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            <span>
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Menu Grid Section */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Menu Items Display */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="p-4 flex-1 flex flex-col min-h-0">
              {menuLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-card border rounded-lg overflow-hidden animate-pulse flex flex-col"
                    >
                      {/* Compact Image Skeleton */}
                      <div className="aspect-square w-full bg-muted relative">
                        <div className="absolute top-1 right-1 w-4 h-4 bg-muted-foreground/20 rounded-full"></div>
                      </div>
                      {/* Compact Content Skeleton */}
                      <div className="p-2 flex-1 flex flex-col space-y-1">
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                        <div className="h-2 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-2/3 mt-auto"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : menuError ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Failed to load menu items
                  </p>
                  <Button onClick={() => refetchMenu()}>Try Again</Button>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No menu items found</p>
                </div>
              ) : (
                <>
                  {/* Compact Menu Grid */}
                  <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {filteredMenuItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleMenuItemClick(item)}
                          className="group cursor-pointer bg-card border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.02] flex flex-col"
                        >
                          {/* Compact Image */}
                          <div className="aspect-square w-full bg-muted relative overflow-hidden">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <span className="text-2xl">🍽️</span>
                              </div>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-1 right-1">
                              <Badge
                                variant={
                                  item.status === "available"
                                    ? "default"
                                    : "destructive"
                                }
                                className="text-xs px-1 py-0"
                              >
                                {item.status === "available" ? "✓" : "✗"}
                              </Badge>
                            </div>

                            {/* Add Button Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                  <Plus className="h-4 w-4 text-primary-foreground" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Compact Content */}
                          <div className="p-2 flex-1 flex flex-col">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">
                              {item.name}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                              {item.menu_name}
                            </p>
                            <div className="mt-auto">
                              <p className="font-bold text-primary text-sm">
                                {formatAmount(item.price)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={!hasPrevPage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    currentPage === pageNum
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="w-8 h-8 p-0"
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={!hasNextPage}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fixed Order Panel */}
        <div className="w-full lg:w-80 xl:w-96">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                Order
                {itemCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {itemCount}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {orderItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground mb-3" />
                  <h4 className="font-medium mb-1">No items selected</h4>
                  <p className="text-sm text-muted-foreground">
                    Click on menu items to add them
                  </p>
                </div>
              ) : (
                <>
                  {/* Order Items - Scrollable */}
                  <ScrollArea className="flex-1 px-4">
                    <div className="space-y-2 py-2">
                      {orderItems.map((item) => (
                        <div
                          key={item.menu_item_id}
                          className="flex items-center gap-2 p-2 border rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {item.menu_item_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {formatAmount(item.menu_item_price)} each
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                updateQuantity(
                                  item.menu_item_id,
                                  item.quantity - 1
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                updateQuantity(
                                  item.menu_item_id,
                                  item.quantity + 1
                                )
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="text-right min-w-0">
                            <p className="font-medium text-sm">
                              {formatAmount(item.total_price)}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => removeItem(item.menu_item_id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Fixed Order Summary */}
                  <div className="border-t bg-card">
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatAmount(calculations.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>VAT ({calculations.vatRate}%):</span>
                        <span>{formatAmount(calculations.vatAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>
                          Service Charge ({calculations.serviceChargeRate}%):
                        </span>
                        <span>
                          {formatAmount(calculations.serviceChargeAmount)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total:</span>
                        <span>{formatAmount(calculations.total)}</span>
                      </div>
                    </div>

                    {/* Fixed Action Buttons */}
                    <div className="p-4 pt-0 space-y-2">
                      <Button
                        onClick={handleCompleteOrder}
                        className="w-full"
                        size="lg"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Complete Order
                      </Button>
                      <Button
                        variant="outline"
                        onClick={clearOrder}
                        className="w-full"
                      >
                        Clear Order
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Completion Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Customer Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            {/* Order Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Order Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="diningOption">Dining Option</Label>
                  <Select
                    value={diningOption}
                    onValueChange={(value: "indoor" | "delivery") =>
                      setDiningOption(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Indoor Dining</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {diningOption === "indoor" && (
                  <div>
                    <Label htmlFor="table">Select Table</Label>
                    <Select
                      value={selectedTableId}
                      onValueChange={setSelectedTableId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a table" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            Table {table.table_number} (Capacity:{" "}
                            {table.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {diningOption === "delivery" && (
                  <div>
                    <Label htmlFor="deliveryLocation">Delivery Location</Label>
                    <Select
                      value={selectedDeliveryLocationId}
                      onValueChange={setSelectedDeliveryLocationId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose delivery location" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveryLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} - {formatAmount(location.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value: "cash" | "wallet" | "card") =>
                      setPaymentMethod(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {diningOption === "delivery" && (
                <div>
                  <Label htmlFor="customerAddress">Delivery Address</Label>
                  <Textarea
                    id="customerAddress"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Enter delivery address"
                    rows={2}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="orderNotes">Special Instructions</Label>
                <Textarea
                  id="orderNotes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any special requests or notes..."
                  rows={2}
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatAmount(calculations.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT ({calculations.vatRate}%):</span>
                  <span>{formatAmount(calculations.vatAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Service Charge ({calculations.serviceChargeRate}%):
                  </span>
                  <span>{formatAmount(calculations.serviceChargeAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>{formatAmount(calculations.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOrderModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitOrder} disabled={isLoading}>
              {isLoading ? "Creating Order..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
