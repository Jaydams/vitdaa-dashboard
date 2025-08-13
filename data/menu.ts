"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache"; // Used to revalidate data for the given path
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs for images

// --- Type Definitions ---
// Matches the structure of your 'menu_items' table in database.sql
// MenuItem now includes menu_name from joined menu table
export interface MenuItem {
  id: number;
  menu_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  created_at?: string;
  profile_image_url?: string;
  status?: "available" | "unavailable";
  menu_name?: string; // Added for join
}

// Query parameters for pagination
interface PaginationQueryProps {
  page: number;
  perPage?: number;
}

// --- Server Action Functions ---

/**
 * Fetches menu items with pagination from Supabase.
 * @param {PaginationQueryProps} { page, perPage } - Pagination parameters.
 * @returns {Promise<PaginationData<MenuItem>>} - Paginated list of menu items.
 */
export async function fetchMenu({
  page,
  perPage = 10,
  ownerId,
}: PaginationQueryProps & { ownerId: string }): Promise<
  import("@/types/pagination").PaginationData<MenuItem>
> {
  const supabase = await createClient();
  try {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage - 1;

    // Join menu_items with menu to get menu_name, filter by menu.owner_id
    const { data, count, error } = await supabase
      .from("menu_items")
      .select("*, menu:menu_id(menu_name, owner_id)", { count: "exact" })
      .range(startIndex, endIndex)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching menu items:", error.message);
      throw error;
    }

    // Only include menu items where menu.owner_id matches ownerId
    const menuItems: MenuItem[] = (data || [])
      .filter((item: any) => item.menu?.owner_id === ownerId)
      .map((item: any) => ({
        ...item,
        menu_name: item.menu?.menu_name || undefined,
      }));

    const totalItems = count || 0;
    const pages = Math.ceil(totalItems / perPage);
    const currentPage = page;
    return {
      data: menuItems,
      items: totalItems,
      pages,
      first: 1,
      last: pages,
      next: currentPage < pages ? currentPage + 1 : null,
      prev: currentPage > 1 ? currentPage - 1 : null,
    };
  } catch (error: any) {
    console.error("Unhandled error fetching menu items:", error.message);
    return {
      data: [],
      items: 0,
      pages: 0,
      first: 1,
      last: 1,
      next: null,
      prev: null,
    };
  }
}

// Fetch all menus for dropdown
export async function fetchAllMenus(
  ownerId: string
): Promise<{ id: string; menu_name: string }[]> {
  const supabase = await createClient();
  console.log("[fetchAllMenus] ownerId:", ownerId);
  const { data, error } = await supabase
    .from("menu")
    .select("id, menu_name, owner_id")
    .eq("owner_id", ownerId)
    .order("menu_name", { ascending: true });
  console.log("[fetchAllMenus] raw data:", data);
  if (error) {
    console.error("Error fetching all menus:", error.message);
    return [];
  }
  // Only return id and menu_name
  return (data || []).map((menu: any) => ({
    id: menu.id,
    menu_name: menu.menu_name,
  }));
}

/**
 * Adds a new menu item to Supabase, including image upload to storage.
 * @param {FormData} formData - FormData containing menu item details and the image file.
 * @returns {Promise<{ success: boolean; error?: string; item?: MenuItem }>} - Result of the operation.
 */
