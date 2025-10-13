"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Minus,
  X,
  Search,
  ShoppingCart,
  User,
  Phone,
  MapPin,
  CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { createOrder } from "@/actions/order-actions";
import { formatAmount } from "@/helpers/formatAmount";
import { useBusinessSettings } from "@/hooks/use-business-settings";

const orderSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  dining_option: z.enum(["indoor", "delivery"]),
  table_id: z.string().optional(),
  delivery_location_id: z.string().optional(),
  payment_method: z.enum(["cash", "wallet", "card"]),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface MenuItem {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  description?: string;
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

interface OrderItem {
  menu_item_id: number;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}

interface ReceptionOrderCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
}

export function ReceptionOrderCreationModal({
  isOpen,
  onClose,
  onOrderCreated,
}: ReceptionOrderCreationModalProps) {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<
    DeliveryLocation[]
  >([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  );
  const [itemQuantity, setItemQuantity] = useState(1);
  const [menuSearch, setMenuSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const supabase = createClient();
  const { settings: businessSettings } = useBusinessSettings();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      dining_option: "indoor",
      payment_method: "cash",
    },
  });

  const diningOption = watch("dining_option");

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to continue");
        return;
      }

      const { data: businessOwner } = await supabase
        .from("business_owner")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!businessOwner) {
        toast.error("Business profile not found");
        return;
      }

      const businessOwnerId = businessOwner.id;

      // Fetch menu items
      const { data: menuData, error: menuError } = await supabase
        .from("menu_items")
        .select("*, menu:menu_id(menu_name, owner_id)")
        .eq("status", "available")
        .eq("menu.owner_id", businessOwnerId);

      if (menuError) {
        console.error("Error fetching menu items:", menuError);
        toast.error("Could not load menu items");
      } else {
        const filteredMenuItems = (menuData || [])
          .filter((item: any) => item.menu?.owner_id === businessOwnerId)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image_url: item.image_url,
            description: item.description,
          }));
        setMenuItems(filteredMenuItems);
      }

      // Fetch available tables
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("id, table_number, capacity, status")
        .eq("restaurant_id", businessOwnerId)
        .eq("status", "available");

      if (tablesError) {
        console.error("Error fetching tables:", tablesError);
        toast.error("Could not load table information");
      } else {
        setTables(tablesData || []);
      }

      // Fetch delivery locations
      const { data: locationsData, error: locationsError } = await supabase
        .from("delivery_locations")
        .select("id, name, price")
        .eq("business_id", businessOwnerId);

      if (locationsError) {
        console.error("Error fetching delivery locations:", locationsError);
        toast.error("Could not load delivery locations");
      } else {
        setDeliveryLocations(locationsData || []);
      }

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email, address")
        .eq("business_id", businessOwnerId)
        .order("name");

      if (customersError) {
        console.error("Error fetching customers:", customersError);
        toast.error("Could not load customer data");
      } else {
        setCustomers(customersData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Could not load form data");
    } finally {
      setDataLoading(false);
    }
  }, [supabase]);

  // Add item to order
  const addItemToOrder = useCallback(() => {
    if (!selectedMenuItem) return;

    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.menu_item_id === selectedMenuItem.id
      );

      if (existingItem) {
        return prevItems.map((item) =>
          item.menu_item_id === selectedMenuItem.id
            ? {
                ...item,
                quantity: item.quantity + itemQuantity,
                total_price:
                  (item.quantity + itemQuantity) * item.menu_item_price,
              }
            : item
        );
      } else {
        return [
          ...prevItems,
          {
            menu_item_id: selectedMenuItem.id,
            menu_item_name: selectedMenuItem.name,
            menu_item_price: selectedMenuItem.price,
            quantity: itemQuantity,
            total_price: selectedMenuItem.price * itemQuantity,
            image_url: selectedMenuItem.image_url,
          },
        ];
      }
    });

    setSelectedMenuItem(null);
    setItemQuantity(1);
  }, [selectedMenuItem, itemQuantity]);

  // Remove item from order
  const removeItemFromOrder = useCallback((menuItemId: number) => {
    setSelectedItems((prevItems) =>
      prevItems.filter((item) => item.menu_item_id !== menuItemId)
    );
  }, []);

  // Update item quantity
  const updateItemQuantity = useCallback(
    (menuItemId: number, newQuantity: number) => {
      if (newQuantity <= 0) {
        removeItemFromOrder(menuItemId);
        return;
      }

      setSelectedItems((prevItems) =>
        prevItems.map((item) =>
          item.menu_item_id === menuItemId
            ? {
                ...item,
                quantity: newQuantity,
                total_price: item.menu_item_price * newQuantity,
              }
            : item
        )
      );
    },
    [removeItemFromOrder]
  );

  // Select customer
  const selectCustomer = useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer);
      setValue("customer_name", customer.name);
      setValue("customer_phone", customer.phone || "");
      setValue("customer_address", customer.address || "");
      setCustomerSearch("");
    },
    [setValue]
  );

  // Calculate totals
  const totals = {
    subtotal: selectedItems.reduce((sum, item) => sum + item.total_price, 0),
    vat: 0,
    serviceCharge: 0,
    total: 0,
  };

  if (businessSettings) {
    const vatRate = businessSettings.vat_rate ?? 7.5;
    const serviceChargeRate = businessSettings.service_charge_rate ?? 2.5;

    totals.vat = Math.round(totals.subtotal * (vatRate / 100));
    totals.serviceCharge = Math.round(
      totals.subtotal * (serviceChargeRate / 100)
    );
    totals.total = totals.subtotal + totals.vat + totals.serviceCharge;
  }

  // Filter menu items based on search
  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (customer.phone && customer.phone.includes(customerSearch))
  );

  // Submit order
  const onSubmit = useCallback(
    async (data: OrderFormData) => {
      if (selectedItems.length === 0) {
        toast.error("Please add at least one item to the order");
        return;
      }

      setLoading(true);
      try {
        const orderData = {
          ...data,
          items: selectedItems,
          subtotal: totals.subtotal,
          vat_amount: totals.vat,
          service_charge: totals.serviceCharge,
          total_amount: totals.total,
          vat_rate: businessSettings?.vat_rate ?? 7.5,
          service_charge_rate: businessSettings?.service_charge_rate ?? 2.5,
          takeaway_packs: 0,
          takeaway_pack_price: 0,
          delivery_fee: 0,
        };

        const result = await createOrder(orderData);

        if (result?.orderId) {
          toast.success("Order created successfully!");
          onOrderCreated(result.orderId);
          handleClose();
        }
      } catch (error) {
        console.error("Error creating order:", error);
        toast.error("Failed to create order");
      } finally {
        setLoading(false);
      }
    },
    [selectedItems, totals, businessSettings, onOrderCreated]
  );

  // Handle modal close
  const handleClose = useCallback(() => {
    reset();
    setSelectedItems([]);
    setSelectedMenuItem(null);
    setSelectedCustomer(null);
    setMenuSearch("");
    setCustomerSearch("");
    setItemQuantity(1);
    onClose();
  }, [reset, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create New Order
          </DialogTitle>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading order form...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
              {/* Left Column - Customer & Order Details */}
              <div className="space-y-4">
                {/* Customer Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Customer Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search existing customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>

                    {/* Customer Search Results */}
                    {customerSearch && filteredCustomers.length > 0 && (
                      <ScrollArea className="h-32 border rounded-md p-2">
                        {filteredCustomers.slice(0, 5).map((customer) => (
                          <div
                            key={customer.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer rounded"
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
                      </ScrollArea>
                    )}

                    {/* Customer Form Fields */}
                    <div>
                      <Label htmlFor="customer_name">Customer Name *</Label>
                      <Input
                        id="customer_name"
                        {...register("customer_name")}
                        placeholder="Enter customer name"
                      />
                      {errors.customer_name && (
                        <p className="text-sm text-red-500">
                          {errors.customer_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="customer_phone">Phone Number</Label>
                      <Input
                        id="customer_phone"
                        {...register("customer_phone")}
                        placeholder="Enter phone number"
                      />
                    </div>

                    {diningOption === "delivery" && (
                      <div>
                        <Label htmlFor="customer_address">
                          Delivery Address
                        </Label>
                        <Textarea
                          id="customer_address"
                          {...register("customer_address")}
                          placeholder="Enter delivery address"
                          rows={2}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Order Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="dining_option">Dining Option *</Label>
                      <Select
                        value={diningOption}
                        onValueChange={(value) =>
                          setValue(
                            "dining_option",
                            value as "indoor" | "delivery"
                          )
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
                        <Label htmlFor="table_id">Select Table</Label>
                        <Select
                          onValueChange={(value) => setValue("table_id", value)}
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
                        <Label htmlFor="delivery_location_id">
                          Delivery Location
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            setValue("delivery_location_id", value)
                          }
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
                      <Label htmlFor="payment_method">Payment Method *</Label>
                      <Select
                        onValueChange={(value) =>
                          setValue(
                            "payment_method",
                            value as "cash" | "wallet" | "card"
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="notes">Special Instructions</Label>
                      <Textarea
                        id="notes"
                        {...register("notes")}
                        placeholder="Any special requests or notes..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Menu Items & Order Summary */}
              <div className="space-y-4">
                {/* Menu Items Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Menu Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Menu Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search menu items..."
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>

                    {/* Menu Item Selection */}
                    <div className="flex gap-2">
                      <Select
                        value={selectedMenuItem?.id.toString() || ""}
                        onValueChange={(value) => {
                          const item = menuItems.find(
                            (item) => item.id.toString() === value
                          );
                          setSelectedMenuItem(item || null);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Choose menu item" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredMenuItems.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={item.id.toString()}
                            >
                              {item.name} - {formatAmount(item.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) =>
                          setItemQuantity(Number(e.target.value))
                        }
                        className="w-20"
                        placeholder="Qty"
                      />

                      <Button
                        type="button"
                        onClick={addItemToOrder}
                        disabled={!selectedMenuItem}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Selected Items */}
                    {selectedItems.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Order Items
                        </Label>
                        <ScrollArea className="h-48 border rounded-md p-2">
                          {selectedItems.map((item) => (
                            <div
                              key={item.menu_item_id}
                              className="flex items-center justify-between p-2 border-b last:border-b-0"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {item.menu_item_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatAmount(item.menu_item_price)} each
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateItemQuantity(
                                      item.menu_item_id,
                                      item.quantity - 1
                                    )
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm">
                                  {item.quantity}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateItemQuantity(
                                      item.menu_item_id,
                                      item.quantity + 1
                                    )
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <span className="font-medium text-sm w-16 text-right">
                                  {formatAmount(item.total_price)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeItemFromOrder(item.menu_item_id)
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Summary */}
                {selectedItems.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatAmount(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>VAT ({businessSettings?.vat_rate ?? 7.5}%):</span>
                        <span>{formatAmount(totals.vat)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>
                          Service Charge (
                          {businessSettings?.service_charge_rate ?? 2.5}%):
                        </span>
                        <span>{formatAmount(totals.serviceCharge)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>{formatAmount(totals.total)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedItems.length === 0}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Order"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
