import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getStaffDocuments,
  createStaffDocument,
  getStaffComplianceStatus,
} from "@/lib/staff-documents-data";
import { DocumentType } from "@/types/staff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const documentType = searchParams.get("type") as DocumentType;
    const compliance = searchParams.get("compliance") === "true";

    // Validate document type if provided
    if (documentType) {
      const validTypes: DocumentType[] = [
        "contract",
        "id_document",
        "tax_form",
        "certification",
        "training_record",
        "other",
      ];
      if (!validTypes.includes(documentType)) {
        return NextResponse.json(
          { error: "Invalid document type" },
          { status: 400 }
        );
      }
    }

    if (compliance) {
      const complianceStatus = await getStaffComplianceStatus(
        staffId,
        businessOwnerId
      );
      return NextResponse.json({ compliance: complianceStatus });
    } else {
      const documents = await getStaffDocuments(
        staffId,
        businessOwnerId,
        documentType
      );
      return NextResponse.json({ documents });
    }
  } catch (error) {
    console.error("Error in GET /api/staff/[staffId]/documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.document_type || !body.document_name || !body.file_url) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: document_type, document_name, file_url",
        },
        { status: 400 }
      );
    }

    // Validate document type
    const validTypes: DocumentType[] = [
      "contract",
      "id_document",
      "tax_form",
      "certification",
      "training_record",
      "other",
    ];
    if (!validTypes.includes(body.document_type)) {
      return NextResponse.json(
        {
          error:
            "Invalid document_type. Must be one of: contract, id_document, tax_form, certification, training_record, other",
        },
        { status: 400 }
      );
    }

    // Validate expiration_date format if provided
    if (body.expiration_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.expiration_date)) {
        return NextResponse.json(
          { error: "Invalid expiration_date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
    }

    const documentData = {
      document_type: body.document_type,
      document_name: body.document_name,
      file_url: body.file_url,
      file_size: body.file_size,
      mime_type: body.mime_type,
      expiration_date: body.expiration_date,
      is_required: body.is_required,
    };

    const newDocument = await createStaffDocument(
      staffId,
      businessOwnerId,
      businessOwnerId, // uploaded_by is the business owner
      documentData
    );

    if (!newDocument) {
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/staff/[staffId]/documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
