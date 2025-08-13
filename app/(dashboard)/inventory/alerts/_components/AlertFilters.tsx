"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface AlertFiltersProps {
  resolved: boolean | undefined;
  alertType: string;
  severity: string;
}

export function AlertFilters({ 
  resolved, 
  alertType, 
  severity 
}: AlertFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    // Always remove page when filters change
    params.delete("page");
    
    router.push(`?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <Select 
            defaultValue={resolved === undefined ? "all" : resolved ? "true" : "false"}
            onValueChange={(value) => {
              updateSearchParams({ resolved: value === "all" ? null : value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Alerts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Alerts</SelectItem>
              <SelectItem value="false">Active Alerts</SelectItem>
              <SelectItem value="true">Resolved Alerts</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            defaultValue={alertType || "all"}
            onValueChange={(value) => {
              updateSearchParams({ alertType: value === "all" ? null : value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="overstock">Overstock</SelectItem>
              <SelectItem value="price_change">Price Change</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            defaultValue={severity || "all"}
            onValueChange={(value) => {
              updateSearchParams({ severity: value === "all" ? null : value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
