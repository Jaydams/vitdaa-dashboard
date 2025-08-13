"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Plus, 
  Eye,
  Edit
} from "lucide-react";
import Link from "next/link";
import { AddItemModal } from "./AddItemModal";

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  current_stock: number;
  minimum_stock: number;
  unit_of_measure: string;
  unit_cost: number;
  location?: string;
  expiry_date?: string;
  category?: {
    name: string;
  };
}

interface InventoryItemsListProps {
  items: InventoryItem[];
  count: number;
  page: number;
  totalPages: number;
  searchParams: any;
}

export function InventoryItemsList({ 
  items, 
  count, 
  page, 
  totalPages, 
  searchParams 
}: InventoryItemsListProps) {
  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= 0) return { status: "Out of Stock", variant: "destructive" as const };
    if (item.current_stock <= item.minimum_stock) return { status: "Low Stock", variant: "secondary" as const };
    return { status: "In Stock", variant: "default" as const };
  };

  const getExpiryStatus = (item: InventoryItem) => {
    if (!item.expiry_date) return null;
    const expiryDate = new Date(item.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: "Expired", variant: "destructive" as const };
    if (daysUntilExpiry <= 7) return { status: "Expiring Soon", variant: "secondary" as const };
    return null;
  };

  const hasFilters = searchParams.search || searchParams.category || searchParams.lowStock || searchParams.expiring;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Items</h1>
          <p className="text-muted-foreground">
            Manage your inventory items and stock levels
          </p>
        </div>
        <AddItemModal onItemAdded={() => {
          // This will trigger a re-render when an item is added
          window.location.reload();
        }} />
      </div>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            {count} items found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">
                {hasFilters 
                  ? "Try adjusting your filters" 
                  : "Get started by adding your first inventory item"
                }
              </p>
              {!hasFilters && (
                <AddItemModal onItemAdded={() => {
                  window.location.reload();
                }} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const stockStatus = getStockStatus(item);
                const expiryStatus = getExpiryStatus(item);

                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm">
                              SKU: {item.sku || "N/A"}
                            </span>
                            <span className="text-sm">
                              Category: {item.category?.name || "Uncategorized"}
                            </span>
                            <span className="text-sm">
                              Location: {item.location || "Not specified"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">
                          {item.current_stock} {item.unit_of_measure}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Min: {item.minimum_stock} | Cost: ₦{item.unit_cost}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <Badge variant={stockStatus.variant}>
                          {stockStatus.status}
                        </Badge>
                        {expiryStatus && (
                          <Badge variant={expiryStatus.variant}>
                            {expiryStatus.status}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link href={`/inventory/items/${item.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/inventory/items/${item.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`?${new URLSearchParams({ ...searchParams, page: (page - 1).toString() })}`}>
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`?${new URLSearchParams({ ...searchParams, page: (page + 1).toString() })}`}>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
