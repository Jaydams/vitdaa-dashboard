import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { calculateStaffCompensation } from "@/lib/staff-salary-data";

// POST /api/staff/[staffId]/salary/calculate - Calculate payroll compensation
export async function POST(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = params;
    const body = await request.json();

    const {
      hoursWorked,
      includeCommission = false,
      commissionAmount = 0,
    } = body;

    if (typeof hoursWorked !== "number" || hoursWorked < 0) {
      return NextResponse.json(
        { error: "Valid hours worked is required" },
        { status: 400 }
      );
    }

    if (
      includeCommission &&
      (typeof commissionAmount !== "number" || commissionAmount < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid commission amount is required when including commission",
        },
        { status: 400 }
      );
    }

    // Calculate compensation
    const calculation = await calculateStaffCompensation(
      staffId,
      businessId,
      hoursWorked,
      includeCommission,
      commissionAmount
    );

    if (!calculation) {
      return NextResponse.json(
        {
          error:
            "Unable to calculate compensation. Staff may not have salary information.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(calculation);
  } catch (error) {
    console.error("Error calculating staff compensation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
