import { createClient } from "@/lib/supabase/server";

/**
 * Generates a signed URL for secure document access
 * @param filePath - The file path in the storage bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL or null if failed
 */
export async function generateSignedDocumentUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from("staff-documents")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
}

/**
 * Deletes a document file from storage
 * @param filePath - The file path in the storage bucket
 * @returns True if successful, false otherwise
 */
export async function deleteDocumentFile(filePath: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.storage
      .from("staff-documents")
      .remove([filePath]);

    if (error) {
      console.error("Error deleting file from storage:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting document file:", error);
    return false;
  }
}

/**
 * Validates if a file path belongs to a specific business
 * @param filePath - The file path to validate
 * @param businessId - The business ID to check against
 * @returns True if the file belongs to the business
 */
export function validateFilePathOwnership(
  filePath: string,
  businessId: string
): boolean {
  // File paths should follow the pattern: staff-documents/{businessId}/{filename}
  const pathParts = filePath.split("/");

  if (pathParts.length < 3) {
    return false;
  }

  // Check if the path starts with staff-documents and contains the correct business ID
  return pathParts[0] === "staff-documents" && pathParts[1] === businessId;
}

/**
 * Sanitizes a filename to prevent path traversal attacks
 * @param filename - The original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, "") // Remove path separators
    .replace(/[<>:"|?*]/g, "") // Remove Windows forbidden characters
    .replace(/\.\./g, "") // Remove parent directory references
    .trim();
}

/**
 * Generates a secure file path for document storage
 * @param businessId - The business ID
 * @param staffId - The staff member ID
 * @param documentType - The type of document
 * @param originalFilename - The original filename
 * @returns Secure file path
 */
export function generateSecureFilePath(
  businessId: string,
  staffId: string,
  documentType: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = sanitizeFilename(originalFilename);
  const fileExtension = sanitizedFilename.split(".").pop() || "bin";

  // Create a secure filename with timestamp to prevent conflicts
  const secureFilename = `${staffId}_${documentType}_${timestamp}.${fileExtension}`;

  return `staff-documents/${businessId}/${secureFilename}`;
}
