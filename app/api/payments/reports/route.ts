import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PaymentSummaryItem {
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  orders: {
    business_id: string;
    total: number;
    status: string;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const reportType = searchParams.get("type") || "daily";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Set default date range based on report type
    let defaultStartDate: string;
    let defaultEndDate: string = new Date().toISOString().split("T")[0];

    switch (reportType) {
      case "daily":
        defaultStartDate = new Date().toISOString().split("T")[0];
        break;
      case "weekly":
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        defaultStartDate = weekAgo.toISOString().split("T")[0];
        break;
      case "monthly":
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        defaultStartDate = monthAgo.toISOString().split("T")[0];
        break;
      default:
        defaultStartDate = new Date().toISOString().split("T")[0];
    }

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Get payment summary data
    const { data: paymentSummary, error: summaryError } = await supabase
      .from("payments")
      .select(
        `
        amount,
        payment_method,
        status,
        created_at,
        orders!inner (
          business_id,
          total,
          status
        )
      `
      )
      .eq("orders.business_id", user.id)
      .gte("created_at", finalStartDate)
      .lte("created_at", finalEndDate + "T23:59:59.999Z");

    if (summaryError) {
      console.error("Error fetching payment summary:", summaryError);
      return NextResponse.json(
        { error: "Failed to fetch payment summary" },
        { status: 500 }
      );
    }

    const payments = paymentSummary as PaymentSummaryItem[];

    // Calculate metrics
    const totalRevenue = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalTransactions = payments.length;
    const completedTransactions = payments.filter(
      (p) => p.status === "completed"
    ).length;
    const refundedTransactions = payments.filter(
      (p) => p.status === "refunded"
    ).length;
    const pendingTransactions = payments.filter(
      (p) => p.status === "pending"
    ).length;

    // Payment method breakdown
    const paymentMethodBreakdown = payments.reduce((acc, payment) => {
      if (payment.status === "completed") {
        acc[payment.payment_method] =
          (acc[payment.payment_method] || 0) + payment.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    // Daily breakdown for charts
    const dailyBreakdown = payments
      .filter((p) => p.status === "completed")
      .reduce((acc, payment) => {
        const date = payment.created_at.split("T")[0];
        acc[date] = (acc[date] || 0) + payment.amount;
        return acc;
      }, {} as Record<string, number>);

    // Average order value
    const averageOrderValue =
      completedTransactions > 0 ? totalRevenue / completedTransactions : 0;

    // Refund amount
    const totalRefunded = payments
      .filter((p) => p.status === "refunded")
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      reportType,
      dateRange: {
        startDate: finalStartDate,
        endDate: finalEndDate,
      },
      summary: {
        totalRevenue,
        totalTransactions,
        completedTransactions,
        refundedTransactions,
        pendingTransactions,
        averageOrderValue,
        totalRefunded,
      },
      paymentMethodBreakdown,
      dailyBreakdown: Object.entries(dailyBreakdown).map(([date, amount]) => ({
        date,
        amount,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in payment reports API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
