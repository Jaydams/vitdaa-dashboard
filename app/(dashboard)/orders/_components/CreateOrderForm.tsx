"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Minus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { createOrder } from "@/actions/order-actions";
import { formatAmount } from "@/helpers/formatAmount";
import { useBusinessSettings } from "@/hooks/use-business-settings";

const createOrderSchema = z
  .object({
    customer_name: z.string().optional(),
    customer_phone: z.string().optional(),
    customer_address: z.string().optional(),
    dining_option: z.enum(["indoor", "delivery"]),
    table_id: z.string().optional(),
    takeaway_packs: z.number().min(0),
    takeaway_pack_price: z.number().min(0),
    delivery_location_id: z.string().optional(),
    delivery_fee: z.number().min(0),
    rider_name: z.string().optional(),
    rider_phone: z.string().optional(),
    payment_method: z.enum(["cash", "wallet", "card"]),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.dining_option === "delivery") {
        return data.customer_name && data.customer_name.trim().length > 0;
      }
      return true;
    },
    {
      message: "Customer name is required for delivery orders",
      path: ["customer_name"],
    }
  )
  .refine(
    (data) => {
      if (data.dining_option === "delivery") {
        return data.customer_phone && data.customer_phone.trim().length > 0;
      }
      return true;
    },
    {
      message: "Customer phone is required for delivery orders",
      path: ["customer_phone"],
    }
  );

type CreateOrderFormData = z.infer<typeof createOrderSchema>;

