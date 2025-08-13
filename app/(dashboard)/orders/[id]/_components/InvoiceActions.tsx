"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, Download, MoreVertical } from "lucide-react";
import { Order } from "@/types/order";
import { printInvoice, downloadInvoiceAsPDF, downloadInvoiceAsJSON, downloadInvoiceAsCSV } from "@/lib/invoice-utils";
import { toast } from "sonner";

interface InvoiceActionsProps {
  order: Order;
}

export function InvoiceActions({ order }: InvoiceActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePrintInvoice = async () => {
    setIsLoading(true);
    try {
      printInvoice(order);
      toast.success("Print dialog opened");
    } catch (error) {
      toast.error("Failed to open print dialog");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsLoading(true);
    try {
      downloadInvoiceAsPDF(order);
      toast.success("PDF download started");
    } catch (error) {
      toast.error("Failed to download PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadJSON = async () => {
    setIsLoading(true);
    try {
      downloadInvoiceAsJSON(order);
      toast.success("JSON file downloaded");
    } catch (error) {
      toast.error("Failed to download JSON");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    setIsLoading(true);
    try {
      downloadInvoiceAsCSV(order);
      toast.success("CSV file downloaded");
    } catch (error) {
      toast.error("Failed to download CSV");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Print Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrintInvoice}
        disabled={isLoading}
      >
        <Printer className="size-4 mr-2" />
        Print Invoice
      </Button>

      {/* Download Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            <Download className="size-4 mr-2" />
            Download
            <MoreVertical className="size-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownloadPDF}>
            Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadJSON}>
            Download as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadCSV}>
            Download as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 