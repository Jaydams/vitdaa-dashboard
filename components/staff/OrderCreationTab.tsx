"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, CreditCard, ShoppingCart, Menu, Receipt } from "lucide-react";
import { StaffMenuGridOrderInterface } from "./StaffMenuGridOrderInterface";
import { useOrderStore } from "@/stores/order-store";
import { formatAmount } from "@/helpers/formatAmount";
import { toast } from "sonner";
import { StaffSession } from "@/types/auth";

interface OrderCreationTabProps {
  staffSession: StaffSession;
  onOrderCreated?: (orderId: string) => void;
  onSwitchToTickets?: () => void;
}

export function OrderCreationTab({
  staffSession,
  onOrderCreated,
  onSwitchToTickets,
}: OrderCreationTabProps) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [activeOrderTab, setActiveOrderTab] = useState<"menu" | "order">(
    "menu"
  );

  const { currentOrder, saveAsOpenTicket, clearCurrentOrder } = useOrderStore();

  const hasItems = currentOrder && currentOrder.items.length > 0;
  const itemCount =
    currentOrder?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Debug logging
  console.log("OrderCreationTab - currentOrder:", currentOrder);
  console.log("OrderCreationTab - hasItems:", hasItems);
  console.log("OrderCreationTab - itemCount:", itemCount);

  const handleSaveAsOpenTicket = async () => {
    if (!hasItems) {
      toast.error("Please add items to the order before saving as ticket");
      return;
    }

    setIsSavingTicket(true);
    try {
      const ticketNumber = await saveAsOpenTicket();
      toast.success(`Order saved as ticket ${ticketNumber}`);

      // Switch to open tickets tab to show the saved ticket
      onSwitchToTickets?.();
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast.error("Failed to save order as ticket");
    } finally {
      setIsSavingTicket(false);
    }
  };

  const handleProcessPayment = () => {
    if (!hasItems) {
      toast.error("Please add items to the order before processing payment");
      return;
    }

    setIsProcessingPayment(true);
    // TODO: Implement payment processing modal integration
    // This will be implemented in task 4 (payment processing integration)
    toast.info("Payment processing will be implemented in the next phase");
    setIsProcessingPayment(false);
  };

  const handleClearOrder = () => {
    clearCurrentOrder();
    toast.success("Order cleared");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Order Status Bar - Desktop Only */}
      {hasItems && (
        <Card className="mb-4 hidden lg:block">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="font-medium">Current Order</span>
                  <Badge variant="secondary">
                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {currentOrder.customer.name && (
                  <div className="text-sm text-muted-foreground">
                    Customer: {currentOrder.customer.name}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-semibold">
                    {formatAmount(currentOrder.calculations.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Amount
                  </div>
                </div>

                <Separator orientation="vertical" className="h-8" />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAsOpenTicket}
                    disabled={isSavingTicket}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingTicket ? "Saving..." : "Save as Ticket"}
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    {isProcessingPayment ? "Processing..." : "Process Payment"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Tabbed Interface */}
      <div className="flex-1 lg:hidden">
        <Tabs
          value={activeOrderTab}
          onValueChange={(value) =>
            setActiveOrderTab(value as "menu" | "order")
          }
          className="h-full flex flex-col"
        >
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto m-2">
              <TabsTrigger
                value="menu"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Menu className="h-4 w-4" />
                Menu
              </TabsTrigger>
              <TabsTrigger
                value="order"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Receipt className="h-4 w-4" />
                Order
                {hasItems && (
                  <Badge variant="secondary" className="ml-1">
                    {itemCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="menu" className="h-full mt-0">
              <StaffMenuGridOrderInterface
                businessId={staffSession.business.id}
                staffRole="reception"
                onOrderCreated={onOrderCreated}
                className="h-full"
                mobileMode={true}
              />
            </TabsContent>

            <TabsContent value="order" className="h-full mt-0">
              <div className="h-full flex flex-col p-2">
                {!hasItems ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No items in order
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Switch to the Menu tab to add items to your order
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveOrderTab("menu")}
                    >
                      <Menu className="h-4 w-4 mr-2" />
                      Browse Menu
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Order Summary Header */}
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            <span className="font-medium">Order Summary</span>
                            <Badge variant="secondary">
                              {itemCount} item{itemCount !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg">
                              {formatAmount(currentOrder.calculations.total)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total Amount
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveAsOpenTicket}
                            disabled={isSavingTicket}
                            className="flex-1 flex items-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {isSavingTicket ? "Saving..." : "Save as Ticket"}
                          </Button>

                          <Button
                            size="sm"
                            onClick={handleProcessPayment}
                            disabled={isProcessingPayment}
                            className="flex-1 flex items-center gap-2"
                          >
                            <CreditCard className="h-4 w-4" />
                            {isProcessingPayment
                              ? "Processing..."
                              : "Process Payment"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Order Items */}
                    <div className="flex-1 overflow-auto">
                      <div className="space-y-2">
                        {currentOrder.items.map((item) => (
                          <Card key={item.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">
                                  {item.menu_item_name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {formatAmount(item.menu_item_price)} each
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {item.quantity}x
                                </span>
                                <span className="font-semibold">
                                  {formatAmount(
                                    item.menu_item_price * item.quantity
                                  )}
                                </span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Order Totals */}
                    <Card className="mt-4">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>
                            {formatAmount(currentOrder.calculations.subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>VAT (7.5%):</span>
                          <span>
                            {formatAmount(currentOrder.calculations.vatAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Service Charge (5%):</span>
                          <span>
                            {formatAmount(
                              currentOrder.calculations.serviceChargeAmount
                            )}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total:</span>
                          <span>
                            {formatAmount(currentOrder.calculations.total)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Footer Actions */}
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setActiveOrderTab("menu")}
                        className="flex-1"
                      >
                        <Menu className="h-4 w-4 mr-2" />
                        Add More Items
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleClearOrder}
                        className="text-destructive hover:text-destructive"
                      >
                        Clear Order
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Desktop Interface - Original Layout */}
      <div className="flex-1 hidden lg:block">
        <StaffMenuGridOrderInterface
          businessId={staffSession.business.id}
          staffRole="reception"
          onOrderCreated={onOrderCreated}
          className="h-full"
        />
      </div>

      {/* Quick Actions Footer - Desktop Only */}
      {hasItems && (
        <Card className="mt-4 hidden lg:block">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {currentOrder.items.length} menu item
                {currentOrder.items.length !== 1 ? "s" : ""} •{itemCount} total
                item{itemCount !== 1 ? "s" : ""} • Last modified:{" "}
                {currentOrder.timestamps.lastModified.toLocaleTimeString()}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearOrder}
                className="text-destructive hover:text-destructive"
              >
                Clear Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
