import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchInventoryTransactions, fetchInventoryItems, fetchSuppliers } from "@/data/inventory";
import { TransactionFilters } from "./_components/TransactionFilters";
import { InventoryTransactionsList } from "./_components/InventoryTransactionsList";

interface InventoryTransactionsListProps {
  searchParams: {
    page?: string;
    itemId?: string;
    transactionType?: string;
  };
}

async function InventoryTransactionsData({ searchParams }: InventoryTransactionsListProps) {
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
  const itemId = searchParams.itemId || "";
  const transactionType = searchParams.transactionType || "";

  const transactionsData = await fetchInventoryTransactions({
    page,
    perPage: 10,
    businessId: businessOwner.id,
    itemId: itemId || undefined,
    transactionType: transactionType || undefined,
  });

  const itemsData = await fetchInventoryItems({
    page: 1,
    perPage: 100,
    businessId: businessOwner.id,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TransactionFilters 
        itemId={itemId}
        transactionType={transactionType}
        items={itemsData.data}
      />

      {/* Transactions List */}
      <InventoryTransactionsList 
        transactions={transactionsData.data}
        count={transactionsData.count}
        page={page}
        totalPages={transactionsData.totalPages}
        searchParams={searchParams}
      />
    </div>
  );
}

export default function InventoryTransactionsPage({ searchParams }: { searchParams: any }) {
  return (
    <Suspense fallback={<div>Loading transactions...</div>}>
      <InventoryTransactionsData searchParams={searchParams} />
    </Suspense>
  );
}
