"use client";

import React, { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cartCheckoutSchema } from "@/schemas";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

// Add types for tables, takeaway packs, and delivery locations
type Table = { id: string; table_number: string };
type TakeawayPack = { id: string; name: string; price: number };
type DeliveryLocation = { id: string; name: string; price: number };

export function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    items,
    increaseItemQuantity,
    decreaseItemQuantity,
    setDiningOption,
    diningOption,
    selectTable,
    selectedTableId,
    setPaymentMethod,
    paymentMethod,
    takeawayPacks,
    setTakeawayPacks,
    selectedDeliveryLocationId,
    setSelectedDeliveryLocation,
    setCustomerName,
    setCustomerPhone,
    setCustomerAddress,
  } = useCartStore();

  const router = useRouter();
  const supabase = createClient();

  // Move all state declarations above any usage
  const [step, setStep] = useState(1);
  const [tables, setTables] = useState<Table[]>([]);
  const [takeawayPacksList, setTakeawayPacksList] = useState<TakeawayPack[]>(
    []
  );
  const [selectedTakeawayPackId, setSelectedTakeawayPackId] = useState<
    string | null
  >(null);
  const [takeawayPackPriceState, setTakeawayPackPrice] = useState(0);
  const [deliveryLocations, setDeliveryLocations] = useState<
    DeliveryLocation[]
  >([]);
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    const result = cartCheckoutSchema.safeParse({
      diningOption,
      takeawayPacks,
      selectedDeliveryLocationId,
      selectedTableId,
      paymentMethod,
      // customerName,
      // customerPhone,
      // customerAddress,
    });

    if (!result.success) {
      const errorMessages = result.error.errors
        .map((e) => e.message)
        .join("\n");
      alert(errorMessages); // Or use toast
      return;
    }

    // Proceed to submit order
    alert("Order submitted successfully");
  };

  const handleNext = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      onClose(); // Close the drawer
      toast.info("You need to create an account or login to place an order.");
      setTimeout(() => {
        router.push("/login");
      }, 700); // Give a short delay for the drawer/toast
      return;
    }
    setStep(2);
  };

  // Use takeawayPackPriceState for calculations
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const vat = subtotal * 0.075;
  const service = subtotal * 0.05;
  const takeawayTotal = takeawayPacks * takeawayPackPriceState;
  const deliveryFee =
    deliveryLocations.find((l) => l.id === selectedDeliveryLocationId)?.price ||
    0;
  const total = Math.round(
    subtotal + vat + service + takeawayTotal + deliveryFee
  );

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setLoading(true);
      const businessName = items[0]?.business_name;
      if (!businessName) return setLoading(false);

      // Fetch business id
      const { data: business } = await supabase
        .from("business_owner")
        .select("id")
        .eq("business_name", businessName)
        .single();

      if (!business) return setLoading(false);

      // Fetch tables if indoor
      if (diningOption === "indoor") {
        const { data: tablesData } = await supabase
          .from("tables")
          .select("id, table_number")
          .eq("restaurant_id", business.id)
          .eq("status", "available");
        setTables((tablesData as Table[]) || []);
      } else {
        setTables([]);
      }

      // Fetch takeaway packs if delivery
      if (diningOption === "delivery") {
        const { data: packs } = await supabase
          .from("takeaway_packs")
          .select("id, name, price")
          .eq("business_id", business.id);
        setTakeawayPacksList((packs as TakeawayPack[]) || []);
        if (packs?.length === 1) {
          setSelectedTakeawayPackId(packs[0].id);
          setTakeawayPackPrice(packs[0].price);
        }
      } else {
        setTakeawayPacksList([]);
        setSelectedTakeawayPackId(null);
        setTakeawayPackPrice(0);
      }

      // Fetch delivery locations if delivery
      if (diningOption === "delivery") {
        const { data: locations } = await supabase
          .from("delivery_locations")
          .select("id, name, price")
          .eq("business_id", business.id);
        if (!locations || locations.length === 0) {
          setDeliveryLocations([
            { id: "default", name: "Default", price: 1000 },
          ]);
        } else {
          setDeliveryLocations(locations as DeliveryLocation[]);
        }
      } else {
        setDeliveryLocations([]);
      }
      setLoading(false);
    };
    fetchData();
    // Add missing dependencies
  }, [open, diningOption, items, supabase]);

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="m-auto md:ml-auto w-[98%] md:w-[350px] mb-14 md:mb-0 max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Your Cart</DrawerTitle>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-lg font-semibold text-muted-foreground mb-2">
                Your cart is empty
              </p>
              <p className="text-sm text-muted-foreground">
                Add some items to get started.
              </p>
            </div>
          ) : (
            <>
              {/* STEP 1: Cart and Preferences */}
              {step === 1 && (
                <>
                  {/* Cart Items */}
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center mb-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ₦{item.price} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => decreaseItemQuantity(item.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Minus size={16} />
                        </Button>
                        <span className="text-sm">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => increaseItemQuantity(item.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Dining Option */}
                  <div className="pt-4">
                    <Label>Dining Option</Label>
                    <Select
                      value={diningOption ?? ""}
                      onValueChange={(val) => setDiningOption(val as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select dining option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indoor">Indoor</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delivery Details */}
                  {diningOption === "delivery" && (
                    <>
                      <div className="pt-4">
                        <Label>Takeaway Packs</Label>
                        {takeawayPacksList.length === 1 ? (
                          <>
                            <Input
                              type="number"
                              min={1}
                              value={takeawayPacks}
                              onChange={(e) => {
                                setTakeawayPacks(
                                  Math.max(1, Number(e.target.value))
                                );
                                setTakeawayPackPrice(
                                  takeawayPacksList[0].price
                                );
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              ₦{takeawayPacksList[0].price} per pack
                            </p>
                          </>
                        ) : (
                          <>
                            <Select
                              value={selectedTakeawayPackId ?? ""}
                              onValueChange={(id) => {
                                setSelectedTakeawayPackId(id);
                                const pack = takeawayPacksList.find(
                                  (p) => p.id === id
                                );
                                setTakeawayPackPrice(pack?.price || 0);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose pack type" />
                              </SelectTrigger>
                              <SelectContent>
                                {takeawayPacksList.map((pack) => (
                                  <SelectItem key={pack.id} value={pack.id}>
                                    {pack.name} - ₦{pack.price}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min={1}
                              value={takeawayPacks}
                              onChange={(e) =>
                                setTakeawayPacks(
                                  Math.max(1, Number(e.target.value))
                                )
                              }
                            />
                          </>
                        )}
                      </div>

                      <div className="pt-4">
                        <Label>Select Location</Label>
                        <Select
                          value={selectedDeliveryLocationId ?? ""}
                          onValueChange={(id) =>
                            setSelectedDeliveryLocation(id)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a location" />
                          </SelectTrigger>
                          <SelectContent>
                            {deliveryLocations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name} - ₦{loc.price.toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Table Selection (Indoor) */}
                  {diningOption === "indoor" && (
                    <div className="pt-4">
                      <Label>Select Table</Label>
                      {loading ? (
                        <p>Loading tables...</p>
                      ) : tables.length > 0 ? (
                        <Select
                          value={selectedTableId ?? ""}
                          onValueChange={selectTable}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a table" />
                          </SelectTrigger>
                          <SelectContent>
                            {tables.map((table) => (
                              <SelectItem key={table.id} value={table.id}>
                                Table {table.table_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No tables available. You can proceed without selecting
                          a table.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className="pt-4">
                    <Label>Payment Method</Label>
                    <Select
                      value={paymentMethod ?? ""}
                      onValueChange={(val) => setPaymentMethod(val as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* STEP 2: Customer Info */}
              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      type="text"
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      type="text"
                      onChange={(e) => setCustomerAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div className="space-y-1 pt-4 border-t mt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (7.5%)</span>
                  <span>₦{vat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service (2.5%)</span>
                  <span>₦{service.toLocaleString()}</span>
                </div>
                {diningOption === "delivery" &&
                  takeawayPacks > 0 &&
                  takeawayPackPriceState > 0 && (
                    <div className="flex justify-between">
                      <span>Takeaway Packs (x{takeawayPacks})</span>
                      <span>
                        ₦
                        {(
                          takeawayPacks * takeawayPackPriceState
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                {diningOption === "delivery" && selectedDeliveryLocationId && (
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>₦{total.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Actions */}
        <DrawerFooter>
          {items.length === 0 ? (
            <Button className="w-full" onClick={onClose}>
              Close
            </Button>
          ) : step === 1 ? (
            <Button className="w-full" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <>
              <Button className="w-full" onClick={handleConfirm}>
                Confirm Order
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
