import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchInventoryItems, fetchInventoryCategories } from "@/data/inventory";
import { InventoryFilters } from "./_components/InventoryFilters";
import { InventoryItemsList } from "./_components/InventoryItemsList";

interface InventoryItemsListProps {
  searchParams: {
    page?: string;
    search?: string;
    category?: string;
    lowStock?: string;
    expiring?: string;
  };
}

async function InventoryItemsData({ searchParams }: InventoryItemsListProps) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
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

  const page = parseInt(searchParams.page || "1");
  const search = searchParams.search || "";
  const categoryId = searchParams.category || "";
  const lowStock = searchParams.lowStock === "true";
  const expiring = searchParams.expiring === "true";

  const itemsData = await fetchInventoryItems({
    page,
    perPage: 10,
    businessId: businessOwner.id,
    categoryId: categoryId || undefined,
    search: search || undefined,
    lowStock,
    expiring,
  });

  const categoriesData = await fetchInventoryCategories({
    page: 1,
    perPage: 100,
    businessId: businessOwner.id,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <InventoryFilters 
        search={search}
        categoryId={categoryId}
        lowStock={lowStock}
        expiring={expiring}
        categories={categoriesData.data}
      />

      {/* Items List */}
      <InventoryItemsList 
        items={itemsData.data}
        count={itemsData.count}
        page={page}
        totalPages={itemsData.totalPages}
        searchParams={searchParams}
      />
    </div>
  );
}

export default function InventoryItemsPage({ searchParams }: { searchParams: any }) {
  return (
    <Suspense fallback={<div>Loading inventory items...</div>}>
      <InventoryItemsData searchParams={searchParams} />
    </Suspense>
  );
}
