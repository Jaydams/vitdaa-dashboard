import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getCurrentStaffSalary,
  createStaffSalary,
  getStaffSalaryHistory,
} from "@/lib/staff-salary-data";
import { SalaryType, PaymentFrequency } from "@/types/staff";

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
    const includeHistory = searchParams.get("includeHistory") === "true";

    if (includeHistory) {
      const salaryHistory = await getStaffSalaryHistory(
        staffId,
        businessOwnerId
      );
      return NextResponse.json({ history: salaryHistory });
    } else {
      const currentSalary = await getCurrentStaffSalary(
        staffId,
        businessOwnerId
      );
      return NextResponse.json({ current: currentSalary });
    }
  } catch (error) {
    console.error("Error in GET /api/staff/[staffId]/salary:", error);
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
    if (!body.salary_type || !body.payment_frequency || !body.effective_date) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: salary_type, payment_frequency, effective_date",
        },
        { status: 400 }
      );
    }

    // Validate salary_type
    const validSalaryTypes: SalaryType[] = ["hourly", "monthly", "annual"];
    if (!validSalaryTypes.includes(body.salary_type)) {
      return NextResponse.json(
        { error: "Invalid salary_type. Must be: hourly, monthly, or annual" },
        { status: 400 }
      );
    }

    // Validate payment_frequency
    const validPaymentFrequencies: PaymentFrequency[] = [
      "weekly",
      "bi_weekly",
      "monthly",
    ];
    if (!validPaymentFrequencies.includes(body.payment_frequency)) {
      return NextResponse.json(
        {
          error:
            "Invalid payment_frequency. Must be: weekly, bi_weekly, or monthly",
        },
        { status: 400 }
      );
    }

    // Validate that appropriate salary field is provided
    if (body.salary_type === "hourly" && !body.hourly_rate) {
      return NextResponse.json(
        { error: "hourly_rate is required for hourly salary type" },
        { status: 400 }
      );
    }

    if (
      (body.salary_type === "monthly" || body.salary_type === "annual") &&
      !body.base_salary
    ) {
      return NextResponse.json(
        {
          error: "base_salary is required for monthly and annual salary types",
        },
        { status: 400 }
      );
    }

    const salaryData = {
      base_salary: body.base_salary,
      hourly_rate: body.hourly_rate,
      salary_type: body.salary_type,
      payment_frequency: body.payment_frequency,
      commission_rate: body.commission_rate,
      bonus_eligible: body.bonus_eligible,
      effective_date: body.effective_date,
    };

    const newSalary = await createStaffSalary(
      staffId,
      businessOwnerId,
      salaryData
    );

    if (!newSalary) {
      return NextResponse.json(
        { error: "Failed to create salary record" },
        { status: 500 }
      );
    }

    return NextResponse.json(newSalary, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/staff/[staffId]/salary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
