import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { createClient } from "@/lib/supabase/server";
import {
  generateSecureFilePath,
  sanitizeFilename,
} from "@/lib/document-security";

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const staffId = formData.get("staffId") as string;
    const documentType = formData.get("documentType") as string;

    if (!file || !staffId || !documentType) {
      return NextResponse.json(
        { error: "Missing required fields: file, staffId, documentType" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "File type not allowed. Please upload PDF, Word, or image files.",
        },
        { status: 400 }
      );
    }

    // Create secure file path
    const filePath = generateSecureFilePath(
      businessId,
      staffId,
      documentType,
      file.name
    );

    // Upload to Supabase Storage (private bucket)
    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from("staff-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // For private buckets, we store the file path and generate signed URLs when needed
    return NextResponse.json({
      fileUrl: filePath, // Store the path, not a public URL
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadPath: filePath,
    });
  } catch (error) {
    console.error("Error in file upload:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
