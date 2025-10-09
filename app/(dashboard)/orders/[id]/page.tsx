import { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import PageTitle from "@/components/shared/PageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatAmount } from "@/helpers/formatAmount";
import { fetchOrder } from "@/actions/order-actions";
import { OrderBadgeVariants } from "@/constants/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { InvoiceActions } from "./_components/InvoiceActions";
import { OrderPageClient } from "./_components/OrderPageClient";

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
            <PageTitle>{`Order #${order.invoice_no}`}</PageTitle>
          </div>

          <InvoiceActions order={order} />
        </div>

        <OrderPageClient order={order} />
      </section>
    );
  } catch (error) {
    console.error("Error fetching order:", error);
    notFound();
  }
}
