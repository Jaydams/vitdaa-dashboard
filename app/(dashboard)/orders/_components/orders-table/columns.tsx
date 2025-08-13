import Link from "next/link";
import { Printer, ZoomIn } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatAmount } from "@/helpers/formatAmount";
import { printInvoice, downloadInvoiceAsPDF, downloadInvoiceAsJSON, downloadInvoiceAsCSV } from "@/lib/invoice-utils";

import { ORDER_STATUSES } from "@/constants/orders";
import { OrderBadgeVariants } from "@/constants/badge";
import { Order, OrderStatus } from "@/types/order";
import { SkeletonColumn } from "@/types/skeleton";
import { updateOrderStatus } from "@/actions/order-actions";
import { toast } from "sonner";

const changeStatus = async (value: OrderStatus, orderId: string) => {
  try {
    await updateOrderStatus(orderId, value);
    toast.success("Order status updated successfully");
  } catch (error) {
    toast.error("Failed to update order status");
  }
};

const handlePrintInvoice = (order: Order) => {
  try {
    printInvoice(order);
    toast.success("Print dialog opened");
  } catch (error) {
    toast.error("Failed to open print dialog");
  }
};

const handleDownloadPDF = (order: Order) => {
  try {
    downloadInvoiceAsPDF(order);
    toast.success("PDF download started");
  } catch (error) {
    toast.error("Failed to download PDF");
  }
};

const handleDownloadJSON = (order: Order) => {
  try {
    downloadInvoiceAsJSON(order);
    toast.success("JSON file downloaded");
  } catch (error) {
    toast.error("Failed to download JSON");
  }
};

const handleDownloadCSV = (order: Order) => {
  try {
    downloadInvoiceAsCSV(order);
    toast.success("CSV file downloaded");
  } catch (error) {
    toast.error("Failed to download CSV");
  }
};

export const columns: ColumnDef<Order>[] = [
  {
    header: "invoice no",
    cell: ({ row }) => row.original.invoice_no,
  },
  {
    header: "order time",
    cell: ({ row }) =>
      `${format(new Date(row.original.order_time), "PP")} ${format(
        new Date(row.original.order_time),
        "p"
      )}`,
  },
  {
    header: "customer name",
    cell: ({ row }) => (
      <span className="block max-w-52 truncate">
        {row.original.customer_name}
      </span>
    ),
  },
  {
    header: "method",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.payment_method}</span>
    ),
  },
  {
    header: "amount",
    cell: ({ row }) => formatAmount(row.original.total_amount),
  },
  {
    header: "status",
    cell: ({ row }) => {
      const status = row.original.status;

      return (
        <Badge
          variant={OrderBadgeVariants[status]}
          className="flex-shrink-0 text-xs capitalize"
        >
          {status}
        </Badge>
      );
    },
  },
  {
    header: "action",
    cell: ({ row }) => {
      const orderId = row.original.id;

      return (
        <Select
          onValueChange={(value: OrderStatus) => changeStatus(value, orderId)}
        >
          <SelectTrigger className="capitalize">
            <SelectValue placeholder={row.original.status} />
          </SelectTrigger>

          <SelectContent>
            {ORDER_STATUSES.map((badgeStatus) => (
              <SelectItem
                value={badgeStatus}
                key={badgeStatus}
                className="capitalize"
              >
                {badgeStatus}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
  },
  {
    header: "invoice",
    cell: ({ row }) => {
      const order = row.original;
      
      return (
        <div className="flex items-center gap-1">
          {/* Print Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePrintInvoice(order)}
                className="text-foreground"
              >
                <Printer className="size-5" />
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              <p>Print Invoice</p>
            </TooltipContent>
          </Tooltip>

          {/* Download Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground"
                  >
                    <ZoomIn className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>

              <TooltipContent>
                <p>Download Options</p>
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownloadPDF(order)}>
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadJSON(order)}>
                Download as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadCSV(order)}>
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/orders/${order.id}`}>
                  View Details
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export const skeletonColumns: SkeletonColumn[] = [
  {
    header: "invoice no",
    cell: <Skeleton className="w-20 h-8" />,
  },
  {
    header: "order time",
    cell: <Skeleton className="w-32 h-8" />,
  },
  {
    header: "customer name",
    cell: <Skeleton className="w-32 h-8" />,
  },
  {
    header: "method",
    cell: <Skeleton className="w-14 h-8" />,
  },
  {
    header: "amount",
    cell: <Skeleton className="w-16 h-8" />,
  },
  {
    header: "status",
    cell: <Skeleton className="w-16 h-8" />,
  },
  {
    header: "action",
    cell: <Skeleton className="w-24 h-10" />,
  },
  {
    header: "invoice",
    cell: <Skeleton className="w-20 h-8" />,
  },
];
