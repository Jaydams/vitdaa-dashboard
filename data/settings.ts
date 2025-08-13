"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BusinessOwner } from "@/types/auth";

// Update business owner settings and related tables
export async function updateBusinessOwnerSettings(
  id: string,
  data: Partial<BusinessOwner> & {
    delivery_locations?: any[];
    takeaway_packs?: any[];
    number_of_tables?: number;
  }
) {
  const supabase = await createClient();
  // Update business_owner main fields
  const { delivery_locations, takeaway_packs, number_of_tables, ...rest } =
    data;

  // Only allow columns that exist in business_owner
  const allowedFields = [
    "email",
    "first_name",
    "last_name",
    "business_name",
    "business_number",
    "address",
    "profile_image_url",
    "business_type",
    "username",
    "description",
    "facebook_url",
    "instagram_url",
    "x_url",
    "cover_image_url",
    "phoneNumber",
    "account_type",
    "email_verified",
    "phone_verified",
    "bvn",
    "bvn_verified",
    "identity_type",
    "identity_number",
    "identity_image_url",
    "identity_verified",
    "maplerad_customer_id",
    "admin_pin_hash",
  ];
  // Remove undefined/null and only keep allowed fields
  const ownerFields: Record<string, any> = {};
  for (const key of allowedFields) {
    if (rest[key] !== undefined && rest[key] !== null) {
      ownerFields[key] = rest[key];
    }
  }

  const { error } = await supabase
    .from("business_owner")
    .update(ownerFields)
    .eq("id", id);
  if (error) {
    console.log("Update database details error", error);
    throw error;
  }

  // Delivery locations
  if (Array.isArray(delivery_locations)) {
    // Remove all and re-insert for simplicity
    const { error: delLocDeleteError } = await supabase
      .from("delivery_locations")
      .delete()
      .eq("business_id", id);
    if (delLocDeleteError) {
      console.error("Failed to delete delivery locations", delLocDeleteError);
      throw new Error("Failed to delete delivery locations");
    }
    if (delivery_locations.length > 0) {
      const { error: delLocInsertError } = await supabase
        .from("delivery_locations")
        .insert(delivery_locations.map((loc) => ({ ...loc, business_id: id })));
      if (delLocInsertError) {
        console.error("Failed to insert delivery locations", delLocInsertError);
        throw new Error("Failed to insert delivery locations");
      }
    }
  }

  // Takeaway packs
  if (Array.isArray(takeaway_packs)) {
    const { error: packDeleteError } = await supabase
      .from("takeaway_packs")
      .delete()
      .eq("business_id", id);
    if (packDeleteError) {
      console.error("Failed to delete takeaway packs", packDeleteError);
      throw new Error("Failed to delete takeaway packs");
    }
    if (takeaway_packs.length > 0) {
      const { error: packInsertError } = await supabase
        .from("takeaway_packs")
        .insert(takeaway_packs.map((pack) => ({ ...pack, business_id: id })));
      if (packInsertError) {
        console.error("Failed to insert takeaway packs", packInsertError);
        throw new Error("Failed to insert takeaway packs");
      }
    }
  }

  // Tables: update number of tables
  if (typeof number_of_tables === "number") {
    // Get current tables
    const { data: tablesRaw, error: tablesFetchError } = await supabase
      .from("tables")
      .select("id")
      .eq("restaurant_id", id);
    if (tablesFetchError) {
      console.error("Failed to fetch tables", tablesFetchError);
      throw new Error("Failed to fetch tables");
    }
    const tables = tablesRaw ?? [];
    const currentCount = tables.length;
    if (number_of_tables > currentCount) {
      // Add new tables
      const toAdd = number_of_tables - currentCount;
      const newTables = Array.from({ length: toAdd }, (_, i) => ({
        restaurant_id: id,
        table_number: String(currentCount + i + 1),
        capacity: 4,
      }));
      const { error: tableInsertError } = await supabase
        .from("tables")
        .insert(newTables);
      if (tableInsertError) {
        console.error("Failed to insert new tables", tableInsertError);
        throw new Error("Failed to insert new tables");
      }
    } else if (number_of_tables < currentCount) {
      // Remove extra tables (remove highest table_number)
      const toRemove = tables.slice(number_of_tables);
      if (toRemove.length > 0) {
        const { error: tableDeleteError } = await supabase
          .from("tables")
          .delete()
          .in(
            "id",
            toRemove.map((t) => t.id)
          );
        if (tableDeleteError) {
          console.error("Failed to delete tables", tableDeleteError);
          throw new Error("Failed to delete tables");
        }
      }
    }
  }

  revalidatePath("/dashboard/settings");
}

// Fetch all settings for the business owner
export async function getBusinessOwnerSettings(id: string) {
  const supabase = await createClient();
  const { data: owner, error } = await supabase
    .from("business_owner")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  // Fetch delivery locations
  const { data: delivery_locations } = await supabase
    .from("delivery_locations")
    .select("id, name, price, state")
    .eq("business_id", id);
  // Fetch takeaway packs
  const { data: takeaway_packs } = await supabase
    .from("takeaway_packs")
    .select("id, name, price")
    .eq("business_id", id);
  // Fetch number of tables
  const { count } = await supabase
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", id);

  // Ensure all fields are defined (never undefined/null) and match form expectations
  return {
    id: owner?.id ?? "",
    business_name: owner?.business_name ?? "",
    business_number: owner?.business_number ?? "",
    description: owner?.description ?? "",
    address: {
      street: owner?.address?.street ?? "",
      city: owner?.address?.city ?? "",
      state: owner?.address?.state ?? "",
      country: owner?.address?.country ?? "",
      postal_code: owner?.address?.postal_code ?? "",
      raw: owner?.address?.raw ?? "",
    },
    profile_image_url: owner?.profile_image_url ?? "",
    cover_image_url: owner?.cover_image_url ?? "",
    facebook_url: owner?.facebook_url ?? "",
    instagram_url: owner?.instagram_url ?? "",
    x_url: owner?.x_url ?? "",
    phoneNumber: owner?.phoneNumber ?? "",
    delivery_locations: delivery_locations ?? [],
    takeaway_packs: takeaway_packs ?? [],
    number_of_tables: count ?? 0,
    // Add any other fields from business_owner as needed, with defaults
    ...owner,
  };
}
