"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { createOrder } from "@/actions/order-actions";
import { formatAmount } from "@/helpers/formatAmount";

const createOrderSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().min(1, "Customer phone is required"),
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
});

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
}

interface CreateOrderFormProps {
  onSuccess: () => void;
}

export function CreateOrderForm({ onSuccess }: CreateOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);

  const supabase = createClient();

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current business owner ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      // Get business owner ID for the current user
      const { data: businessOwner } = await supabase
        .from("business_owner")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!businessOwner) {
        toast.error("Business owner not found");
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
        toast.error("Failed to fetch menu items");
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

      // Fetch available tables for this business owner
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("id, table_number, capacity, status")
        .eq("restaurant_id", businessOwnerId)
        .eq("status", "available");

      if (tablesError) {
        console.error("Error fetching tables:", tablesError);
        toast.error("Failed to fetch tables");
        return;
      }

      setTables(tablesData || []);

      // Fetch delivery locations for this business owner
      const { data: locationsData, error: locationsError } = await supabase
        .from("delivery_locations")
        .select("id, name, price")
        .eq("business_id", businessOwnerId);

      if (locationsError) {
        console.error("Error fetching delivery locations:", locationsError);
        toast.error("Failed to fetch delivery locations");
        return;
      }

      setDeliveryLocations(locationsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    }
  };

  const addItemToOrder = () => {
    if (!selectedMenuItem) return;

    const existingItem = selectedItems.find(
      (item) => item.menu_item_id === selectedMenuItem.id
    );

    if (existingItem) {
      setSelectedItems(
        selectedItems.map((item) =>
          item.menu_item_id === selectedMenuItem.id
            ? {
                ...item,
                quantity: item.quantity + itemQuantity,
                total_price: (item.quantity + itemQuantity) * item.menu_item_price,
              }
            : item
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          menu_item_id: selectedMenuItem.id,
          menu_item_name: selectedMenuItem.name,
          menu_item_price: selectedMenuItem.price,
          quantity: itemQuantity,
          total_price: selectedMenuItem.price * itemQuantity,
        },
      ]);
    }

    setSelectedMenuItem(null);
    setItemQuantity(1);
  };

  const removeItemFromOrder = (menuItemId: number) => {
    setSelectedItems(selectedItems.filter((item) => item.menu_item_id !== menuItemId));
  };

  const updateItemQuantity = (menuItemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(menuItemId);
      return;
    }

    setSelectedItems(
      selectedItems.map((item) =>
        item.menu_item_id === menuItemId
          ? {
              ...item,
              quantity: newQuantity,
              total_price: item.menu_item_price * newQuantity,
            }
          : item
      )
    );
  };

  const calculateTotals = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + item.total_price, 0);
    const vat = Math.round(subtotal * 0.075);
    const serviceCharge = Math.round(subtotal * 0.025);
    const takeawayTotal = watch("takeaway_packs") * watch("takeaway_pack_price");
    const deliveryFee = watch("delivery_fee");
    const total = subtotal + vat + serviceCharge + takeawayTotal + deliveryFee;

    return { subtotal, vat, serviceCharge, takeawayTotal, deliveryFee, total };
  };

  const onSubmit = async (data: CreateOrderFormData) => {
    if (selectedItems.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }

    setLoading(true);
    try {
      const { subtotal, vat, serviceCharge, takeawayTotal, deliveryFee, total } = calculateTotals();

      const orderData = {
        ...data,
        items: selectedItems,
        subtotal,
        vat_amount: vat,
        service_charge: serviceCharge,
        total_amount: total,
        takeaway_packs: data.takeaway_packs,
        takeaway_pack_price: data.takeaway_pack_price,
        delivery_fee: deliveryFee,
      };

      await createOrder(orderData);
      toast.success("Order created successfully");
      onSuccess();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, vat, serviceCharge, takeawayTotal, deliveryFee, total } = calculateTotals();

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
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                {...register("customer_name")}
                placeholder="Enter customer name"
              />
              {errors.customer_name && (
                <p className="text-sm text-red-500">{errors.customer_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="customer_phone">Phone Number *</Label>
              <Input
                id="customer_phone"
                {...register("customer_phone")}
                placeholder="Enter phone number"
              />
              {errors.customer_phone && (
                <p className="text-sm text-red-500">{errors.customer_phone.message}</p>
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
                onValueChange={(value) => setValue("dining_option", value as "indoor" | "delivery")}
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
                <Select onValueChange={(value) => setValue("table_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        Table {table.table_number} (Capacity: {table.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {diningOption === "delivery" && (
              <>
                <div>
                  <Label htmlFor="delivery_location_id">Delivery Location</Label>
                  <Select onValueChange={(value) => setValue("delivery_location_id", value)}>
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
                onValueChange={(value) => setValue("payment_method", value as "cash" | "wallet" | "card")}
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
                onValueChange={(value) => {
                  const item = menuItems.find((item) => item.id.toString() === value);
                  setSelectedMenuItem(item || null);
                }}
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
                        onClick={() => updateItemQuantity(item.menu_item_id, item.quantity - 1)}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(item.menu_item_id, item.quantity + 1)}
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
                  {...register("takeaway_pack_price", { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <span>VAT (7.5%)</span>
              <span>{formatAmount(vat)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Charge (2.5%)</span>
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
        <Button type="submit" disabled={loading || selectedItems.length === 0}>
          {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
          Create Order
        </Button>
      </div>
    </form>
  );
} 