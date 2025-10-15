import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get business owner
    const { data: businessOwner, error: businessError } = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (businessError || !businessOwner) {
      return NextResponse.json(
        { error: "Business owner not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const urgency = searchParams.get("urgency");

    // Build query
    let query = supabase
      .from("inventory_requests")
      .select(
        `
        id,
        business_id,
        requested_by_staff_id,
        status,
        urgency_level,
        justification,
        total_estimated_cost,
        admin_notes,
        approved_by_admin_id,
        approved_at,
        denied_reason,
        created_at,
        updated_at,
        inventory_request_items (
          id,
          request_id,
          inventory_item_id,
          requested_quantity,
          approved_quantity,
          estimated_unit_cost,
          approved_unit_cost,
          supplier_id,
          notes,
          inventory_item:inventory_items (
            id,
            name,
            unit_of_measure,
            current_stock
          ),
          supplier:suppliers (
            id,
            name
          )
        ),
        requested_by_staff:staff!inventory_requests_requested_by_staff_id_fkey (
          id,
          first_name,
          last_name,
          role
        ),
        approved_by_admin:staff!inventory_requests_approved_by_admin_id_fkey (
          id,
          first_name,
          last_name
        )
      `
      )
      .eq("business_id", businessOwner.id)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (urgency && urgency !== "all") {
      query = query.eq("urgency_level", urgency);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: requests, error: requestsError } = await query;

    if (requestsError) {
      console.error("Error fetching inventory requests:", requestsError);
      return NextResponse.json(
        { error: "Failed to fetch inventory requests" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from("inventory_requests")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessOwner.id);

    if (countError) {
      console.error("Error getting requests count:", countError);
    }

    return NextResponse.json({
      requests: requests || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in inventory requests API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get business owner
    const { data: businessOwner, error: businessError } = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (businessError || !businessOwner) {
      return NextResponse.json(
        { error: "Business owner not found" },
        { status: 404 }
      );
    }

    // Get staff member (assuming the user is also a staff member)
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id")
      .eq("email", user.email)
      .eq("business_id", businessOwner.id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { urgency_level, justification, items } = body;

    // Validate required fields
    if (!urgency_level || !justification || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate total estimated cost
    const total_estimated_cost = items.reduce(
      (total: number, item: any) =>
        total + item.requested_quantity * item.estimated_unit_cost,
      0
    );

    // Create the inventory request
    const { data: newRequest, error: requestError } = await supabase
      .from("inventory_requests")
      .insert({
        business_id: businessOwner.id,
        requested_by_staff_id: staff.id,
        status: "pending",
        urgency_level,
        justification,
        total_estimated_cost,
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

    // Create the request items
    const requestItems = items.map((item: any) => ({
      request_id: newRequest.id,
      inventory_item_id: item.inventory_item_id,
      requested_quantity: item.requested_quantity,
      estimated_unit_cost: item.estimated_unit_cost,
      supplier_id: item.supplier_id || null,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase
      .from("inventory_request_items")
      .insert(requestItems);

    if (itemsError) {
      console.error("Error creating inventory request items:", itemsError);
      // Clean up the request if items creation failed
      await supabase
        .from("inventory_requests")
        .delete()
        .eq("id", newRequest.id);

      return NextResponse.json(
        { error: "Failed to create inventory request items" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Inventory request created successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("Error in inventory requests POST API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
