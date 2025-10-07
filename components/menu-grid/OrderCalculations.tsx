"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderCalculations as OrderCalculationsType } from "@/hooks/use-order-state";
import { formatAmount } from "@/helpers/formatAmount";

interface OrderCalculationsProps {
  calculations: OrderCalculationsType;
  className?: string;
}

/**
 * Component for displaying order calculations breakdown
 * Shows subtotal, VAT, service charge, and total with dynamic rates
 * Uses the same formatting as existing order system
 */
export function OrderCalculations({
  calculations,
  className,
}: OrderCalculationsProps) {
  const {
    subtotal,
    vatAmount,
    serviceChargeAmount,
    total,
    vatRate,
    serviceChargeRate,
  } = calculations;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Order Summary
        </h4>

        <div className="space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-sm">Subtotal</span>
            <span className="text-sm font-medium">
              {formatAmount(subtotal)}
            </span>
          </div>

          {/* VAT */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              VAT ({vatRate}%)
            </span>
            <span className="text-sm text-muted-foreground">
              {formatAmount(vatAmount)}
            </span>
          </div>

          {/* Service Charge */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Service Charge ({serviceChargeRate}%)
            </span>
            <span className="text-sm text-muted-foreground">
              {formatAmount(serviceChargeAmount)}
            </span>
          </div>

          <Separator className="my-2" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg text-primary">
              {formatAmount(total)}
            </span>
          </div>
        </div>

        {/* Rate Information */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Rates: VAT {vatRate}% • Service Charge {serviceChargeRate}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
