import { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import PageTitle from "@/components/shared/PageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatAmount } from "@/helpers/formatAmount";
import { fetchOrder } from "@/actions/order-actions";
import { OrderBadgeVariants } from "@/constants/badge";
import { Printer, ArrowLeft, Download, MoreVertical } from "lucide-react";
import Link from "next/link";
import { InvoiceActions } from "./_components/InvoiceActions";

export const metadata: Metadata = {
  title: "Order Details",
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    const order = await fetchOrder(params.id);

    if (!order) {
      notFound();
    }

    return (
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/orders">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <PageTitle>Order #{order.invoice_no}</PageTitle>
          </div>
          
          <InvoiceActions order={order} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Order Summary
                <Badge
                  variant={OrderBadgeVariants[order.status]}
                  className="capitalize"
                >
                  {order.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Date</p>
                  <p className="font-medium">
                    {format(new Date(order.order_time), "PPp")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">
                    {order.payment_method}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dining Option</p>
                  <p className="font-medium capitalize">
                    {order.dining_option}
                  </p>
                </div>
                {order.table && (
                  <div>
                    <p className="text-muted-foreground">Table</p>
                    <p className="font-medium">
                      Table {order.table.table_number}
                    </p>
                  </div>
                )}
                {order.delivery_location && (
                  <div>
                    <p className="text-muted-foreground">Delivery Location</p>
                    <p className="font-medium">{order.delivery_location.name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{order.customer_phone}</p>
              </div>
              {order.customer_address && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{order.customer_address}</p>
                </div>
              )}
              {order.rider_name && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Rider</p>
                  <p className="font-medium">
                    {order.rider_name} - {order.rider_phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatAmount(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">VAT (7.5%)</span>
                  <span className="font-medium">
                    {formatAmount(order.vat_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Service Charge (2.5%)
                  </span>
                  <span className="font-medium">
                    {formatAmount(order.service_charge)}
                  </span>
                </div>
                {order.takeaway_packs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Takeaway Packs (x{order.takeaway_packs})
                    </span>
                    <span className="font-medium">
                      {formatAmount(order.takeaway_packs * order.takeaway_pack_price)}
                    </span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Delivery Fee
                    </span>
                    <span className="font-medium">
                      {formatAmount(order.delivery_fee)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatAmount(order.total_amount)}</span>
                </div>
              </div>
              {order.payment && (
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Payment Status
                    </span>
                    <Badge
                      variant={
                        order.payment.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {order.payment.status}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-2"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.menu_item_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAmount(item.menu_item_price)} x {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatAmount(item.total_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </section>
    );
  } catch (error) {
    console.error("Error fetching order:", error);
    notFound();
  }
}
