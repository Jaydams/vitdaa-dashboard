import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { EditItemForm } from "../../_components/EditItemForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

interface EditInventoryItemPageProps {
  params: {
    id: string;
  };
}

async function EditInventoryItemData({ itemId }: { itemId: string }) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/inventory/items/${itemId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Item
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Edit {item.name}
          </h1>
          <p className="text-muted-foreground">
            Update the inventory item details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Item Details
          </CardTitle>
          <CardDescription>
            Update the details for this inventory item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditItemForm businessId={businessOwner.id} item={item} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditInventoryItemPage({
  params,
}: EditInventoryItemPageProps) {
  return (
    <Suspense fallback={<div>Loading item...</div>}>
      <EditInventoryItemData itemId={params.id} />
    </Suspense>
  );
}
