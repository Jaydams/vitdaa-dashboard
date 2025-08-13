import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getStaffComplianceStatus,
  getBusinessComplianceOverview,
  getDocumentStatisticsByType,
} from "@/lib/staff-documents-data";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const type = searchParams.get("type") || "overview";

    if (staffId) {
      // Get compliance status for specific staff member
      const complianceStatus = await getStaffComplianceStatus(
        staffId,
        businessId
      );

      if (!complianceStatus) {
        return NextResponse.json(
          { error: "Failed to get compliance status" },
          { status: 500 }
        );
      }

      return NextResponse.json({ complianceStatus });
    } else {
      // Get business-wide compliance data
      if (type === "overview") {
        const overview = await getBusinessComplianceOverview(businessId);

        if (!overview) {
          return NextResponse.json(
            { error: "Failed to get compliance overview" },
            { status: 500 }
          );
        }

        return NextResponse.json({ overview });
      } else if (type === "statistics") {
        const statistics = await getDocumentStatisticsByType(businessId);

        if (!statistics) {
          return NextResponse.json(
            { error: "Failed to get document statistics" },
            { status: 500 }
          );
        }

        return NextResponse.json({ statistics });
      } else {
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error("Error fetching compliance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance data" },
      { status: 500 }
    );
  }
}
