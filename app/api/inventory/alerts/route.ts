import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function POST(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();

    const {
      item_id,
      alert_type,
      message,
      priority = "medium",
    } = body;

    if (!item_id || !alert_type || !message) {
      return NextResponse.json(
        { error: "Item ID, alert type, and message are required" },
        { status: 400 }
      );
    }

    // Validate alert type
    const validAlertTypes = ["low_stock", "out_of_stock", "expiring", "expired"];
    if (!validAlertTypes.includes(alert_type)) {
      return NextResponse.json(
        { error: "Invalid alert type" },
        { status: 400 }
      );
    }

    // Check if item exists and belongs to this business
    const { data: item, error: itemError } = await supabase
      .from("inventory_items")
      .select("id, business_id, name")
      .eq("id", item_id)
      .eq("business_id", businessOwnerId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Create inventory alert
    const { data: alert, error: alertError } = await supabase
      .from("inventory_alerts")
      .insert({
        business_id: businessOwnerId,
        item_id,
        alert_type,
        message,
        priority,
        is_active: true,
        created_by: businessOwnerId,
      })
      .select()
      .single();

    if (alertError) {
      console.error("Error creating inventory alert:", alertError);
      return NextResponse.json(
        { error: "Failed to create inventory alert" },
        { status: 500 }
      );
    }

    // Log the alert creation
    await supabase.from("staff_activity_logs").insert({
      business_id: businessOwnerId,
      staff_id: businessOwnerId, // Using business owner ID as staff ID for now
      action: "inventory_alert_created",
      resource_type: "inventory_item",
      resource_id: item_id,
      details: {
        alert_type,
        message,
        priority,
        item_name: item.name,
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/inventory/alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const alertType = searchParams.get("alert_type");
    const isActive = searchParams.get("is_active");

    // Build query for inventory alerts
    let alertsQuery = supabase
      .from("inventory_alerts")
      .select(`
        id,
        alert_type,
        message,
        priority,
        is_active,
        created_at,
        inventory_items!inner(
          id,
          name,
          current_quantity,
          minimum_quantity,
          unit
        )
      `)
      .eq("business_id", businessOwnerId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (alertType) {
      alertsQuery = alertsQuery.eq("alert_type", alertType);
    }

    if (isActive !== null) {
      alertsQuery = alertsQuery.eq("is_active", isActive === "true");
    }

    const { data: alerts, error: alertsError } = await alertsQuery;

    if (alertsError) {
      console.error("Error fetching inventory alerts:", alertsError);
      return NextResponse.json(
        { error: "Failed to fetch inventory alerts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      alerts: alerts || [],
      total: alerts?.length || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/inventory/alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
