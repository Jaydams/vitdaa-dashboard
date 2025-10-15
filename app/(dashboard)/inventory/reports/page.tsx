import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { InventoryReportsClient } from "./_components/InventoryReportsClient";
import { InventoryReportsCards } from "./_components/InventoryReportsCards";

async function InventoryReportsData() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Reports</h1>
        <p className="text-muted-foreground">
          Generate and export comprehensive inventory reports
        </p>
      </div>

      <InventoryReportsCards businessId={businessOwner.id} />

      <InventoryReportsClient businessId={businessOwner.id} />
    </div>
  );
}

export default function InventoryReportsPage() {
  return (
    <Suspense fallback={<div>Loading reports...</div>}>
      <InventoryReportsData />
    </Suspense>
  );
}
