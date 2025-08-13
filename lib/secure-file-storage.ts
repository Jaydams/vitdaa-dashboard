import { createClient } from "@/lib/supabase/server";
import {
  encryptSensitiveData,
  decryptSensitiveData,
  generateSecureToken,
} from "./data-encryption";
import { logSecurityEvent } from "./security-audit";
import crypto from "crypto";
import path from "path";

export interface SecureFileMetadata {
  id: string;
  original_name: string;
  encrypted_name: string;
  file_size: number;
  mime_type: string;
  checksum: string;
  encryption_key_id: string;
  uploaded_by: string;
  business_id: string;
  staff_id?: string;
  document_type: string;
  access_level: "public" | "restricted" | "confidential";
  expiration_date?: string;
  created_at: string;
  updated_at: string;
}

export interface FileUploadOptions {
  documentType: string;
  accessLevel: "public" | "restricted" | "confidential";
  expirationDate?: Date;
  staffId?: string;
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
}

export interface FileAccessLog {
  file_id: string;
  accessed_by: string;
  access_type: "view" | "download" | "delete" | "update";
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  reason?: string;
  created_at: string;
}

/**
 * Validates file before upload
 * @param file - File buffer or stream
 * @param fileName - Original file name
 * @param options - Upload options
 * @returns Validation result
 */
export function validateFile(
  file: Buffer,
  fileName: string,
  options: FileUploadOptions
): { valid: boolean; error?: string } {
  // Check file size
  const maxSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
  if (file.length > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(
        maxSize / 1024 / 1024
      )}MB`,
    };
  }

  // Check file extension
  const ext = path.extname(fileName).toLowerCase();
  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".jpg",
    ".jpeg",
    ".png",
    ".txt",
  ];
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File type ${ext} is not allowed. Allowed types: ${allowedExtensions.join(
        ", "
      )}`,
    };
  }

  // Basic file content validation (magic number check)
  const magicNumbers = {
    ".pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
    ".jpg": [0xff, 0xd8, 0xff],
    ".jpeg": [0xff, 0xd8, 0xff],
    ".png": [0x89, 0x50, 0x4e, 0x47],
    ".doc": [0xd0, 0xcf, 0x11, 0xe0],
    ".docx": [0x50, 0x4b, 0x03, 0x04],
  };

  const expectedMagic = magicNumbers[ext as keyof typeof magicNumbers];
  if (expectedMagic) {
    const fileMagic = Array.from(file.slice(0, expectedMagic.length));
    if (!expectedMagic.every((byte, index) => byte === fileMagic[index])) {
      return {
        valid: false,
        error: "File content does not match file extension",
      };
    }
  }

  return { valid: true };
}

/**
 * Encrypts file content for secure storage
 * @param fileBuffer - File content as buffer
 * @param encryptionKey - Encryption key
 * @returns Encrypted file buffer
 */
function encryptFileContent(fileBuffer: Buffer, encryptionKey: string): Buffer {
  const algorithm = "aes-256-gcm";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, encryptionKey);

  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine IV, auth tag, and encrypted content
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts file content
 * @param encryptedBuffer - Encrypted file buffer
 * @param encryptionKey - Encryption key
 * @returns Decrypted file buffer
 */
