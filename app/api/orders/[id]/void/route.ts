import { NextRequest, NextResponse } from "next/server";
import { voidOrder } from "@/actions/order-actions";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reason, invoice_no, customer_name, total_amount } = body;

    if (!invoice_no || !customer_name || typeof total_amount !== "number") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await voidOrder(params.id, {
      reason,
      invoice_no,
      customer_name,
      total_amount,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in void order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to void order",
      },
      { status: 500 }
    );
  }
}
