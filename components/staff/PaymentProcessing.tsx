"use client";

import { useState, useCallback } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { formatAmount } from "@/helpers/formatAmount";

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
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (orderId: string) => void;
}

export function PaymentProcessing({
  order,
  isOpen,
  onClose,
  onPaymentComplete,
}: PaymentProcessingProps) {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    payment_method: "cash",
    amount_received: order.total,
    reference_number: "",
    notes: "",
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const supabase = createClient();

  // Calculate change for cash payments
  const change =
    paymentData.payment_method === "cash"
      ? Math.max(0, (paymentData.amount_received || 0) - order.total)
      : 0;

  // Process payment
  const handleProcessPayment = useCallback(async () => {
    if (paymentData.payment_method === "cash" && !paymentData.amount_received) {
      toast.error("Please enter amount received");
      return;
    }

    if (
      paymentData.payment_method === "cash" &&
      paymentData.amount_received! < order.total
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
    try {
      // Create payment record via API
      const paymentResponse = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: order.id,
          amount: order.total,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          amount_received: paymentData.amount_received || order.total,
          change_amount: change,
          notes: paymentData.notes || null,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        console.error("Error creating payment:", errorData);
        toast.error(errorData.error || "Failed to process payment");
        return;
      }

      const { payment: paymentRecord } = await paymentResponse.json();

      // Update order status to completed/delivered
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: order.status === "ready" ? "delivered" : "completed",
          payment_method: paymentData.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) {
        console.error("Error updating order:", orderError);
        toast.error("Payment processed but failed to update order status");
        return;
      }

      // Prepare receipt data
      setReceiptData({
        ...order,
        payment: paymentRecord,
        change_amount: change,
        processed_at: new Date().toISOString(),
      });

      toast.success("Payment processed successfully!");
      setShowReceipt(true);
      onPaymentComplete(order.id);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setLoading(false);
    }
  }, [order, paymentData, change, supabase, onPaymentComplete]);

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
    setPaymentData({
      payment_method: "cash",
      amount_received: order.total,
      reference_number: "",
      notes: "",
    });
    setShowReceipt(false);
    setReceiptData(null);
    onClose();
  }, [order.total, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
                  <CardTitle className="text-sm">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Order #{order.invoice_no}</span>
                    <span>{order.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Items:</span>
                    <span>{order.items.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatAmount(order.total)}</span>
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
                    min={order.total}
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

              {/* Payment Status */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center gap-2 text-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    This will mark the order as{" "}
                    {order.status === "ready" ? "delivered" : "completed"}
                  </span>
                </div>
              </div>
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
                  Order #{order.invoice_no} has been completed
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
                      {formatAmount(order.total)}
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
    </Dialog>
  );
}
