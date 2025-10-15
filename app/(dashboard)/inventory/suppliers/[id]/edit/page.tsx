import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { EditSupplierForm } from "./_components/EditSupplierForm";
import { notFound } from "next/navigation";

interface EditSupplierPageProps {
  params: {
    id: string;
  };
}

async function EditSupplierData({ supplierId }: { supplierId: string }) {
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

  return <EditSupplierForm supplier={supplier} businessId={businessOwner.id} />;
}

export default function EditSupplierPage({ params }: EditSupplierPageProps) {
  return (
    <Suspense fallback={<div>Loading supplier...</div>}>
      <EditSupplierData supplierId={params.id} />
    </Suspense>
  );
}
