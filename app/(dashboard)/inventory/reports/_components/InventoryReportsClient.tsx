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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface InventoryReportsClientProps {
  businessId: string;
}

export function InventoryReportsClient({
  businessId,
}: InventoryReportsClientProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [includeFields, setIncludeFields] = useState({
    stockLevels: true,
    pricing: true,
    suppliers: true,
    categories: true,
    transactions: false,
    alerts: false,
  });

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
          const startDate =
            dateRange.startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0];
          const endDate =
            dateRange.endDate || new Date().toISOString().split("T")[0];

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Quick Report Generation
        </CardTitle>
        <CardDescription>Generate reports with one click</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Button
            onClick={() => generateReport("stock-levels")}
            disabled={isGenerating}
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Download className="h-5 w-5" />
            <span>Stock Levels</span>
          </Button>

          <Button
            onClick={() => generateReport("low-stock")}
            disabled={isGenerating}
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Download className="h-5 w-5" />
            <span>Low Stock</span>
          </Button>

          <Button
            onClick={() => generateReport("expiring")}
            disabled={isGenerating}
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Download className="h-5 w-5" />
            <span>Expiring Items</span>
          </Button>

          <Button
            onClick={() => generateReport("transactions")}
            disabled={isGenerating}
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Download className="h-5 w-5" />
            <span>Transactions</span>
          </Button>

          <Button
            onClick={() => generateReport("valuation")}
            disabled={isGenerating}
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Download className="h-5 w-5" />
            <span>Valuation</span>
          </Button>
        </div>

        {/* Date Range for Transaction Reports */}
        <div className="mt-6 p-4 border rounded-lg">
          <h4 className="font-medium mb-3">Transaction Report Date Range</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
