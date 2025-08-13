"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface InventoryFiltersProps {
  search: string;
  categoryId: string;
  lowStock: boolean;
  expiring: boolean;
  categories: any[];
}

export function InventoryFilters({ 
  search, 
  categoryId, 
  lowStock, 
  expiring, 
  categories 
}: InventoryFiltersProps) {
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
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              defaultValue={search}
              className="pl-10"
              onChange={(e) => {
                updateSearchParams({ search: e.target.value || null });
              }}
            />
          </div>
          
          <Select 
            defaultValue={categoryId || "all"} 
            onValueChange={(value) => {
              updateSearchParams({ category: value === "all" ? null : value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={lowStock ? "default" : "outline"}
            onClick={() => {
              updateSearchParams({ lowStock: lowStock ? null : "true" });
            }}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Low Stock
          </Button>

          <Button
            variant={expiring ? "default" : "outline"}
            onClick={() => {
              updateSearchParams({ expiring: expiring ? null : "true" });
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Expiring Soon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