export async function addMenuItem(
  formData: FormData
): Promise<{ success: boolean; error?: string; item?: MenuItem }> {
  const supabase = await createClient();
  // Extract data from FormData
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const imageFile = formData.get("imageFile") as File;
  const menu_id = formData.get("menu_id") as string | undefined;

  // Basic validation
  if (!name || isNaN(price)) {
    return {
      success: false,
      error: "Name and Price are required and must be valid.",
    };
  }

  let imageUrl: string | undefined = undefined;

  // Handle image upload if a file is provided
  if (imageFile && imageFile.size > 0) {
    const fileExtension = imageFile.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExtension}`; // Generate a unique file name
    const filePath = `menu-images/${fileName}`; // Path in your Supabase bucket

    // Upload the image file to the 'menu-images' public bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("menu-images") // Your Supabase public bucket name
      .upload(filePath, imageFile, {
        cacheControl: "3600", // Cache for 1 hour
        upsert: false, // Do not overwrite existing files
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return {
        success: false,
        error: `Image upload failed: ${uploadError.message}`,
      };
    }

    // Get the public URL of the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);
    imageUrl = publicUrlData.publicUrl;
  }

  try {
    // Insert the new menu item into the 'menu_items' table
    const insertPayload: any = {
      name,
      description,
      price,
      image_url: imageUrl,
    };
    if (menu_id) insertPayload.menu_id = menu_id;
    const { data, error } = await supabase
      .from("menu_items")
      .insert([insertPayload])
      .select(); // Select the inserted row to get its ID and other defaults

    if (error) {
      console.error("Error inserting menu item:", error);
      return {
        success: false,
        error: `Database insert failed: ${error.message}`,
      };
    }

    revalidatePath("/menu"); // Revalidate the '/menu' path to show the new item immediately
    return { success: true, item: data[0] as MenuItem };
  } catch (error: any) {
    console.error("Unhandled error adding menu item:", error.message);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Updates an existing menu item in Supabase, handling new image uploads and old image deletion.
 * @param {number} id - The ID of the menu item to update.
 * @param {FormData} formData - FormData containing updated details and potential new image file.
 * @returns {Promise<{ success: boolean; error?: string; item?: MenuItem }>} - Result of the operation.
 */
export async function updateMenuItem(
  id: number,
  formData: FormData
): Promise<{ success: boolean; error?: string; item?: MenuItem }> {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const imageFile = formData.get("imageFile") as File; // New image file
  const currentImageUrl = formData.get("currentImageUrl") as string | null; // Existing image URL passed from client
  const clearImage = formData.get("clearImage") === "true"; // Flag to explicitly clear image

  if (!name || isNaN(price)) {
    return {
      success: false,
      error: "Name and Price are required and must be valid.",
    };
  }

  let newImageUrl: string | null | undefined = currentImageUrl; // Default to existing URL

  // If a new image file is provided
  if (imageFile && imageFile.size > 0) {
    const fileExtension = imageFile.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `menu-images/${fileName}`;

    // Upload the new image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading new image:", uploadError);
      return {
        success: false,
        error: `New image upload failed: ${uploadError.message}`,
      };
    }

    // Get public URL of the new image
    const { data: publicUrlData } = await supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);
    newImageUrl = publicUrlData.publicUrl;

    // Optional: Delete the old image from storage if a new one was uploaded
    if (currentImageUrl) {
      try {
        // Extract the path within the bucket from the full public URL
        const oldImagePath = currentImageUrl.split("menu-images/")[1];
        if (oldImagePath) {
          const { error: deleteOldError } = await supabase.storage
            .from("menu-images")
            .remove([oldImagePath]);
          if (deleteOldError) {
            console.warn(
              "Error deleting old image from storage:",
              deleteOldError.message
            );
          }
        }
      } catch (parseError) {
        console.warn("Failed to parse old image URL for deletion:", parseError);
      }
    }
  } else if (clearImage) {
    // User explicitly requested to clear the image
    newImageUrl = null; // Set image_url to null in DB
    if (currentImageUrl) {
      // If there was an existing image, delete it from storage
      try {
        const oldImagePath = currentImageUrl.split("menu-images/")[1];
        if (oldImagePath) {
          const { error: deleteOldError } = await supabase.storage
            .from("menu-images")
            .remove([oldImagePath]);
          if (deleteOldError) {
            console.warn(
              "Error deleting cleared image from storage:",
              deleteOldError.message
            );
          }
        }
      } catch (parseError) {
        console.warn(
          "Failed to parse image URL for clearing deletion:",
          parseError
        );
      }
    }
  }

  try {
    // Prepare the update payload
    const updatePayload: Partial<MenuItem> = {
      name,
      description,
      price,
      image_url: newImageUrl ?? undefined, // Convert null to undefined for correct type
      // status is a UI concept, not directly mapped to your DB schema
    };

    // Update the menu item in the 'menu_items' table
    const { data, error } = await supabase
      .from("menu_items")
      .update(updatePayload)
      .eq("id", id) // Match by ID
      .select(); // Select the updated row

    if (error) {
      console.error("Error updating menu item:", error);
      return {
        success: false,
        error: `Database update failed: ${error.message}`,
      };
    }

    revalidatePath("/menu"); // Revalidate the '/menu' path to show updated item
    return { success: true, item: data[0] as MenuItem };
  } catch (error: any) {
    console.error("Unhandled error updating menu item:", error.message);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Deletes a menu item from Supabase, including its associated image from storage.
 * @param {number} id - The ID of the menu item to delete.
 * @returns {Promise<{ success: boolean; error?: string }>} - Result of the operation.
 */
export async function deleteMenuItem(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    // First, fetch the item to get its image_url before deleting the record
    const { data: itemData, error: fetchError } = await supabase
      .from("menu_items")
      .select("image_url")
      .eq("id", id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means "no rows found"
      throw fetchError; // Throw other errors
    }

    // Delete the menu item record from the database
    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    if (error) {
      console.error("Error deleting menu item:", error);
      return {
        success: false,
        error: `Database delete failed: ${error.message}`,
      };
    }

    // If an image was associated with the item, delete it from storage
    if (itemData?.image_url) {
      try {
        // Extract the path within the bucket from the full public URL
        const imagePath = itemData.image_url.split("menu-images/")[1];
        if (imagePath) {
          const { error: storageError } = await supabase.storage
            .from("menu-images") // Your Supabase public bucket name
            .remove([imagePath]);
          if (storageError) {
            console.warn(
              "Error deleting image from storage:",
              storageError.message
            );
          }
        }
      } catch (parseError) {
        console.warn(
          "Failed to parse image URL for deletion from storage:",
          parseError
        );
      }
    }

    revalidatePath("/menu"); // Revalidate the '/menu' path to reflect the deletion
    return { success: true };
  } catch (error: any) {
    console.error("Unhandled error deleting menu item:", error.message);
    return { success: false, error: "An unexpected error occurred." };
  }
}
