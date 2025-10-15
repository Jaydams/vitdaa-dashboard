import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SuppliersManager } from "./_components/SuppliersManager";

async function SuppliersData() {
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
        <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        <p className="text-muted-foreground">
          Manage your suppliers, vendors, and their details including payment
          information
        </p>
      </div>

      <SuppliersManager businessId={businessOwner.id} />
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<div>Loading suppliers...</div>}>
      <SuppliersData />
    </Suspense>
  );
}
