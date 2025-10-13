import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PaymentExportItem {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction_id?: string;
  payment_time?: string;
  created_at: string;
  orders: {
    id: string;
    invoice_no: string;
    customer_name?: string;
    customer_phone?: string;
    total: number;
    status: string;
    business_id: string;
    created_at: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const format = searchParams.get("format") || "csv";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const paymentMethod = searchParams.get("payment_method");
    const status = searchParams.get("status");

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from("payments")
      .select(
        `
        *,
        orders!inner (
          id,
          invoice_no,
          customer_name,
          customer_phone,
          total,
          status,
          business_id,
          created_at
        )
      `
      )
      .eq("orders.business_id", user.id)
      .order("created_at", { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error("Error fetching payments for export:", error);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    const typedPayments = payments as PaymentExportItem[];

    if (format === "csv") {
      // Generate CSV
      const csvHeaders = [
        "Payment ID",
        "Order ID",
        "Invoice No",
        "Customer Name",
        "Customer Phone",
        "Amount",
        "Payment Method",
        "Status",
        "Transaction ID",
        "Payment Time",
        "Created At",
      ];

      const csvRows = typedPayments.map((payment) => [
        payment.id,
        payment.orders.id,
        payment.orders.invoice_no,
        payment.orders.customer_name || "",
        payment.orders.customer_phone || "",
        (payment.amount / 100).toFixed(2), // Convert from kobo to naira
        payment.payment_method,
        payment.status,
        payment.transaction_id || "",
        payment.payment_time || "",
        payment.created_at,
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) =>
          row
            .map((field) =>
              typeof field === "string" && field.includes(",")
                ? `"${field}"`
                : field
            )
            .join(",")
        ),
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="payments-export-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
      });
    } else if (format === "json") {
      // Return JSON format
      return NextResponse.json({
        exportDate: new Date().toISOString(),
        filters: {
          startDate,
          endDate,
          paymentMethod,
          status,
        },
        totalRecords: typedPayments.length,
        payments: typedPayments.map((payment) => ({
          id: payment.id,
          orderId: payment.orders.id,
          invoiceNo: payment.orders.invoice_no,
          customerName: payment.orders.customer_name,
          customerPhone: payment.orders.customer_phone,
          amount: payment.amount / 100, // Convert from kobo to naira
          paymentMethod: payment.payment_method,
          status: payment.status,
          transactionId: payment.transaction_id,
          paymentTime: payment.payment_time,
          createdAt: payment.created_at,
        })),
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported export format" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in payments export API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
