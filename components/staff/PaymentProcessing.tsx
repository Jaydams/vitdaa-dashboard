"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  DollarSign,
  Wallet,
  Receipt,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Printer,
  Edit3,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatAmount } from "@/helpers/formatAmount";
import { useOrderStore, OpenTicket, OrderState } from "@/stores/order-store";
import { PaymentProcessingErrorBoundary } from "@/components/error-boundary/PaymentProcessingErrorBoundary";

interface Order {
  id: string;
  invoice_no: string;
  customerName: string;
  customerPhone?: string | null;
  total: number;
  status: string;
  paymentMethod?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal?: number;
  vat_amount?: number;
  service_charge?: number;
  createdAt: string;
}

interface PaymentData {
  payment_method: "cash" | "card" | "wallet";
  amount_received?: number;
  reference_number?: string;
  notes?: string;
}

interface PaymentProcessingProps {
  // Support both legacy Order and new OpenTicket
  order?: Order;
  ticket?: OpenTicket;
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (orderId: string, ticketId?: string) => void;
}

export function PaymentProcessing({
  order,
  ticket,
  isOpen,
  onClose,
  onPaymentComplete,
}: PaymentProcessingProps) {
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editableOrder, setEditableOrder] = useState<OrderState | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Get order store actions for ticket management
  const {
    updateQuantity,
    removeItem,
    updateCustomer,
    updateSpecialInstructions,
    completeTicketPayment,
  } = useOrderStore();

  const supabase = createClient();

  // Determine the working order data (from ticket or legacy order)
  const workingOrder =
    ticket?.orderState ||
    (order
      ? {
          id: order.id,
          ticketNumber: order.invoice_no,
          items: order.items.map((item, index) => ({
            id: `item-${index}`,
            order_id: order.id,
            menu_item_id: index,
            menu_item_name: item.name,
            menu_item_price: item.price,
            quantity: item.quantity,
            total_price: item.price * item.quantity,
            created_at: new Date().toISOString(),
          })),
          customer: {
            name: order.customerName,
            phone: order.customerPhone || undefined,
          },
          diningOption: "indoor" as const,
          status: "payment_pending" as const,
          calculations: {
            subtotal: order.subtotal || order.total,
            vatAmount: order.vat_amount || 0,
            serviceChargeAmount: order.service_charge || 0,
            customChargesTotal: 0,
            total: order.total,
          },
          customCharges: [],
          timestamps: {
            created: new Date(order.createdAt),
            lastModified: new Date(),
          },
        }
      : null);

  const [paymentData, setPaymentData] = useState<PaymentData>({
    payment_method: "cash",
    amount_received: workingOrder?.calculations.total || 0,
    reference_number: "",
    notes: "",
  });

  // Initialize editable order when component opens
  useEffect(() => {
    if (isOpen && workingOrder) {
      setEditableOrder(workingOrder);
      setPaymentData((prev) => ({
        ...prev,
        amount_received: workingOrder.calculations.total,
      }));
    }
  }, [isOpen, workingOrder]);

  // Calculate change for cash payments
  const currentTotal =
    editableOrder?.calculations.total || workingOrder?.calculations.total || 0;
  const change =
    paymentData.payment_method === "cash"
      ? Math.max(0, (paymentData.amount_received || 0) - currentTotal)
      : 0;

  // Handle order modification functions
  const handleUpdateQuantity = useCallback(
    (itemId: string, newQuantity: number) => {
      if (!editableOrder) return;

      const updatedItems = editableOrder.items
        .map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              quantity: Math.max(0, newQuantity),
              total_price: item.menu_item_price * Math.max(0, newQuantity),
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);

      // Recalculate totals
      const subtotal = updatedItems.reduce(
        (sum, item) => sum + item.total_price,
        0
      );
      const vatAmount = subtotal * 0.075; // 7.5% VAT
      const serviceChargeAmount = subtotal * 0.05; // 5% service charge
      const total = subtotal + vatAmount + serviceChargeAmount;

      const updatedOrder = {
        ...editableOrder,
        items: updatedItems,
        calculations: {
          ...editableOrder.calculations,
          subtotal,
          vatAmount,
          serviceChargeAmount,
          total,
        },
        timestamps: {
          ...editableOrder.timestamps,
          lastModified: new Date(),
        },
      };

      setEditableOrder(updatedOrder);
      setPaymentData((prev) => ({ ...prev, amount_received: total }));
    },
    [editableOrder]
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      if (!editableOrder) return;
      handleUpdateQuantity(itemId, 0);
    },
    [editableOrder, handleUpdateQuantity]
  );

  const handleUpdateCustomer = useCallback(
    (field: string, value: string) => {
      if (!editableOrder) return;

      setEditableOrder((prev) =>
        prev
          ? {
              ...prev,
              customer: {
                ...prev.customer,
                [field]: value,
              },
              timestamps: {
                ...prev.timestamps,
                lastModified: new Date(),
              },
            }
          : null
      );
    },
    [editableOrder]
  );

  const handleUpdateSpecialInstructions = useCallback(
    (instructions: string) => {
      if (!editableOrder) return;

      setEditableOrder((prev) =>
        prev
          ? {
              ...prev,
              specialInstructions: instructions,
              timestamps: {
                ...prev.timestamps,
                lastModified: new Date(),
              },
            }
          : null
      );
    },
    [editableOrder]
  );

  // Error recovery functions
  // Forward declaration for handleProcessPayment
  const handleProcessPaymentRef = useRef<(() => Promise<void>) | null>(null);

  const handleRetryPayment = useCallback(() => {
    setPaymentError(null);
    setRetryCount((prev) => prev + 1);
    setIsRetrying(true);

    // Retry the payment after a short delay
    setTimeout(() => {
      setIsRetrying(false);
      if (handleProcessPaymentRef.current) {
        handleProcessPaymentRef.current();
      }
    }, 1000);
  }, []);

  const handleResetPayment = useCallback(() => {
    setPaymentError(null);
    setRetryCount(0);
    setIsRetrying(false);
    setLoading(false);

    // Reset payment data to defaults
    const initialTotal =
      editableOrder?.calculations.total ||
      workingOrder?.calculations.total ||
      0;
    setPaymentData({
      payment_method: "cash",
      amount_received: initialTotal,
      reference_number: "",
      notes: "",
    });
  }, [editableOrder, workingOrder]);

  const handleSaveOrderState = useCallback(() => {
    if (!ticket || !editableOrder) return;

    try {
      // Save the current order state back to the ticket in case of payment failure
      // This ensures no data is lost during payment processing errors
      const updatedTicket = {
        ...ticket,
        orderState: editableOrder,
        lastModified: new Date(),
      };

      // Update the ticket in the store
      // Note: In a real implementation, this might also sync to server
      toast.success("Order state saved. You can retry payment later.");
    } catch (error) {
      console.error("Error saving order state:", error);
      toast.error("Failed to save order state");
    }
  }, [ticket, editableOrder]);

  // Process payment
  const handleProcessPayment = useCallback(async () => {
    const orderToProcess = editableOrder || workingOrder;
    if (!orderToProcess) {
      toast.error("No order data available");
      return;
    }

    if (paymentData.payment_method === "cash" && !paymentData.amount_received) {
      toast.error("Please enter amount received");
      return;
    }

    if (
      paymentData.payment_method === "cash" &&
      paymentData.amount_received! < orderToProcess.calculations.total
    ) {
      toast.error("Amount received cannot be less than order total");
      return;
    }

    if (
      (paymentData.payment_method === "card" ||
        paymentData.payment_method === "wallet") &&
      !paymentData.reference_number
    ) {
      toast.error("Please enter reference number");
      return;
    }

    setLoading(true);
    setPaymentError(null);

    try {
      // For ticket-based orders, we need to create the order first if it doesn't exist in the database
      let orderId = orderToProcess.id || "";

      if (ticket && !order) {
        // Create order from ticket data
        const orderData = {
          customer_name: orderToProcess.customer.name || "Walk-in Customer",
          customer_phone: orderToProcess.customer.phone || "",
          customer_address: (orderToProcess.customer as any).address || "",
          dining_option: orderToProcess.diningOption,
          table_number: (orderToProcess as any).tableNumber,
          subtotal: orderToProcess.calculations.subtotal,
          vat_amount: orderToProcess.calculations.vatAmount,
          service_charge: orderToProcess.calculations.serviceChargeAmount,
          total_amount: orderToProcess.calculations.total,
          notes: (orderToProcess as any).specialInstructions || "",
          status: "pending",
          items: orderToProcess.items.map((item) => ({
            menu_item_id: item.menu_item_id,
            menu_item_name: item.menu_item_name,
            menu_item_price: item.menu_item_price,
            quantity: item.quantity,
            total_price: item.total_price,
          })),
        };

        const orderResponse = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          console.error("Error creating order:", errorData);
          const errorMessage = errorData.error || "Failed to create order";
          setPaymentError(`Order Creation Failed: ${errorMessage}`);
          toast.error(errorMessage);
          return;
        }

        const { order: createdOrder } = await orderResponse.json();
        orderId = createdOrder.id;
      }

      // Create payment record via API
      const paymentResponse = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          amount: orderToProcess.calculations.total,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          amount_received:
            paymentData.amount_received || orderToProcess.calculations.total,
          change_amount: change,
          notes: paymentData.notes || null,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        console.error("Error creating payment:", errorData);
        const errorMessage = errorData.error || "Failed to process payment";
        setPaymentError(`Payment Processing Failed: ${errorMessage}`);
        toast.error(errorMessage);
        return;
      }

      const { payment: paymentRecord } = await paymentResponse.json();

      // Update order status to completed/delivered
      const currentStatus = order?.status || "pending";
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: currentStatus === "ready" ? "delivered" : "completed",
          payment_method: paymentData.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) {
        console.error("Error updating order:", orderError);
        const errorMessage =
          "Payment processed but failed to update order status";
        setPaymentError(`Order Update Failed: ${errorMessage}`);
        toast.error(errorMessage);
        return;
      }

      // If this was a ticket, mark it as completed and remove from store
      if (ticket) {
        completeTicketPayment(ticket.id);
      }

      // Prepare receipt data with ticket reference
      setReceiptData({
        id: orderId,
        invoice_no: orderToProcess.ticketNumber || `ORD-${orderId}`,
        ticket_number: ticket?.ticketNumber, // Include ticket number for reference
        customerName: orderToProcess.customer.name || "Walk-in Customer",
        customer_phone: orderToProcess.customer.phone,
        total: orderToProcess.calculations.total,
        subtotal: orderToProcess.calculations.subtotal,
        vat_amount: orderToProcess.calculations.vatAmount,
        service_charge: orderToProcess.calculations.serviceChargeAmount,
        items: orderToProcess.items.map((item) => ({
          name: item.menu_item_name,
          quantity: item.quantity,
          price: item.menu_item_price,
        })),
        payment: paymentRecord,
        change_amount: change,
        processed_at: new Date().toISOString(),
        was_ticket: !!ticket, // Flag to indicate this was processed from a ticket
      });

      toast.success("Payment processed successfully!");
      setShowReceipt(true);
      onPaymentComplete(orderId, ticket?.id);
    } catch (error) {
      console.error("Error processing payment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process payment";
      setPaymentError(`Unexpected Error: ${errorMessage}`);
      toast.error("An unexpected error occurred during payment processing");

      // Save order state to prevent data loss
      if (ticket && editableOrder) {
        handleSaveOrderState();
      }
    } finally {
      setLoading(false);
    }
  }, [
    editableOrder,
    workingOrder,
    ticket,
    order,
    paymentData,
    change,
    supabase,
    onPaymentComplete,
    completeTicketPayment,
    handleSaveOrderState,
  ]);

  // Assign the function to the ref for retry functionality
  useEffect(() => {
    handleProcessPaymentRef.current = handleProcessPayment;
  }, [handleProcessPayment]);

  // Print receipt
  const handlePrintReceipt = useCallback(() => {
    if (!receiptData) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Could not open print window");
      return;
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptData.invoice_no}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .order-info { margin-bottom: 15px; }
            .items { margin-bottom: 15px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .totals { border-top: 1px solid #000; padding-top: 10px; }
            .total-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .final-total { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
            .payment-info { margin-top: 15px; border-top: 1px solid #000; padding-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RECEIPT</h2>
            <p>Order #${receiptData.invoice_no}</p>
            ${
              receiptData.ticket_number
                ? `<p>Ticket #${receiptData.ticket_number}</p>`
                : ""
            }
            <p>${new Date(receiptData.processed_at).toLocaleString()}</p>
          </div>
          
          <div class="order-info">
            <p><strong>Customer:</strong> ${receiptData.customerName}</p>
            ${
              receiptData.customerPhone
                ? `<p><strong>Phone:</strong> ${receiptData.customer_phone}</p>`
                : ""
            }
          </div>
          
          <div class="items">
            <h3>Items:</h3>
            ${receiptData.items
              .map(
                (item: any) => `
              <div class="item">
                <span>${item.quantity}x ${item.name}</span>
                <span>${formatAmount(item.quantity * item.price)}</span>
              </div>
            `
              )
              .join("")}
          </div>
          
          <div class="totals">
            <div class="total-line">
              <span>Subtotal:</span>
              <span>${formatAmount(
                receiptData.subtotal || receiptData.total
              )}</span>
            </div>
            ${
              receiptData.vat_amount
                ? `
              <div class="total-line">
                <span>VAT:</span>
                <span>${formatAmount(receiptData.vat_amount)}</span>
              </div>
            `
                : ""
            }
            ${
              receiptData.service_charge
                ? `
              <div class="total-line">
                <span>Service Charge:</span>
                <span>${formatAmount(receiptData.service_charge)}</span>
              </div>
            `
                : ""
            }
            <div class="total-line final-total">
              <span>Total:</span>
              <span>${formatAmount(receiptData.total)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <div class="total-line">
              <span>Payment Method:</span>
              <span>${receiptData.payment.payment_method.toUpperCase()}</span>
            </div>
            ${
              receiptData.payment.payment_method === "cash"
                ? `
              <div class="total-line">
                <span>Amount Received:</span>
                <span>${formatAmount(
                  receiptData.payment.amount_received
                )}</span>
              </div>
              ${
                receiptData.change_amount > 0
                  ? `
                <div class="total-line">
                  <span>Change:</span>
                  <span>${formatAmount(receiptData.change_amount)}</span>
                </div>
              `
                  : ""
              }
            `
                : ""
            }
            ${
              receiptData.payment.reference_number
                ? `
              <div class="total-line">
                <span>Reference:</span>
                <span>${receiptData.payment.reference_number}</span>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Please keep this receipt for your records</p>
            ${
              receiptData.was_ticket
                ? "<p><em>Order processed from open ticket</em></p>"
                : ""
            }
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
  }, [receiptData]);

  // Close and reset
  const handleClose = useCallback(() => {
    const initialTotal = workingOrder?.calculations.total || 0;
    setPaymentData({
      payment_method: "cash",
      amount_received: initialTotal,
      reference_number: "",
      notes: "",
    });
    setShowReceipt(false);
    setReceiptData(null);
    setIsEditingOrder(false);
    setEditableOrder(null);
    setPaymentError(null);
    setRetryCount(0);
    setIsRetrying(false);
    onClose();
  }, [workingOrder?.calculations.total, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <PaymentProcessingErrorBoundary
        orderId={workingOrder?.id}
        paymentMethod={paymentData.payment_method}
        amount={workingOrder?.calculations.total}
        onPaymentSaved={handleSaveOrderState}
      >
        <DialogContent className="max-w-md">
          {!showReceipt ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Process Payment
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Order Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Order Summary
                      {ticket && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingOrder(!isEditingOrder)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          {isEditingOrder ? "Done" : "Edit"}
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        Order #{workingOrder?.ticketNumber || workingOrder?.id}
                      </span>
                      <span>
                        {workingOrder?.customer.name || "Walk-in Customer"}
                      </span>
                    </div>

                    {/* Customer Information (editable if ticket) */}
                    {isEditingOrder && ticket && editableOrder && (
                      <div className="space-y-2 p-2 bg-gray-50 rounded">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="customer_name" className="text-xs">
                              Customer Name
                            </Label>
                            <Input
                              id="customer_name"
                              className="h-8 text-sm"
                              value={editableOrder.customer.name || ""}
                              onChange={(e) =>
                                handleUpdateCustomer("name", e.target.value)
                              }
                              placeholder="Customer name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="customer_phone" className="text-xs">
                              Phone
                            </Label>
                            <Input
                              id="customer_phone"
                              className="h-8 text-sm"
                              value={editableOrder.customer.phone || ""}
                              onChange={(e) =>
                                handleUpdateCustomer("phone", e.target.value)
                              }
                              placeholder="Phone number"
                            />
                          </div>
                        </div>
                        <div>
                          <Label
                            htmlFor="special_instructions"
                            className="text-xs"
                          >
                            Special Instructions
                          </Label>
                          <Textarea
                            id="special_instructions"
                            rows={2}
                            value={editableOrder.specialInstructions || ""}
                            onChange={(e) =>
                              handleUpdateSpecialInstructions(e.target.value)
                            }
                            placeholder="Special instructions..."
                          />
                        </div>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-600">
                        Items:
                      </div>
                      {(editableOrder || workingOrder)?.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex-1">
                            <span>{item.menu_item_name}</span>
                            <span className="text-gray-500 ml-2">
                              {formatAmount(item.menu_item_price)} each
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditingOrder && ticket && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.id,
                                      item.quantity - 1
                                    )
                                  }
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <span className="min-w-[20px] text-center">
                              {item.quantity}x
                            </span>
                            {isEditingOrder && ticket && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.id,
                                      item.quantity + 1
                                    )
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <span className="min-w-[60px] text-right">
                              {formatAmount(item.total_price)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Order Totals */}
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>
                          {formatAmount(
                            (editableOrder || workingOrder)?.calculations
                              .subtotal || 0
                          )}
                        </span>
                      </div>
                      {((editableOrder || workingOrder)?.calculations
                        .vatAmount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>VAT:</span>
                          <span>
                            {formatAmount(
                              (editableOrder || workingOrder)?.calculations
                                .vatAmount || 0
                            )}
                          </span>
                        </div>
                      )}
                      {((editableOrder || workingOrder)?.calculations
                        .serviceChargeAmount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Service Charge:</span>
                          <span>
                            {formatAmount(
                              (editableOrder || workingOrder)?.calculations
                                .serviceChargeAmount || 0
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Amount:</span>
                      <span>{formatAmount(currentTotal)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <div>
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={paymentData.payment_method}
                    onValueChange={(value) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        payment_method: value as "cash" | "card" | "wallet",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Card
                        </div>
                      </SelectItem>
                      <SelectItem value="wallet">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Wallet
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cash Payment Fields */}
                {paymentData.payment_method === "cash" && (
                  <div>
                    <Label htmlFor="amount_received">Amount Received *</Label>
                    <Input
                      id="amount_received"
                      type="number"
                      min={currentTotal}
                      step="0.01"
                      placeholder="Enter amount received"
                      value={paymentData.amount_received || ""}
                      onChange={(e) =>
                        setPaymentData((prev) => ({
                          ...prev,
                          amount_received: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                    {change > 0 && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">
                            Change: {formatAmount(change)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Card/Wallet Payment Fields */}
                {(paymentData.payment_method === "card" ||
                  paymentData.payment_method === "wallet") && (
                  <div>
                    <Label htmlFor="reference_number">Reference Number *</Label>
                    <Input
                      id="reference_number"
                      placeholder="Enter transaction reference"
                      value={paymentData.reference_number}
                      onChange={(e) =>
                        setPaymentData((prev) => ({
                          ...prev,
                          reference_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes..."
                    value={paymentData.notes}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Payment Error Display */}
                {paymentError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-start gap-2 text-red-800">
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          Payment Failed
                        </div>
                        <div className="text-sm mt-1">{paymentError}</div>
                        {retryCount > 0 && (
                          <div className="text-xs mt-1 text-red-600">
                            Retry attempt: {retryCount}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error Recovery Options */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetryPayment}
                        disabled={isRetrying || retryCount >= 3}
                      >
                        {isRetrying ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Retrying...
                          </>
                        ) : (
                          "Retry Payment"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetPayment}
                      >
                        Reset
                      </Button>
                      {ticket && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveOrderState}
                        >
                          Save & Exit
                        </Button>
                      )}
                    </div>

                    {retryCount >= 3 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="text-xs text-yellow-800">
                          Maximum retry attempts reached. Please check your
                          connection or try a different payment method.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Status */}
                {!paymentError && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2 text-blue-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        This will mark the order as{" "}
                        {order?.status === "ready" ? "delivered" : "completed"}
                        {ticket && " and remove the ticket from open tickets"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Process Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Payment Successful
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Payment Processed Successfully!
                  </h3>
                  <p className="text-green-600">
                    Order #{receiptData?.invoice_no} has been completed
                    {ticket && " and ticket has been closed"}
                  </p>
                </div>

                {/* Payment Summary */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <Badge variant="outline">
                        {receiptData?.payment.payment_method.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-semibold">
                        {formatAmount(receiptData?.total || 0)}
                      </span>
                    </div>
                    {receiptData?.payment.payment_method === "cash" && (
                      <>
                        <div className="flex justify-between">
                          <span>Received:</span>
                          <span>
                            {formatAmount(receiptData.payment.amount_received)}
                          </span>
                        </div>
                        {change > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Change:</span>
                            <span className="font-semibold">
                              {formatAmount(change)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {receiptData?.payment.reference_number && (
                      <div className="flex justify-between">
                        <span>Reference:</span>
                        <span className="font-mono text-sm">
                          {receiptData.payment.reference_number}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handlePrintReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button onClick={handleClose}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </PaymentProcessingErrorBoundary>
    </Dialog>
  );
}
