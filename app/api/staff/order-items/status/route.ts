import { NextRequest, NextResponse } from "next/server";
import { updateOrderItemStatus } from "@/actions/staff-order-actions";

// POST /api/staff/order-items/status - Update order item status
export async function POST(request: NextRequest) {
  try {
    const { itemId, status, notes } = await request.json();

    if (!itemId || !status) {
      return NextResponse.json(
        { error: "Item ID and status are required" },
        { status: 400 }
      );
    }

    const result = await updateOrderItemStatus(itemId, status, notes);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/staff/order-items/status:", error);
    return NextResponse.json(
      { error: "Failed to update item status" },
      { status: 500 }
    );
  }
}
