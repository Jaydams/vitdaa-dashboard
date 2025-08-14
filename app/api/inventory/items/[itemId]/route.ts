import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await request.json();
    const { current_quantity } = body;

    if (typeof current_quantity !== 'number' || current_quantity < 0) {
      return NextResponse.json(
        { error: "Current quantity must be a non-negative number" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the item exists and belongs to this business
    const { data: item, error: itemError } = await supabase
      .from("inventory_items")
      .select("id, name, business_id")
      .eq("id", itemId)
      .eq("business_id", businessOwnerId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Update the inventory item
    const { data: updatedItem, error: updateError } = await supabase
      .from("inventory_items")
      .update({
        current_quantity,
        last_updated: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("business_id", businessOwnerId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating inventory item:", updateError);
      return NextResponse.json(
        { error: "Failed to update inventory item" },
        { status: 500 }
      );
    }

    // Log the inventory update
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: businessOwnerId, // Using business owner ID as staff ID for now
      action: "inventory_updated",
      resource_type: "inventory_item",
      resource_id: itemId,
      details: {
        item_name: item.name,
        previous_quantity: item.current_quantity,
        new_quantity: current_quantity,
        change: current_quantity - (item.current_quantity || 0),
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error in PUT /api/inventory/items/[itemId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
