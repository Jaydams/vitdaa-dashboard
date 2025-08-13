import { NextRequest, NextResponse } from "next/server";
import { addOrderNotes } from "@/actions/staff-order-actions";

// POST /api/staff/orders/notes - Add kitchen/bar notes to order
export async function POST(request: NextRequest) {
  try {
    const { orderId, noteType, notes } = await request.json();

    if (!orderId || !noteType || !notes) {
      return NextResponse.json(
        { error: "Order ID, note type, and notes are required" },
        { status: 400 }
      );
    }

    if (!['kitchen', 'bar'].includes(noteType)) {
      return NextResponse.json(
        { error: "Note type must be 'kitchen' or 'bar'" },
        { status: 400 }
      );
    }

    const result = await addOrderNotes(orderId, noteType, notes);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/staff/orders/notes:", error);
    return NextResponse.json(
      { error: "Failed to add notes" },
      { status: 500 }
    );
  }
}
