import { NextRequest, NextResponse } from "next/server";
import { validateStaffSession } from "@/actions/staff-auth-utils";
import { createClient } from "@/lib/supabase/server";
import { fetchStaffOrders, updateOrderStatusStaff } from "@/actions/staff-order-actions";

// GET /api/staff/orders - Get orders for staff based on role
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");
    const status = searchParams.get("status");
    const role = searchParams.get("role") as "reception" | "kitchen" | "bar" | "accountant";
    const search = searchParams.get("search");

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    const result = await fetchStaffOrders({
      page,
      perPage,
      status: status as any,
      role,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/staff/orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/staff/orders - Update order status
export async function POST(request: NextRequest) {
  try {
    const { orderId, status, notes } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "Order ID and status are required" },
        { status: 400 }
      );
    }

    const result = await updateOrderStatusStaff(orderId, status, notes);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/staff/orders:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
