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
    const value = (rest as any)[key];
    if (value !== undefined && value !== null) {
      ownerFields[key] = value;
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

  // Delivery locations - handle foreign key constraints
  if (Array.isArray(delivery_locations)) {
    console.log("Updating delivery locations:", delivery_locations);

    // Get existing active delivery locations (with fallback for tables without status column)
    let existingLocations;
    try {
      // Try to fetch with status filtering
      const { data, error } = await supabase
        .from("delivery_locations")
        .select("id, name, price, state, status")
        .eq("business_id", id)
        .or("status.is.null,status.eq.active"); // Include null status (old records) and active

      if (error && error.message.includes("status")) {
        throw error; // Status column doesn't exist, trigger fallback
      }
      existingLocations = data;
    } catch (statusError) {
      // Fallback: status column doesn't exist yet, fetch all
      console.log(
        "Status column not found in update, fetching all delivery locations"
      );
      const { data } = await supabase
        .from("delivery_locations")
        .select("id, name, price, state")
        .eq("business_id", id);
      existingLocations = data;
    }

    const existing = existingLocations || [];
    console.log("Existing active delivery locations:", existing);

    // Instead of deleting all, we'll update/insert/delete selectively
    const newLocationIds = new Set();

    // Update or insert delivery locations
    for (const location of delivery_locations) {
      if (location.id) {
        // Update existing location
        const { error: updateError } = await supabase
          .from("delivery_locations")
          .update({
            name: location.name,
            price: location.price,
            state: location.state,
          })
          .eq("id", location.id)
          .eq("business_id", id);

        if (updateError) {
          console.error("Failed to update delivery location", updateError);
          throw new Error("Failed to update delivery location");
        }
        newLocationIds.add(location.id);
      } else {
        // Insert new location
        const { data: newLocation, error: insertError } = await supabase
          .from("delivery_locations")
          .insert({
            ...location,
            business_id: id,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Failed to insert delivery location", insertError);
          throw new Error("Failed to insert delivery location");
        }
        if (newLocation) {
          newLocationIds.add(newLocation.id);
        }
      }
    }

    // Only delete locations that are not referenced by orders
    const locationsToDelete = existing.filter(
      (loc) => !newLocationIds.has(loc.id)
    );
    console.log("Locations to delete:", locationsToDelete);

    for (const location of locationsToDelete) {
      // Try to physically delete first (if constraints allow)
      const { error: deleteError } = await supabase
        .from("delivery_locations")
        .delete()
        .eq("id", location.id);

      if (deleteError) {
        console.log(
          "Physical deletion failed, using soft delete:",
          deleteError.message
        );

        // Fallback to soft delete - mark as inactive
        const { error: softDeleteError } = await supabase
          .from("delivery_locations")
          .update({ status: "inactive" })
          .eq("id", location.id);

        if (softDeleteError) {
          if (softDeleteError.message.includes("status")) {
            console.log(
              "Status column doesn't exist yet, location will remain until migration is run"
            );
          } else {
            console.error(
              "Failed to soft delete delivery location",
              softDeleteError
            );
          }
          // Don't throw error - just log it
        } else {
          console.log(
            "Successfully soft deleted delivery location:",
            location.id
          );
        }
      } else {
        console.log(
          "Successfully physically deleted delivery location:",
          location.id
        );
      }
    }
  }

  // Takeaway packs - handle foreign key constraints
  if (Array.isArray(takeaway_packs)) {
    console.log("Updating takeaway packs:", takeaway_packs);

    // Get existing takeaway packs
    const { data: existingPacks } = await supabase
      .from("takeaway_packs")
      .select("id, name, price")
      .eq("business_id", id);

    const existing = existingPacks || [];
    console.log("Existing takeaway packs:", existing);

    const newPackIds = new Set();

    // Update or insert takeaway packs
    for (const pack of takeaway_packs) {
      if (pack.id) {
        // Update existing pack
        const { error: updateError } = await supabase
          .from("takeaway_packs")
          .update({
            name: pack.name,
            price: pack.price,
          })
          .eq("id", pack.id)
          .eq("business_id", id);

        if (updateError) {
          console.error("Failed to update takeaway pack", updateError);
          throw new Error("Failed to update takeaway pack");
        }
        newPackIds.add(pack.id);
      } else {
        // Insert new pack
        const { data: newPack, error: insertError } = await supabase
          .from("takeaway_packs")
          .insert({
            ...pack,
            business_id: id,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Failed to insert takeaway pack", insertError);
          throw new Error("Failed to insert takeaway pack");
        }
        if (newPack) {
          newPackIds.add(newPack.id);
        }
      }
    }

    // Only delete packs that are not referenced by orders
    const packsToDelete = existing.filter((pack) => !newPackIds.has(pack.id));
    console.log("Packs to delete:", packsToDelete);

    for (const pack of packsToDelete) {
      // Takeaway packs are not directly referenced by orders (orders only store pack count and price)
      // So we can safely delete them without foreign key constraint issues
      const { error: deleteError } = await supabase
        .from("takeaway_packs")
        .delete()
        .eq("id", pack.id);

      if (deleteError) {
        console.error("Failed to delete takeaway pack", deleteError);
        // Don't throw error for delete failures - just log them
      } else {
        console.log("Successfully deleted takeaway pack:", pack.id);
      }
    }
  }

  // Tables: update number of tables - handle foreign key constraints
  if (typeof number_of_tables === "number") {
    // Get current active tables with their details
    const { data: tablesRaw, error: tablesFetchError } = await supabase
      .from("tables")
      .select("id, table_number, capacity")
      .eq("restaurant_id", id)
      .neq("status", "inactive")
      .order("table_number");

    if (tablesFetchError) {
      console.error("Failed to fetch tables", tablesFetchError);
      throw new Error("Failed to fetch tables");
    }

    const tables = tablesRaw ?? [];
    const currentCount = tables.length;

    if (number_of_tables > currentCount) {
      // Add new tables - this is always safe
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
      // Reduce tables - only delete tables that are not referenced by orders
      const tablesToRemove = tables.slice(number_of_tables);

      for (const table of tablesToRemove) {
        // Check if table is referenced by any orders
        const { count: orderCount } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("table_id", table.id);

        if (orderCount === 0) {
          // Safe to delete - no orders reference this table
          const { error: deleteError } = await supabase
            .from("tables")
            .delete()
            .eq("id", table.id);

          if (deleteError) {
            console.error(
              `Failed to delete table ${table.table_number}:`,
              deleteError
            );
            // Don't throw error - just log and continue
          }
        } else {
          // Table is referenced by orders - mark it as inactive instead of deleting
          const { error: updateError } = await supabase
            .from("tables")
            .update({
              status: "inactive",
              updated_at: new Date().toISOString(),
            })
            .eq("id", table.id);

          if (updateError) {
            console.error(
              `Failed to deactivate table ${table.table_number}:`,
              updateError
            );
          }
        }
      }

      // Note: The actual count might be higher than requested if some tables couldn't be deleted
      // This maintains data integrity while respecting the user's intent as much as possible
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
  // Fetch active delivery locations only (with fallback for tables without status column)
  let delivery_locations;
  try {
    // Try to fetch with status filtering
    const { data, error } = await supabase
      .from("delivery_locations")
      .select("id, name, price, state, status")
      .eq("business_id", id)
      .or("status.is.null,status.eq.active"); // Include null status (old records) and active

    if (error && error.message.includes("status")) {
      throw error; // Status column doesn't exist, trigger fallback
    }
    delivery_locations = data;
  } catch (statusError) {
    // Fallback: status column doesn't exist yet, fetch all
    console.log("Status column not found, fetching all delivery locations");
    const { data } = await supabase
      .from("delivery_locations")
      .select("id, name, price, state")
      .eq("business_id", id);
    delivery_locations = data;
  }
  // Fetch takeaway packs
  const { data: takeaway_packs } = await supabase
    .from("takeaway_packs")
    .select("id, name, price")
    .eq("business_id", id);
  // Fetch number of active tables
  const { count } = await supabase
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", id)
    .neq("status", "inactive");

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
