import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { getStaffDocument } from "@/lib/staff-documents-data";
import {
  generateSignedDocumentUrl,
  validateFilePathOwnership,
} from "@/lib/document-security";

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the document belongs to this business
    const document = await getStaffDocument(params.documentId, businessId);
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Additional security check: validate file path ownership
    if (!validateFilePathOwnership(document.file_url, businessId)) {
      console.error(
        "File path ownership validation failed:",
        document.file_url
      );
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate a signed URL for secure access (valid for 1 hour)
    const signedUrl = await generateSignedDocumentUrl(document.file_url, 3600);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate download link" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      downloadUrl: signedUrl,
      document: {
        id: document.id,
        name: document.document_name,
        type: document.document_type,
        size: document.file_size,
        mimeType: document.mime_type,
      },
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    );
  }
}
