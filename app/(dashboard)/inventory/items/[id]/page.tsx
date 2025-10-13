import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ArrowLeft,
  Edit,
  AlertTriangle,
  Calendar,
  MapPin,
  Barcode,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface InventoryItemPageProps {
  params: {
    id: string;
  };
}

async function InventoryItemDetails({ itemId }: { itemId: string }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const { data: businessOwner } = await supabase
    .from("business_owner")
    .select("id")
    .eq("email", user.email)
    .single();

  if (!businessOwner) {
    return <div>Business owner not found</div>;
  }

  // Fetch the inventory item
  const { data: item, error } = await supabase
    .from("inventory_items")
    .select(
      `
      *,
      category:inventory_categories(*),
      supplier:suppliers(*)
    `
    )
    .eq("id", itemId)
    .eq("business_id", businessOwner.id)
    .single();

  if (error || !item) {
    notFound();
  }

  const getStockStatus = () => {
    if (item.current_stock <= 0)
      return { status: "Out of Stock", variant: "destructive" as const };
    if (item.current_stock <= item.minimum_stock)
      return { status: "Low Stock", variant: "secondary" as const };
    return { status: "In Stock", variant: "default" as const };
  };

  const getExpiryStatus = () => {
    if (!item.expiry_date) return null;
    const expiryDate = new Date(item.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0)
      return { status: "Expired", variant: "destructive" as const };
    if (daysUntilExpiry <= 7)
      return { status: "Expiring Soon", variant: "secondary" as const };
    return null;
  };

  const stockStatus = getStockStatus();
  const expiryStatus = getExpiryStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory/items">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Items
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
            <p className="text-muted-foreground">
              {item.description || "No description available"}
            </p>
          </div>
        </div>
        <Link href={`/inventory/items/${item.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Item
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  SKU
                </label>
                <p className="flex items-center gap-2">
                  <Barcode className="h-4 w-4" />
                  {item.sku || "Not specified"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Category
                </label>
                <p>{item.category?.name || "Uncategorized"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Supplier
                </label>
                <p>{item.supplier?.name || "Not specified"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Location
                </label>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {item.location || "Not specified"}
                </p>
              </div>

              {item.barcode && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Barcode
                  </label>
                  <p>{item.barcode}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Stock Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Current Stock
                </label>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {item.current_stock} {item.unit_of_measure}
                  </p>
                  <Badge variant={stockStatus.variant}>
                    {stockStatus.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Minimum Stock
                  </label>
                  <p>
                    {item.minimum_stock} {item.unit_of_measure}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Maximum Stock
                  </label>
                  <p>
                    {item.maximum_stock || "Not set"} {item.unit_of_measure}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Reorder Point
                  </label>
                  <p>
                    {item.reorder_point || "Not set"} {item.unit_of_measure}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Reorder Quantity
                  </label>
                  <p>
                    {item.reorder_quantity || "Not set"} {item.unit_of_measure}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Unit Cost
                </label>
                <p className="text-lg font-semibold">
                  ₦{item.unit_cost?.toFixed(2) || "0.00"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Selling Price
                </label>
                <p className="text-lg font-semibold">
                  ₦{item.selling_price?.toFixed(2) || "Not set"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Total Value
                </label>
                <p className="text-lg font-semibold">
                  ₦
                  {((item.current_stock || 0) * (item.unit_cost || 0)).toFixed(
                    2
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {item.expiry_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Expiry Date
                  </label>
                  <div className="flex items-center gap-2">
                    <p>{new Date(item.expiry_date).toLocaleDateString()}</p>
                    {expiryStatus && (
                      <Badge variant={expiryStatus.variant}>
                        {expiryStatus.status}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Properties
                </label>
                <div className="flex flex-wrap gap-2">
                  {item.is_perishable && (
                    <Badge variant="outline">Perishable</Badge>
                  )}
                  {item.is_alcoholic && (
                    <Badge variant="outline">Alcoholic</Badge>
                  )}
                  {item.is_ingredient && (
                    <Badge variant="outline">Used in Menu Items</Badge>
                  )}
                  {!item.is_perishable &&
                    !item.is_alcoholic &&
                    !item.is_ingredient && (
                      <span className="text-sm text-muted-foreground">
                        No special properties
                      </span>
                    )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Created
                </label>
                <p>{new Date(item.created_at).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </label>
                <p>{new Date(item.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InventoryItemPage({ params }: InventoryItemPageProps) {
  return (
    <Suspense fallback={<div>Loading item details...</div>}>
      <InventoryItemDetails itemId={params.id} />
    </Suspense>
  );
}
