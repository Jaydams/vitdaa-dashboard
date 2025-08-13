import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getBusinessDocuments,
  getBusinessComplianceOverview,
  getDocumentStatisticsByType,
} from "@/lib/staff-documents-data";
import { DocumentType } from "@/types/staff";

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentType = searchParams.get("type") as DocumentType;
    const includeCompliance = searchParams.get("includeCompliance") === "true";
    const includeStatistics = searchParams.get("includeStatistics") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");

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

    const documents = await getBusinessDocuments(
      businessOwnerId,
      documentType,
      limit
    );

    const response: {
      documents: any[];
      compliance?: any;
      statistics?: unknown;
    } = { documents };

    if (includeCompliance) {
      const complianceOverview = await getBusinessComplianceOverview(
        businessOwnerId
      );
      response.compliance = complianceOverview;
    }

    if (includeStatistics) {
      const statistics = await getDocumentStatisticsByType(businessOwnerId);
      response.statistics = statistics;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/staff/documents/overview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
