import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface InventoryRequestItem {
  inventory_item_id: string;
  requested_quantity: number;
  estimated_unit_cost?: number;
  supplier_id?: string;
  notes?: string;
}

interface CreateInventoryRequestBody {
  business_id: string;
  requested_by_staff_id: string;
  urgency_level?: string;
  justification?: string;
  items: InventoryRequestItem[];
  staff_session_id?: string;
  start_time?: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const businessId = searchParams.get("business_id");
    const staffId = searchParams.get("staff_id");
    const status = searchParams.get("status");
    const urgency = searchParams.get("urgency");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("inventory_requests")
      .select(
        `
        *,
        requested_by_staff:staff!requested_by_staff_id(id, first_name, last_name, role),
        approved_by_admin:business_owner!approved_by_admin_id(id, first_name, last_name),
        inventory_request_items(
          *,
          inventory_item:inventory_items(id, name, unit_of_measure, current_stock),
          supplier:suppliers(id, name)
        )
      `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (staffId) {
      query = query.eq("requested_by_staff_id", staffId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (urgency) {
      query = query.eq("urgency_level", urgency);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error("Error fetching inventory requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch inventory requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: CreateInventoryRequestBody = await request.json();

    const {
      business_id,
      requested_by_staff_id,
      urgency_level = "normal",
      justification,
      items,
    } = body;

    // Validate required fields
    if (
      !business_id ||
      !requested_by_staff_id ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: business_id, requested_by_staff_id, items",
        },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (
        !item.inventory_item_id ||
        !item.requested_quantity ||
        item.requested_quantity <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Each item must have inventory_item_id and positive requested_quantity",
          },
          { status: 400 }
        );
      }
    }

    // Calculate total estimated cost
    let total_estimated_cost = 0;
    for (const item of items) {
      const cost = (item.estimated_unit_cost || 0) * item.requested_quantity;
      total_estimated_cost += cost;
    }

    // Create the inventory request
    const { data: inventoryRequest, error: requestError } = await supabase
      .from("inventory_requests")
      .insert({
        business_id,
        requested_by_staff_id,
        urgency_level,
        justification,
        total_estimated_cost,
        status: "pending",
      })
      .select()
      .single();

    if (requestError) {
      console.error("Error creating inventory request:", requestError);
      return NextResponse.json(
        { error: "Failed to create inventory request" },
        { status: 500 }
      );
    }

    // Create request items
    const requestItems = items.map((item) => ({
      request_id: inventoryRequest.id,
      inventory_item_id: item.inventory_item_id,
      requested_quantity: item.requested_quantity,
      estimated_unit_cost: item.estimated_unit_cost || 0,
      supplier_id: item.supplier_id || null,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase
      .from("inventory_request_items")
      .insert(requestItems);

    if (itemsError) {
      console.error("Error creating request items:", itemsError);
      // Rollback the request
      await supabase
        .from("inventory_requests")
        .delete()
        .eq("id", inventoryRequest.id);

      return NextResponse.json(
        { error: "Failed to create request items" },
        { status: 500 }
      );
    }

    // Log staff activity
    await supabase.from("staff_activity_logs").insert({
      staff_id: requested_by_staff_id,
      staff_session_id: body.staff_session_id || null,
      business_id,
      activity_type: "inventory_requested",
      activity_details: {
        request_id: inventoryRequest.id,
        items_count: items.length,
        total_estimated_cost,
        urgency_level,
      },
      performance_metrics: {
        response_time: Date.now() - (body.start_time || Date.now()),
      },
    });

    // Fetch the complete request with items
    const { data: completeRequest, error: fetchError } = await supabase
      .from("inventory_requests")
      .select(
        `
        *,
        requested_by_staff:staff!requested_by_staff_id(id, first_name, last_name, role),
        inventory_request_items(
          *,
          inventory_item:inventory_items(id, name, unit_of_measure, current_stock),
          supplier:suppliers(id, name)
        )
      `
      )
      .eq("id", inventoryRequest.id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete request:", fetchError);
      return NextResponse.json({ request: inventoryRequest });
    }

    return NextResponse.json({ request: completeRequest }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