function decryptFileContent(
  encryptedBuffer: Buffer,
  encryptionKey: string
): Buffer {
  const algorithm = "aes-256-gcm";
  const iv = encryptedBuffer.slice(0, 16);
  const authTag = encryptedBuffer.slice(16, 32);
  const encrypted = encryptedBuffer.slice(32);

  const decipher = crypto.createDecipher(algorithm, encryptionKey);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Calculates file checksum for integrity verification
 * @param fileBuffer - File content
 * @returns SHA-256 checksum
 */
function calculateChecksum(fileBuffer: Buffer): string {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Uploads a secure file
 * @param file - File buffer
 * @param fileName - Original file name
 * @param businessId - Business ID
 * @param uploadedBy - User ID who uploaded the file
 * @param options - Upload options
 * @returns File metadata
 */
export async function uploadSecureFile(
  file: Buffer,
  fileName: string,
  businessId: string,
  uploadedBy: string,
  options: FileUploadOptions
): Promise<SecureFileMetadata> {
  try {
    // Validate file
    const validation = validateFile(file, fileName, options);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const supabase = await createClient();

    // Generate secure identifiers
    const fileId = crypto.randomUUID();
    const encryptionKey = generateSecureToken(32);
    const encryptedFileName = generateSecureToken(16) + path.extname(fileName);
    const checksum = calculateChecksum(file);

    // Encrypt file content
    const encryptedFile = encryptFileContent(file, encryptionKey);

    // Store encrypted file in Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("staff-documents")
      .upload(`${businessId}/${encryptedFileName}`, encryptedFile, {
        contentType: "application/octet-stream", // Always store as binary
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) {
      throw new Error(`Failed to upload file: ${storageError.message}`);
    }

    // Store file metadata
    const metadata: Omit<SecureFileMetadata, "created_at" | "updated_at"> = {
      id: fileId,
      original_name: fileName,
      encrypted_name: encryptedFileName,
      file_size: file.length,
      mime_type: options.allowedMimeTypes?.[0] || "application/octet-stream",
      checksum,
      encryption_key_id: encryptSensitiveData(encryptionKey), // Encrypt the encryption key
      uploaded_by: uploadedBy,
      business_id: businessId,
      staff_id: options.staffId,
      document_type: options.documentType,
      access_level: options.accessLevel,
      expiration_date: options.expirationDate?.toISOString(),
    };

    const { data: insertedMetadata, error: metadataError } = await supabase
      .from("staff_documents")
      .insert({
        ...metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (metadataError) {
      // Clean up uploaded file if metadata insertion fails
      await supabase.storage
        .from("staff-documents")
        .remove([`${businessId}/${encryptedFileName}`]);

      throw new Error(
        `Failed to store file metadata: ${metadataError.message}`
      );
    }

    // Log successful upload
    await logSecurityEvent({
      business_id: businessId,
      event_type: "staff_pin_success", // We'll need to add document events
      severity: "low",
      user_id: uploadedBy,
      staff_id: options.staffId,
      details: {
        action: "file_upload",
        file_id: fileId,
        file_name: fileName,
        file_size: file.length,
        document_type: options.documentType,
        access_level: options.accessLevel,
      },
    });

    return insertedMetadata;
  } catch (error) {
    // Log failed upload attempt
    await logSecurityEvent({
      business_id: businessId,
      event_type: "unauthorized_access_attempt",
      severity: "medium",
      user_id: uploadedBy,
      staff_id: options.staffId,
      details: {
        action: "file_upload_failed",
        file_name: fileName,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

/**
 * Downloads a secure file
 * @param fileId - File ID
 * @param businessId - Business ID
 * @param requestedBy - User ID requesting the file
 * @param ipAddress - IP address of requester
 * @returns File buffer and metadata
 */
export async function downloadSecureFile(
  fileId: string,
  businessId: string,
  requestedBy: string,
  ipAddress?: string
): Promise<{ file: Buffer; metadata: SecureFileMetadata }> {
  try {
    const supabase = await createClient();

    // Get file metadata
    const { data: metadata, error: metadataError } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("id", fileId)
      .eq("business_id", businessId)
      .single();

    if (metadataError || !metadata) {
      throw new Error("File not found or access denied");
    }

    // Check if file has expired
    if (
      metadata.expiration_date &&
      new Date(metadata.expiration_date) < new Date()
    ) {
      throw new Error("File has expired");
    }

    // Check access permissions (implement based on your business logic)
    // This is a simplified check - you might want more sophisticated access control
    if (
      metadata.access_level === "confidential" &&
      metadata.uploaded_by !== requestedBy
    ) {
      throw new Error("Insufficient permissions to access this file");
    }

    // Download encrypted file from storage
    const { data: encryptedFile, error: downloadError } = await supabase.storage
      .from("staff-documents")
      .download(`${businessId}/${metadata.encrypted_name}`);

    if (downloadError || !encryptedFile) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Convert blob to buffer
    const encryptedBuffer = Buffer.from(await encryptedFile.arrayBuffer());

    // Decrypt the encryption key and file content
    const encryptionKey = decryptSensitiveData(metadata.encryption_key_id);
    const decryptedFile = decryptFileContent(encryptedBuffer, encryptionKey);

    // Verify file integrity
    const calculatedChecksum = calculateChecksum(decryptedFile);
    if (calculatedChecksum !== metadata.checksum) {
      throw new Error("File integrity check failed");
    }

    // Log successful access
    await logFileAccess({
      file_id: fileId,
      accessed_by: requestedBy,
      access_type: "download",
      ip_address: ipAddress,
      success: true,
      created_at: new Date().toISOString(),
    });

    return { file: decryptedFile, metadata };
  } catch (error) {
    // Log failed access attempt
    await logFileAccess({
      file_id: fileId,
      accessed_by: requestedBy,
      access_type: "download",
      ip_address: ipAddress,
      success: false,
      reason: error instanceof Error ? error.message : "Unknown error",
      created_at: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Deletes a secure file
 * @param fileId - File ID
 * @param businessId - Business ID
 * @param deletedBy - User ID deleting the file
 * @returns Success status
 */
export async function deleteSecureFile(
  fileId: string,
  businessId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get file metadata
    const { data: metadata, error: metadataError } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("id", fileId)
      .eq("business_id", businessId)
      .single();

    if (metadataError || !metadata) {
      throw new Error("File not found or access denied");
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("staff-documents")
      .remove([`${businessId}/${metadata.encrypted_name}`]);

    if (storageError) {
      throw new Error(
        `Failed to delete file from storage: ${storageError.message}`
      );
    }

    // Delete metadata
    const { error: deleteError } = await supabase
      .from("staff_documents")
      .delete()
      .eq("id", fileId)
      .eq("business_id", businessId);

    if (deleteError) {
      throw new Error(`Failed to delete file metadata: ${deleteError.message}`);
    }

    // Log successful deletion
    await logFileAccess({
      file_id: fileId,
      accessed_by: deletedBy,
      access_type: "delete",
      success: true,
      created_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    // Log failed deletion attempt
    await logFileAccess({
      file_id: fileId,
      accessed_by: deletedBy,
      access_type: "delete",
      success: false,
      reason: error instanceof Error ? error.message : "Unknown error",
      created_at: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Lists files for a staff member or business
 * @param businessId - Business ID
 * @param staffId - Optional staff ID to filter by
 * @param documentType - Optional document type to filter by
 * @returns List of file metadata
 */
export async function listSecureFiles(
  businessId: string,
  staffId?: string,
  documentType?: string
): Promise<SecureFileMetadata[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("staff_documents")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    if (documentType) {
      query = query.eq("document_type", documentType);
    }

    const { data: files, error } = await query;

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return files || [];
  } catch (error) {
    console.error("Error listing secure files:", error);
    return [];
  }
}

/**
 * Logs file access attempts
 * @param accessLog - File access log entry
 */
async function logFileAccess(accessLog: FileAccessLog): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("file_access_logs").insert(accessLog);

    if (error) {
      console.error("Error logging file access:", error);
    }
  } catch (error) {
    console.error("Error in logFileAccess:", error);
  }
}

/**
 * Checks for expired files and sends alerts
 * @param businessId - Business ID
 * @param daysBeforeExpiration - Days before expiration to alert (default: 30)
 * @returns List of expiring files
 */
export async function checkExpiringFiles(
  businessId: string,
  daysBeforeExpiration: number = 30
): Promise<SecureFileMetadata[]> {
  try {
    const supabase = await createClient();
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + daysBeforeExpiration);

    const { data: expiringFiles, error } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("business_id", businessId)
      .not("expiration_date", "is", null)
      .lte("expiration_date", alertDate.toISOString())
      .gte("expiration_date", new Date().toISOString()); // Not already expired

    if (error) {
      throw new Error(`Failed to check expiring files: ${error.message}`);
    }

    return expiringFiles || [];
  } catch (error) {
    console.error("Error checking expiring files:", error);
    return [];
  }
}

/**
 * Cleans up expired files
 * @param businessId - Business ID
 * @returns Number of files cleaned up
 */
export async function cleanupExpiredFiles(businessId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Get expired files
    const { data: expiredFiles, error: selectError } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("business_id", businessId)
      .not("expiration_date", "is", null)
      .lt("expiration_date", now);

    if (selectError || !expiredFiles) {
      return 0;
    }

    let cleanedCount = 0;

    // Delete each expired file
    for (const file of expiredFiles) {
      try {
        await deleteSecureFile(file.id, businessId, "system");
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to delete expired file ${file.id}:`, error);
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error("Error cleaning up expired files:", error);
    return 0;
  }
}
