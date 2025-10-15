"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface InventoryReportsCardsProps {
  businessId: string;
}

export function InventoryReportsCards({
  businessId,
}: InventoryReportsCardsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async (type: string) => {
    setIsGenerating(true);
    try {
      const supabase = createClient();

      let data: any[] = [];
      let filename = "";
      let headers: string[] = [];

      switch (type) {
        case "stock-levels":
          const { data: stockData } = await supabase
            .from("inventory_items")
            .select(
              `
              *,
              category:inventory_categories(name),
              supplier:suppliers(name)
            `
            )
            .eq("business_id", businessId)
            .eq("is_available", true);

          data = stockData || [];
          filename = "stock-levels-report.csv";
          headers = [
            "Name",
            "SKU",
            "Category",
            "Current Stock",
            "Minimum Stock",
            "Unit",
            "Status",
            "Location",
          ];
          break;

        case "low-stock":
          const { data: lowStockData } = await supabase
            .from("inventory_items")
            .select(
              `
              *,
              category:inventory_categories(name),
              supplier:suppliers(name)
            `
            )
            .eq("business_id", businessId)
            .eq("is_available", true);

          data = (lowStockData || []).filter(
            (item) => item.current_stock <= item.minimum_stock
          );
          filename = "low-stock-report.csv";
          headers = [
            "Name",
            "SKU",
            "Category",
            "Current Stock",
            "Minimum Stock",
            "Unit",
            "Shortage",
            "Supplier",
          ];
          break;

        case "expiring":
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

          const { data: expiringData } = await supabase
            .from("inventory_items")
            .select(
              `
              *,
              category:inventory_categories(name),
              supplier:suppliers(name)
            `
            )
            .eq("business_id", businessId)
            .eq("is_available", true)
            .not("expiry_date", "is", null)
            .lte("expiry_date", thirtyDaysFromNow.toISOString().split("T")[0]);

          data = expiringData || [];
          filename = "expiring-items-report.csv";
          headers = [
            "Name",
            "SKU",
            "Category",
            "Current Stock",
            "Expiry Date",
            "Days Until Expiry",
            "Location",
          ];
          break;

        case "transactions":
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          const endDate = new Date().toISOString().split("T")[0];

          const { data: transactionData } = await supabase
            .from("inventory_transactions")
            .select(
              `
              *,
              item:inventory_items(name, unit_of_measure),
              supplier:suppliers(name)
            `
            )
            .eq("business_id", businessId)
            .gte("transaction_date", startDate)
            .lte("transaction_date", endDate)
            .order("transaction_date", { ascending: false });

          data = transactionData || [];
          filename = "transaction-history-report.csv";
          headers = [
            "Date",
            "Item",
            "Type",
            "Quantity",
            "Unit Cost",
            "Total Cost",
            "Previous Stock",
            "New Stock",
            "Supplier",
          ];
          break;

        case "valuation":
          const { data: valuationData } = await supabase
            .from("inventory_items")
            .select(
              `
              *,
              category:inventory_categories(name)
            `
            )
            .eq("business_id", businessId)
            .eq("is_available", true)
            .gt("current_stock", 0);

          data = valuationData || [];
          filename = "inventory-valuation-report.csv";
          headers = [
            "Name",
            "SKU",
            "Category",
            "Current Stock",
            "Unit Cost",
            "Total Value",
            "Unit",
            "Location",
          ];
          break;

        default:
          throw new Error("Invalid report type");
      }

      // Generate CSV content
      const csvContent = generateCSVContent(data, headers, type);
      downloadCSV(csvContent, filename);

      toast.success(`${type.replace("-", " ")} report generated successfully!`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSVContent = (data: any[], headers: string[], type: string) => {
    const rows = data.map((item) => {
      switch (type) {
        case "stock-levels":
          const stockStatus =
            item.current_stock <= 0
              ? "Out of Stock"
              : item.current_stock <= item.minimum_stock
              ? "Low Stock"
              : "In Stock";
          return [
            item.name,
            item.sku || "",
            item.category?.name || "",
            item.current_stock,
            item.minimum_stock,
            item.unit_of_measure,
            stockStatus,
            item.location || "",
          ];

        case "low-stock":
          const shortage = item.minimum_stock - item.current_stock;
          return [
            item.name,
            item.sku || "",
            item.category?.name || "",
            item.current_stock,
            item.minimum_stock,
            item.unit_of_measure,
            shortage > 0 ? shortage : 0,
            item.supplier?.name || "",
          ];

        case "expiring":
          const expiryDate = new Date(item.expiry_date);
          const today = new Date();
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return [
            item.name,
            item.sku || "",
            item.category?.name || "",
            item.current_stock,
            item.expiry_date,
            daysUntilExpiry,
            item.location || "",
          ];

        case "transactions":
          return [
            new Date(item.transaction_date).toLocaleDateString(),
            item.item?.name || "Unknown",
            item.transaction_type,
            `${item.quantity} ${item.item?.unit_of_measure || ""}`,
            `₦${item.unit_cost}`,
            `₦${item.total_cost}`,
            item.previous_stock,
            item.new_stock,
            item.supplier?.name || "",
          ];

        case "valuation":
          const totalValue = (item.current_stock || 0) * (item.unit_cost || 0);
          return [
            item.name,
            item.sku || "",
            item.category?.name || "",
            item.current_stock,
            `₦${item.unit_cost}`,
            `₦${totalValue.toFixed(2)}`,
            item.unit_of_measure,
            item.location || "",
          ];

        default:
          return [];
      }
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Stock Level Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Level Report
          </CardTitle>
          <CardDescription>Current stock levels for all items</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Export a comprehensive report of all inventory items with current
            stock levels, minimum stock requirements, and stock status.
          </p>
          <Button
            className="w-full"
            onClick={() => generateReport("stock-levels")}
            disabled={isGenerating}
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Low Stock Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Low Stock Report
          </CardTitle>
          <CardDescription>Items that need restocking</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a report of all items that are below minimum stock levels
            or out of stock.
          </p>
          <Button
            className="w-full"
            onClick={() => generateReport("low-stock")}
            disabled={isGenerating}
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Expiring Items Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-red-500" />
            Expiring Items Report
          </CardTitle>
          <CardDescription>Items approaching expiration</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Export a report of items that are expiring soon or have already
            expired.
          </p>
          <Button
            className="w-full"
            onClick={() => generateReport("expiring")}
            disabled={isGenerating}
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>Complete transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Export detailed transaction history with date ranges and filtering
            options.
          </p>
          <Button
            className="w-full"
            onClick={() => generateReport("transactions")}
            disabled={isGenerating}
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Inventory Valuation Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Inventory Valuation
          </CardTitle>
          <CardDescription>Total inventory value analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a comprehensive valuation report showing total inventory
            value by category and item.
          </p>
          <Button
            className="w-full"
            onClick={() => generateReport("valuation")}
            disabled={isGenerating}
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Custom Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Custom Report
          </CardTitle>
          <CardDescription>Build your own report</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Create a custom report with specific date ranges, categories, and
            data fields.
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              toast.info("Custom report builder coming soon!");
            }}
            disabled={isGenerating}
          >
            <FileText className="mr-2 h-4 w-4" />
            Build Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