interface MenuItem {
  id: number;
  name: string;
  price: number;
  image_url?: string;
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

interface OrderItem {
  menu_item_id: number;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}

interface CreateOrderFormProps {
  onSuccess: () => void;
  initialItems?: OrderItem[];
}

export function CreateOrderForm({
  onSuccess,
  initialItems = [],
}: CreateOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<
    DeliveryLocation[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>(initialItems);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  );
  const [itemQuantity, setItemQuantity] = useState(1);

  // Memoized Supabase client to prevent re-creation on every render
  const supabase = useMemo(() => createClient(), []);

  // Ref to track if data has been loaded to prevent multiple fetches
  const dataLoaded = useRef(false);

  // Fetch business settings for dynamic VAT and service charge rates
  const { settings: businessSettings, loading: settingsLoading } =
    useBusinessSettings();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      dining_option: "indoor",
      takeaway_packs: 0,
      takeaway_pack_price: 100,
      delivery_fee: 0,
      payment_method: "cash",
    },
  });

  const diningOption = watch("dining_option");
  const takeawayPacks = watch("takeaway_packs");
  const takeawayPackPrice = watch("takeaway_pack_price");
  const watchedDeliveryFee = watch("delivery_fee");
  const paymentMethod = watch("payment_method");

  // Memoized data fetching function with stable dependencies
  const fetchData = useCallback(async () => {
    if (dataLoaded.current) return;

    setDataLoading(true);

    try {
      // Get current business owner ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to continue");
        setDataLoading(false);
        return;
      }

      // Get business owner ID for the current user
      const { data: businessOwner } = await supabase
        .from("business_owner")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!businessOwner) {
        toast.error("Business profile not found");
        setDataLoading(false);
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
        setDataLoading(false);
        return;
      }

      const filteredMenuItems = (menuData || [])
        .filter((item: any) => item.menu?.owner_id === businessOwnerId)
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
        }));

      setMenuItems(filteredMenuItems);

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

      dataLoaded.current = true;
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Could not load form data. Please refresh and try again.");
    } finally {
      setDataLoading(false);
    }
  }, []); // Empty dependency array since supabase is memoized

  useEffect(() => {
    fetchData();

    // Cleanup function
    return () => {
      dataLoaded.current = false;
    };
  }, []); // Empty dependency array since fetchData is stable

  // Update selected items when initialItems prop changes
  useEffect(() => {
    setSelectedItems(initialItems);
  }, [initialItems]);

  // Memoized event handlers to prevent unnecessary re-renders
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

  const removeItemFromOrder = useCallback((menuItemId: number) => {
    setSelectedItems((prevItems) =>
      prevItems.filter((item) => item.menu_item_id !== menuItemId)
    );
  }, []);

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

  // Memoized calculation to prevent infinite re-renders
  const totals = useMemo(() => {
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    const vatRate = businessSettings?.vat_rate ?? 7.5;
    const serviceChargeRate = businessSettings?.service_charge_rate ?? 2.5;
    const vat = Math.round(subtotal * (vatRate / 100));
    const serviceCharge = Math.round(subtotal * (serviceChargeRate / 100));
    const takeawayTotal = takeawayPacks * takeawayPackPrice;
    const deliveryFee = watchedDeliveryFee;
    const total = subtotal + vat + serviceCharge + takeawayTotal + deliveryFee;

    return {
      subtotal,
      vat,
      serviceCharge,
      takeawayTotal,
      deliveryFee,
      total,
      vatRate,
      serviceChargeRate,
    };
  }, [
    selectedItems,
    takeawayPacks,
    takeawayPackPrice,
    watchedDeliveryFee,
    businessSettings,
  ]);

  const onSubmit = useCallback(
    async (data: CreateOrderFormData) => {
      if (selectedItems.length === 0) {
        toast.error("Please add at least one item to the order");
        return;
      }

      setLoading(true);

      try {
        const orderData = {
          ...data,
          customer_name: data.customer_name?.trim() || "Walk-in Customer",
          customer_phone: data.customer_phone?.trim() || "N/A",
          customer_address: data.customer_address?.trim() || undefined,
          items: selectedItems,
          subtotal: totals.subtotal,
          vat_amount: totals.vat,
          service_charge: totals.serviceCharge,
          total_amount: totals.total,
          takeaway_packs: data.takeaway_packs,
          takeaway_pack_price: data.takeaway_pack_price,
          delivery_fee: totals.deliveryFee,
          vat_rate: totals.vatRate,
          service_charge_rate: totals.serviceChargeRate,
        };

        const result = await createOrder(orderData);
        toast.success("Order created successfully!");
        onSuccess();
      } catch (error) {
        console.error("Error creating order:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        toast.error(`Failed to create order: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    },
    [selectedItems, totals, onSuccess]
  );

  if (dataLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading form data...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customer_name">
                Customer Name {diningOption === "delivery" && "*"}
              </Label>
              <Input
                id="customer_name"
                {...register("customer_name")}
                placeholder={
                  diningOption === "delivery"
                    ? "Enter customer name (required)"
                    : "Enter customer name (optional)"
                }
              />
              {errors.customer_name && (
                <p className="text-sm text-red-500">
                  {errors.customer_name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="customer_phone">
                Phone Number {diningOption === "delivery" && "*"}
              </Label>
              <Input
                id="customer_phone"
                {...register("customer_phone")}
                placeholder={
                  diningOption === "delivery"
                    ? "Enter phone number (required)"
                    : "Enter phone number (optional)"
                }
              />
              {errors.customer_phone && (
                <p className="text-sm text-red-500">
                  {errors.customer_phone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="customer_address">Address</Label>
              <Textarea
                id="customer_address"
                {...register("customer_address")}
                placeholder="Enter delivery address"
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Order Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dining_option">Dining Option *</Label>
              <select
                {...register("dining_option")}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="indoor">Indoor Dining</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            {diningOption === "indoor" && (
              <div>
                <Label htmlFor="table_id">Select Table</Label>
                <select
                  {...register("table_id")}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Choose a table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Table {table.table_number} (Capacity: {table.capacity})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {diningOption === "delivery" && (
              <div>
                <Label htmlFor="delivery_location_id">Delivery Location</Label>
                <select
                  {...register("delivery_location_id")}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Choose delivery location</option>
                  {deliveryLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} - {formatAmount(location.price)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="payment_method">Payment Method *</Label>
              <select
                {...register("payment_method")}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="cash">Cash</option>
                <option value="wallet">Wallet</option>
                <option value="card">Card</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="menu_item">Select Menu Item</Label>
              <select
                value={selectedMenuItem?.id.toString() || ""}
                onChange={(e) => {
                  const item = menuItems.find(
                    (item) => item.id.toString() === e.target.value
                  );
                  setSelectedMenuItem(item || null);
                }}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Choose a menu item</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id.toString()}>
                    {item.name} - {formatAmount(item.price)}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-24">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(Number(e.target.value))}
              />
            </div>

            <Button
              type="button"
              onClick={addItemToOrder}
              disabled={!selectedMenuItem}
              className="mt-auto"
            >
              <Plus className="size-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Items</Label>
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.menu_item_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.menu_item_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatAmount(item.menu_item_price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
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
                        <Plus className="size-4" />
                      </Button>
                      <span className="font-medium w-20 text-right">
                        {formatAmount(item.total_price)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromOrder(item.menu_item_id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatAmount(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT ({totals.vatRate}%):</span>
            <span>{formatAmount(totals.vat)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Charge ({totals.serviceChargeRate}%):</span>
            <span>{formatAmount(totals.serviceCharge)}</span>
          </div>
          {totals.takeawayTotal > 0 && (
            <div className="flex justify-between">
              <span>Takeaway Packs:</span>
              <span>{formatAmount(totals.takeawayTotal)}</span>
            </div>
          )}
          {totals.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>{formatAmount(totals.deliveryFee)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{formatAmount(totals.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || selectedItems.length === 0}>
          {loading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Creating Order...
            </>
          ) : (
            "Create Order"
          )}
        </Button>
      </div>
    </form>
  );
}
