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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { createOrder } from "@/actions/order-actions";
import { formatAmount } from "@/helpers/formatAmount";
import { useBusinessSettings } from "@/hooks/use-business-settings";
import { CustomChargesManager } from "@/components/orders/CustomChargesManager";
import { CustomCharge } from "@/types/order";
import { CreateOrderErrorBoundary } from "@/components/error-boundary/OrderErrorBoundary";
import {
  OrderFormSkeleton,
  DataFetchingOverlay,
  OrderCreationProgress,
} from "@/components/ui/order-loading-states";
import {
  OrderNotifications,
  OrderNotificationTemplates,
} from "@/lib/order-notifications";

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
      // For delivery orders, require customer information for delivery purposes
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
      // For delivery orders, require customer phone for contact purposes
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
  const [creationStep, setCreationStep] = useState<
    "validating" | "saving" | "processing" | "complete" | null
  >(null);
  const [showFormAnyway, setShowFormAnyway] = useState(false);
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
  const [customCharges, setCustomCharges] = useState<CustomCharge[]>([]);

  // Ref to track if data has been loaded to prevent multiple fetches
  const dataLoaded = useRef(false);
  const supabase = createClient();

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

  // Memoized data fetching function
  const fetchData = useCallback(async () => {
    if (dataLoaded.current || dataLoading) return;

    setDataLoading(true);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setDataLoading(false);
      OrderNotifications.networkError({
        description: "Request timed out. Please try again.",
      });
    }, 30000); // 30 second timeout

    try {
      // Get current business owner ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        OrderNotifications.permissionError({
          description: "Please log in to continue",
        });
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
        OrderNotifications.permissionError({
          description: "Business profile not found",
        });
        setDataLoading(false);
        return;
      }

      const businessOwnerId = businessOwner.id;

      // Fetch menu items for this business owner using the correct pattern
      const { data: menuData, error: menuError } = await supabase
        .from("menu_items")
        .select("*, menu:menu_id(menu_name, owner_id)")
        .eq("status", "available")
        .eq("menu.owner_id", businessOwnerId);

      if (menuError) {
        console.error("Error fetching menu items:", menuError);
        OrderNotifications.networkError({
          description: "Could not load menu items. Please try again.",
        });
        setDataLoading(false);
        return;
      }

      // Filter and map menu items
      const filteredMenuItems = (menuData || [])
        .filter((item: any) => item.menu?.owner_id === businessOwnerId)
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
        }));

      setMenuItems(filteredMenuItems);
      console.log("Loaded menu items:", filteredMenuItems);

      // Fetch available tables for this business owner
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("id, table_number, capacity, status")
        .eq("restaurant_id", businessOwnerId)
        .eq("status", "available");

      if (tablesError) {
        console.error("Error fetching tables:", tablesError);
        OrderNotifications.networkError({
          description: "Could not load table information. Please try again.",
        });
        setDataLoading(false);
        return;
      }

      setTables(tablesData || []);
      console.log("Loaded tables:", tablesData);

      // Fetch delivery locations for this business owner
      const { data: locationsData, error: locationsError } = await supabase
        .from("delivery_locations")
        .select("id, name, price")
        .eq("business_id", businessOwnerId);

      if (locationsError) {
        console.error("Error fetching delivery locations:", locationsError);
        OrderNotifications.networkError({
          description: "Could not load delivery locations. Please try again.",
        });
        setDataLoading(false);
        return;
      }

      setDeliveryLocations(locationsData || []);
      dataLoaded.current = true;
    } catch (error) {
      console.error("Error fetching data:", error);
      OrderNotifications.networkError({
        description: "Could not load form data. Please refresh and try again.",
      });
    } finally {
      clearTimeout(timeoutId);
      setDataLoading(false);
    }
  }, [supabase, dataLoading]);

  useEffect(() => {
    fetchData();

    // Cleanup function
    return () => {
      // Reset data loaded flag when component unmounts
      dataLoaded.current = false;
    };
  }, [fetchData]);

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

  // Memoized handlers for form interactions
  const handleMenuItemChange = useCallback(
    (value: string) => {
      const item = menuItems.find((item) => item.id.toString() === value);
      setSelectedMenuItem(item || null);
    },
    [menuItems]
  );

  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setItemQuantity(Number(e.target.value));
    },
    []
  );

  // Memoized calculation to prevent infinite re-renders
  const totals = useMemo(() => {
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.total_price,
      0
    );

    // Use dynamic rates from business settings, fallback to defaults
    const vatRate = businessSettings?.vat_rate ?? 7.5;
    const serviceChargeRate = businessSettings?.service_charge_rate ?? 2.5;

    const vat = Math.round(subtotal * (vatRate / 100));
    const serviceCharge = Math.round(subtotal * (serviceChargeRate / 100));
    const takeawayTotal = takeawayPacks * takeawayPackPrice;
    const deliveryFee = watchedDeliveryFee;

    // Calculate custom charges total
    const customChargesTotal = customCharges.reduce(
      (sum, charge) => sum + charge.calculated_amount,
      0
    );

    const total =
      subtotal +
      vat +
      serviceCharge +
      takeawayTotal +
      deliveryFee +
      customChargesTotal;

    return {
      subtotal,
      vat,
      serviceCharge,
      takeawayTotal,
      deliveryFee,
      customChargesTotal,
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
    customCharges,
  ]);

  const onSubmit = useCallback(
    async (data: CreateOrderFormData) => {
      console.log("Form submission started with data:", data);
      console.log("Selected items:", selectedItems);
      console.log("Business settings:", businessSettings);

      if (selectedItems.length === 0) {
        OrderNotifications.validationError(
          "Order Items",
          "Please add at least one item to the order"
        );
        return;
      }

      setLoading(true);
      setCreationStep("validating");

      try {
        setCreationStep("saving");
        // Provide default values for optional customer information
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
          custom_charges: customCharges,
          custom_charges_total: totals.customChargesTotal,
          vat_rate: totals.vatRate,
          service_charge_rate: totals.serviceChargeRate,
        };

        setCreationStep("processing");
        const result = await createOrder(orderData);

        setCreationStep("complete");
        OrderNotifications.orderCreated(undefined, {
          action: {
            label: "View Order",
            onClick: () => {
              if (result?.orderId) {
                window.location.href = `/orders/${result.orderId}`;
              }
            },
          },
        });
        onSuccess();
      } catch (error) {
        console.error("Error creating order:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        OrderNotifications.orderCreationFailed(errorMessage, {
          action: {
            label: "Try Again",
            onClick: () => {
              setCreationStep(null);
              // Reset form state if needed
            },
          },
        });
      } finally {
        setLoading(false);
        setCreationStep(null);
      }
    },
    [selectedItems, totals, onSuccess, customCharges]
  );

  const {
    subtotal,
    vat,
    serviceCharge,
    takeawayTotal,
    deliveryFee,
    customChargesTotal,
    total,
    vatRate,
    serviceChargeRate,
  } = totals;

  // Fallback timer to show form even if data loading fails
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFormAnyway(true);
    }, 10000); // Show form after 10 seconds regardless

    return () => clearTimeout(timer);
  }, []);

  if ((dataLoading || settingsLoading) && !showFormAnyway) {
    return <OrderFormSkeleton />;
  }

  // Show warning if form is displayed but data is still loading
  // Only show warning if data is actually incomplete (no menu items, tables, etc.)
  const isDataIncomplete =
    (dataLoading || settingsLoading) &&
    (menuItems.length === 0 || tables.length === 0 || !businessSettings);

  return (
    <CreateOrderErrorBoundary>
      <DataFetchingOverlay isLoading={loading} message="Creating order...">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Show warning if data is incomplete */}
          {isDataIncomplete && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Some data is still loading. The form may have limited
                functionality.
              </p>
            </div>
          )}

          {/* Show creation progress */}
          {creationStep && (
            <div className="mb-4">
              <OrderCreationProgress step={creationStep} />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {diningOption === "delivery"
                    ? "Customer information is required for delivery orders"
                    : "Customer information is optional for indoor dining"}
                </p>
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
                  <Select
                    value={diningOption}
                    onValueChange={(value) =>
                      setValue("dining_option", value as "indoor" | "delivery")
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
                  <>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rider_name">Rider Name</Label>
                        <Input
                          id="rider_name"
                          {...register("rider_name")}
                          placeholder="Enter rider name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rider_phone">Rider Phone</Label>
                        <Input
                          id="rider_phone"
                          {...register("rider_phone")}
                          placeholder="Enter rider phone"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={paymentMethod}
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
                  <Select
                    value={selectedMenuItem?.id.toString() || ""}
                    onValueChange={handleMenuItemChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} - {formatAmount(item.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={handleQuantityChange}
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
                          <span className="w-8 text-center">
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
                            <Plus className="size-4" />
                          </Button>
                          <span className="font-medium w-20 text-right">
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

          {/* Takeaway Packs (for delivery) */}
          {diningOption === "delivery" && (
            <Card>
              <CardHeader>
                <CardTitle>Takeaway Packs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="takeaway_packs">Number of Packs</Label>
                    <Input
                      id="takeaway_packs"
                      type="number"
                      min="0"
                      {...register("takeaway_packs", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="takeaway_pack_price">Price per Pack</Label>
                    <Input
                      id="takeaway_pack_price"
                      type="number"
                      min="0"
                      {...register("takeaway_pack_price", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Charges */}
          <CustomChargesManager
            charges={customCharges}
            onChargesChange={setCustomCharges}
            subtotal={subtotal}
            disabled={loading}
          />

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatAmount(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT ({vatRate}%)</span>
                  <span>{formatAmount(vat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge ({serviceChargeRate}%)</span>
                  <span>{formatAmount(serviceCharge)}</span>
                </div>
                {diningOption === "delivery" && takeawayTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Takeaway Packs</span>
                    <span>{formatAmount(takeawayTotal)}</span>
                  </div>
                )}
                {diningOption === "delivery" && deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{formatAmount(deliveryFee)}</span>
                  </div>
                )}
                {customCharges.length > 0 && (
                  <>
                    {customCharges.map((charge) => (
                      <div key={charge.id} className="flex justify-between">
                        <span>{charge.charge_name}</span>
                        <span>{formatAmount(charge.calculated_amount)}</span>
                      </div>
                    ))}
                  </>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatAmount(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Order Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedItems.length === 0}
            >
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </div>
        </form>
      </DataFetchingOverlay>
    </CreateOrderErrorBoundary>
  );
}
