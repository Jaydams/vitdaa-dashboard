"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Uploads an image to Supabase storage and returns the public URL
 */
export async function uploadImage(
  file: File,
  type: "profile" | "cover" | "menu"
): Promise<{
  success: boolean;
  url?: string;
  error?: string;
  compressionInfo?: any;
}> {
  const supabase = await createClient();

  try {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error:
          "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
      };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File size too large. Maximum size is 5MB.",
      };
    }

    // Generate a unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${type}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `${type}-images/${fileName}`;

    // Upload the file to the appropriate bucket
    const bucketName = type === "menu" ? "menu-images" : "profile-images";

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return {
        success: false,
        error: uploadError.message,
      };
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      compressionInfo: {
        originalSize: file.size,
        compressedSize: file.size, // No compression applied in this basic version
        compressionRatio: 1,
      },
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    return {
      success: false,
      error: "An unexpected error occurred while uploading the image",
    };
  }
}

/**
 * Deletes an image from Supabase storage
 */
export async function deleteImage(
  imageUrl: string,
  type: "profile" | "cover" | "menu"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Extract the file path from the URL
    const bucketName = type === "menu" ? "menu-images" : "profile-images";
    const urlParts = imageUrl.split(`/${bucketName}/`);

    if (urlParts.length !== 2) {
      return {
        success: false,
        error: "Invalid image URL format",
      };
    }

    const filePath = urlParts[1];

    // Delete the file from storage
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (deleteError) {
      console.error("Error deleting image:", deleteError);
      return {
        success: false,
        error: deleteError.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting image:", error);
    return {
      success: false,
      error: "An unexpected error occurred while deleting the image",
    };
  }
}
