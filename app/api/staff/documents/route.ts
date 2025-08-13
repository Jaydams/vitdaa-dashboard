import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  createStaffDocument,
  getStaffDocuments,
  getBusinessDocuments,
} from "@/lib/staff-documents-data";
import { DocumentType } from "@/types/staff";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const documentType = searchParams.get("documentType") as DocumentType;
    const limit = parseInt(searchParams.get("limit") || "100");

    if (staffId) {
      // Get documents for specific staff member
      const documents = await getStaffDocuments(
        staffId,
        businessId,
        documentType
      );
      return NextResponse.json({ documents });
    } else {
      // Get all business documents
      const documents = await getBusinessDocuments(
        businessId,
        documentType,
        limit
      );
      return NextResponse.json({ documents });
    }
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      staffId,
      documentType,
      documentName,
      fileUrl,
      fileSize,
      mimeType,
      expirationDate,
      isRequired,
    } = body;

    if (!staffId || !documentType || !documentName || !fileUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const document = await createStaffDocument(
      staffId,
      businessId,
      businessId, // uploaded_by is the business owner
      {
        document_type: documentType,
        document_name: documentName,
        file_url: fileUrl,
        file_size: fileSize,
        mime_type: mimeType,
        expiration_date: expirationDate,
        is_required: isRequired,
      }
    );

    if (!document) {
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
