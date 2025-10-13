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
    const status = searchParams.get("status");
    const alcoholic = searchParams.get("alcoholic");

    // Build query for beverage inventory items
    let itemsQuery = supabase
      .from("inventory_items")
      .select(
        `
        id,
        name,
        current_stock,
        minimum_stock,
        maximum_stock,
        unit_of_measure,
        unit_cost,
        selling_price,
        is_alcoholic,
        is_available,
        updated_at,
        inventory_categories!inner(
          name,
          category_type
        )
      `
      )
      .eq("business_id", businessOwnerId)
      .eq("inventory_categories.category_type", "beverage")
      .eq("is_available", true)
      .order("name", { ascending: true });

    // Apply filters
    if (alcoholic === "true") {
      itemsQuery = itemsQuery.eq("is_alcoholic", true);
    } else if (alcoholic === "false") {
      itemsQuery = itemsQuery.eq("is_alcoholic", false);
    }

    const { data: items, error: itemsError } = await itemsQuery;

    if (itemsError) {
      console.error("Error fetching beverage inventory:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch beverage inventory" },
        { status: 500 }
      );
    }

    // Transform items to include status and analytics
    const enhancedItems = (items || [])
      .map((item) => {
        const stockStatus = getStockStatus(
          item.current_stock,
          item.minimum_stock
        );

        // Filter by status if requested
        if (status && stockStatus !== status) {
          return null;
        }

        return {
          id: item.id,
          name: item.name,
          current_stock: item.current_stock,
          minimum_stock: item.minimum_stock,
          maximum_stock: item.maximum_stock,
          unit_of_measure: item.unit_of_measure,
          unit_cost: item.unit_cost,
          selling_price: item.selling_price,
          is_alcoholic: item.is_alcoholic,
          category_type: (item.inventory_categories as any)?.category_type,
          category_name: (item.inventory_categories as any)?.name,
          last_updated: item.updated_at,
          status: stockStatus,
          stock_value: item.current_stock * (item.unit_cost || 0),
          profit_margin:
            item.selling_price && item.unit_cost
              ? ((item.selling_price - item.unit_cost) / item.selling_price) *
                100
              : 0,
        };
      })
      .filter((item) => item !== null);

    // Calculate summary statistics
    const summary = {
      total_items: enhancedItems.length,
      in_stock: enhancedItems.filter((item) => item.status === "in_stock")
        .length,
      low_stock: enhancedItems.filter((item) => item.status === "low_stock")
        .length,
      out_of_stock: enhancedItems.filter(
        (item) => item.status === "out_of_stock"
      ).length,
      alcoholic_items: enhancedItems.filter((item) => item.is_alcoholic).length,
      non_alcoholic_items: enhancedItems.filter((item) => !item.is_alcoholic)
        .length,
      total_value: enhancedItems.reduce(
        (sum, item) => sum + item.stock_value,
        0
      ),
      average_profit_margin:
        enhancedItems.length > 0
          ? enhancedItems.reduce((sum, item) => sum + item.profit_margin, 0) /
            enhancedItems.length
          : 0,
    };

    return NextResponse.json({
      items: enhancedItems,
      summary,
      total: enhancedItems.length,
    });
  } catch (error) {
    console.error("Error in GET /api/inventory/beverages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getStockStatus(
  currentStock: number,
  minimumStock: number
): "in_stock" | "low_stock" | "out_of_stock" {
  if (currentStock === 0) return "out_of_stock";
  if (currentStock <= minimumStock) return "low_stock";
  return "in_stock";
}

export async function PUT(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      item_id,
      current_stock,
      transaction_type,
      quantity,
      total_cost,
      staff_id,
      notes,
    } = body;

    if (!item_id || current_stock === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update inventory item
    const { data: updatedItem, error: updateError } = await supabase
      .from("inventory_items")
      .update({
        current_stock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item_id)
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

    // Create inventory transaction record
    if (transaction_type && quantity) {
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          business_id: businessOwnerId,
          item_id,
          transaction_type,
          quantity,
          unit_cost: total_cost ? total_cost / quantity : 0,
          total_cost: total_cost || 0,
          previous_stock:
            current_stock -
            (transaction_type === "purchase" ? quantity : -quantity),
          new_stock: current_stock,
          staff_id,
          notes,
          transaction_date: new Date().toISOString(),
        });

      if (transactionError) {
        console.error("Error creating transaction record:", transactionError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error("Error in PUT /api/inventory/beverages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
