import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/actions/order-actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      customer_name,
      customer_phone,
      customer_address,
      dining_option,
      table_id,
      takeaway_packs,
      takeaway_pack_price,
      delivery_location_id,
      delivery_fee,
      rider_name,
      rider_phone,
      payment_method,
      items,
      subtotal,
      vat_amount,
      service_charge,
      total_amount,
      notes,
    } = body;

    // Validate required fields
    if (!customer_name || !customer_phone || !dining_option || !payment_method || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await createOrder({
      customer_name,
      customer_phone,
      customer_address,
      dining_option,
      table_id,
      takeaway_packs: takeaway_packs || 0,
      takeaway_pack_price: takeaway_pack_price || 0,
      delivery_location_id,
      delivery_fee: delivery_fee || 0,
      rider_name,
      rider_phone,
      payment_method,
      items,
      subtotal,
      vat_amount,
      service_charge,
      total_amount,
      notes,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
} 