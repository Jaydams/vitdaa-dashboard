import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SupplierDetails } from "./_components/SupplierDetails";
import { notFound } from "next/navigation";

interface SupplierPageProps {
  params: {
    id: string;
  };
}

async function SupplierData({ supplierId }: { supplierId: string }) {
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

  // Fetch supplier details
  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .eq("business_id", businessOwner.id)
    .single();

  if (error || !supplier) {
    notFound();
  }

  return <SupplierDetails supplier={supplier} businessId={businessOwner.id} />;
}

export default function SupplierPage({ params }: SupplierPageProps) {
  return (
    <Suspense fallback={<div>Loading supplier details...</div>}>
      <SupplierData supplierId={params.id} />
    </Suspense>
  );
}
