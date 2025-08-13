import { NextRequest, NextResponse } from "next/server";
import { setOrderPriority } from "@/actions/staff-order-actions";

// POST /api/staff/orders/priority - Set order priority
export async function POST(request: NextRequest) {
  try {
    const { orderId, priority } = await request.json();

    if (!orderId || !priority) {
      return NextResponse.json(
        { error: "Order ID and priority are required" },
        { status: 400 }
      );
    }

    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json(
        { error: "Priority must be 'low', 'normal', 'high', or 'urgent'" },
        { status: 400 }
      );
    }

    const result = await setOrderPriority(orderId, priority);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/staff/orders/priority:", error);
    return NextResponse.json(
      { error: "Failed to set priority" },
      { status: 500 }
    );
  }
}
