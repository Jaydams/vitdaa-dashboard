"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Fetch all menus with their item counts
export async function fetchAllMenusWithItemCount(ownerId: string) {
  const supabase = await createClient();
  // Get all menus for this owner
  const { data: menus, error } = await supabase
    .from("menu")
    .select("id, menu_name")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // For each menu, count menu_items
  const results = await Promise.all(
    (menus || []).map(async (menu) => {
      const { count } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("menu_id", menu.id);
      return {
        id: menu.id,
        menu_name: menu.menu_name,
        item_count: count || 0,
      };
    })
  );
  return results;
}

// Add a new menu
export async function addMenu(formData: FormData) {
  const supabase = await createClient();
  const menu_name = formData.get("menu_name") as string;
  const owner_id = formData.get("owner_id") as string;
  if (!menu_name || !owner_id)
    return { success: false, error: "Missing fields" };
  const { error } = await supabase
    .from("menu")
    .insert([{ menu_name, owner_id }]);
  revalidatePath("/(dashboard)/categories");
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Delete a menu
export async function deleteMenu(menuId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu").delete().eq("id", menuId);
  revalidatePath("/(dashboard)/categories");
  if (error) return { success: false, error: error.message };
  return { success: true };
}
