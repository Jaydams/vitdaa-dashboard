"use server";

import { createClient } from "@/utils/supabase/server";
import { orderSchema } from "@/schemas";

// Zod validation schema

export async function placeOrder(orderData: {
  user_id: string | null;
  restaurant_id: string;
  items: { menu_item_id: number; quantity: number }[];
  total: number;
  takeaway_packs?: number;
  takeaway_pack_price?: number;
  delivery_location_id?: string;
  delivery_price?: number;
  diningOption: "indoor" | "delivery";
  rider_name?: string;
  rider_phone?: string;
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  payment_method: "cash" | "wallet";
}) {
  const supabase = await createClient();

  const result = orderSchema.safeParse(orderData);
  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return {
      success: false,
      error: "Validation failed",
      issues: errors,
    };
  }

  const { error } = await supabase.from("orders").insert({
    ...orderData,
    status: "pending",
    created_at: new Date(),
  });

  if (error) {
    console.error("Failed to place order:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
