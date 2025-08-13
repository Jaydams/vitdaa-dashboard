import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    // Build query for kitchen inventory items
    let inventoryQuery = supabase
      .from("inventory_items")
      .select(`
        id,
        name,
        current_quantity,
        minimum_quantity,
        unit,
        category_id,
        last_updated,
        inventory_categories!inner(name)
      `)
      .eq("business_id", businessOwnerId)
      .eq("inventory_categories.category_type", "food")
      .order("name");

    // Apply filters
    if (category) {
      inventoryQuery = inventoryQuery.eq("inventory_categories.name", category);
    }

    const { data: inventoryItems, error: inventoryError } = await inventoryQuery;

    if (inventoryError) {
      console.error("Error fetching kitchen inventory:", inventoryError);
      return NextResponse.json(
        { error: "Failed to fetch kitchen inventory" },
        { status: 500 }
      );
    }

    // Transform inventory items to match kitchen interface
    const kitchenInventory = (inventoryItems || []).map((item) => {
      // Determine status based on current vs minimum quantity
      let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
      
      if (item.current_quantity <= 0) {
        status = "out_of_stock";
      } else if (item.current_quantity <= item.minimum_quantity) {
        status = "low_stock";
      }

      return {
        id: item.id,
        name: item.name,
        current_stock: item.current_quantity,
        minimum_stock: item.minimum_quantity,
        unit: item.unit,
        category: item.inventory_categories?.name || "Uncategorized",
        last_updated: item.last_updated,
        status,
      };
    });

    // Apply status filter if specified
    const filteredInventory = status 
      ? kitchenInventory.filter(item => item.status === status)
      : kitchenInventory;

    return NextResponse.json({
      items: filteredInventory,
      total: filteredInventory.length,
      categories: [...new Set(kitchenInventory.map(item => item.category))],
    });
  } catch (error) {
    console.error("Error in GET /api/inventory/kitchen:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
