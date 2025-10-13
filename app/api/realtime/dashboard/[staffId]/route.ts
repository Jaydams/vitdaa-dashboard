import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerStaffId } from "@/lib/getServerStaffId";

/**
 * WebSocket endpoint for real-time dashboard subscriptions
 * This endpoint provides dashboard-specific event subscriptions for staff members
 */

interface DashboardSubscriptionRequest {
  dashboardType: "reception" | "kitchen" | "bar" | "accountant";
  eventTypes: string[];
  businessId: string;
}

interface DashboardEventFilter {
  staffId: string;
  businessId: string;
  role: string;
  dashboardType: string;
}

/**
 * GET /api/realtime/dashboard/[staffId]
 * Initialize WebSocket connection for dashboard-specific real-time updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const supabase = await createClient();
    const currentStaffId = await getServerStaffId();
    const targetStaffId = params.staffId;

    // Verify staff authentication and permissions
    if (!currentStaffId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Staff can only subscribe to their own dashboard or admin can subscribe to any
    const { data: currentStaff } = await supabase
      .from("staff")
      .select("role, business_id")
      .eq("id", currentStaffId)
      .single();

    if (!currentStaff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Check if staff can access this subscription
    if (
      currentStaffId !== targetStaffId &&
      !["admin", "accountant"].includes(currentStaff.role)
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get target staff details
    const { data: targetStaff } = await supabase
      .from("staff")
      .select("id, role, business_id, first_name, last_name")
      .eq("id", targetStaffId)
      .eq("business_id", currentStaff.business_id)
      .single();

    if (!targetStaff) {
      return NextResponse.json(
        { error: "Target staff not found or not in same business" },
        { status: 404 }
      );
    }

    // Get URL parameters for subscription configuration
    const url = new URL(request.url);
    const dashboardType = url.searchParams.get("dashboardType") as
      | "reception"
      | "kitchen"
      | "bar"
      | "accountant";
    const eventTypes = url.searchParams.get("eventTypes")?.split(",") || [];

    if (!dashboardType) {
      return NextResponse.json(
        { error: "Dashboard type is required" },
        { status: 400 }
      );
    }

    // Validate dashboard type matches staff role
    const validDashboards = getRoleValidDashboards(targetStaff.role);
    if (!validDashboards.includes(dashboardType)) {
      return NextResponse.json(
        {
          error: `Staff role ${targetStaff.role} cannot access ${dashboardType} dashboard`,
        },
        { status: 403 }
      );
    }

    // Create subscription configuration
    const subscriptionConfig = {
      staffId: targetStaffId,
      businessId: targetStaff.business_id,
      role: targetStaff.role,
      dashboardType,
      eventTypes:
        eventTypes.length > 0
          ? eventTypes
          : getDefaultEventTypes(dashboardType),
      subscribedBy: currentStaffId,
      subscribedAt: new Date().toISOString(),
    };

    // Get relevant table filters for this dashboard type
    const tableFilters = getDashboardTableFilters(
      dashboardType,
      targetStaff.business_id
    );

    // Return subscription configuration and table filters
    return NextResponse.json({
      success: true,
      subscription: subscriptionConfig,
      tableFilters,
      staff: {
        id: targetStaff.id,
        name: `${targetStaff.first_name} ${targetStaff.last_name}`,
        role: targetStaff.role,
        businessId: targetStaff.business_id,
      },
    });
  } catch (error) {
    console.error("Dashboard subscription error:", error);
    return NextResponse.json(
      { error: "Failed to initialize dashboard subscription" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/realtime/dashboard/[staffId]
 * Update subscription preferences or send dashboard-specific events
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const supabase = await createClient();
    const currentStaffId = await getServerStaffId();
    const targetStaffId = params.staffId;

    if (!currentStaffId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "update_subscription":
        return await updateSubscriptionPreferences(
          supabase,
          currentStaffId,
          targetStaffId,
          data
        );

      case "broadcast_event":
        return await broadcastDashboardEvent(
          supabase,
          currentStaffId,
          targetStaffId,
          data
        );

      case "get_active_subscriptions":
        return await getActiveSubscriptions(
          supabase,
          currentStaffId,
          targetStaffId
        );

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Dashboard subscription POST error:", error);
    return NextResponse.json(
      { error: "Failed to process dashboard subscription request" },
      { status: 500 }
    );
  }
}

/**
 * Get valid dashboard types for a staff role
 */
function getRoleValidDashboards(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    reception: ["reception"],
    kitchen: ["kitchen"],
    bar: ["bar"],
    accountant: ["accountant", "reception", "kitchen", "bar"], // Accountants can view all dashboards
    storekeeper: ["kitchen", "bar"], // Storekeepers can access inventory-related dashboards
    waiter: ["reception"], // Waiters use reception dashboard
  };

  return rolePermissions[role] || [];
}

/**
 * Get default event types for a dashboard type
 */
function getDefaultEventTypes(dashboardType: string): string[] {
  const defaultEvents: Record<string, string[]> = {
    reception: [
      "order_created",
      "order_updated",
      "table_assigned",
      "table_updated",
      "payment_processed",
      "customer_updated",
    ],
    kitchen: [
      "order_created",
      "order_updated",
      "inventory_changed",
      "request_approved",
      "request_denied",
      "inventory_alert",
    ],
    bar: [
      "order_created",
      "order_updated",
      "inventory_changed",
      "request_approved",
      "request_denied",
      "beverage_order_updated",
    ],
    accountant: [
      "payment_processed",
      "order_completed",
      "refund_processed",
      "staff_activity",
      "financial_alert",
      "inventory_changed",
    ],
  };

  return defaultEvents[dashboardType] || [];
}

/**
 * Get table filters for dashboard-specific subscriptions
 */
function getDashboardTableFilters(dashboardType: string, businessId: string) {
  const baseFilter = `business_id=eq.${businessId}`;

  const filters: Record<string, any> = {
    reception: {
      orders: baseFilter,
      tables: baseFilter,
      customers: baseFilter,
      payments: `order_id=in.(select id from orders where ${baseFilter})`,
    },
    kitchen: {
      orders: `${baseFilter} AND status=in.(pending,processing)`,
      inventory_items: baseFilter,
      inventory_requests: baseFilter,
      inventory_transactions: baseFilter,
    },
    bar: {
      orders: `${baseFilter} AND id=in.(select distinct order_id from order_items oi join menu_items mi on oi.menu_item_id = mi.id where mi.category = 'beverage')`,
      inventory_items: `${baseFilter} AND category=eq.beverage`,
      inventory_requests: baseFilter,
    },
    accountant: {
      orders: baseFilter,
      payments: `order_id=in.(select id from orders where ${baseFilter})`,
      staff_activity_logs: baseFilter,
      inventory_requests: baseFilter,
      refunds: `payment_id=in.(select id from payments where order_id in (select id from orders where ${baseFilter}))`,
    },
  };

  return filters[dashboardType] || {};
}

/**
 * Update subscription preferences
 */
async function updateSubscriptionPreferences(
  supabase: any,
  currentStaffId: string,
  targetStaffId: string,
  data: any
) {
  // Verify permissions
  if (currentStaffId !== targetStaffId) {
    const { data: currentStaff } = await supabase
      .from("staff")
      .select("role")
      .eq("id", currentStaffId)
      .single();

    if (!currentStaff || !["admin", "accountant"].includes(currentStaff.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
  }

  // Update subscription preferences in database
  const { error } = await supabase
    .from("staff_dashboard_subscriptions")
    .upsert({
      staff_id: targetStaffId,
      dashboard_type: data.dashboardType,
      event_types: data.eventTypes,
      notification_preferences: data.notificationPreferences || {},
      updated_at: new Date().toISOString(),
      updated_by: currentStaffId,
    });

  if (error) {
    return NextResponse.json(
      { error: "Failed to update subscription preferences" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Subscription preferences updated",
  });
}

/**
 * Broadcast event to dashboard subscribers
 */
async function broadcastDashboardEvent(
  supabase: any,
  currentStaffId: string,
  targetStaffId: string,
  data: any
) {
  // Verify staff can broadcast events
  const { data: currentStaff } = await supabase
    .from("staff")
    .select("role, business_id")
    .eq("id", currentStaffId)
    .single();

  if (!currentStaff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  // Create event record
  const event = {
    id: crypto.randomUUID(),
    type: data.eventType,
    payload: data.payload,
    timestamp: new Date().toISOString(),
    source_staff_id: currentStaffId,
    business_id: currentStaff.business_id,
    target_dashboards: data.targetDashboards || [],
    priority: data.priority || "normal",
  };

  // Store event in database for audit trail
  const { error } = await supabase.from("dashboard_events").insert(event);

  if (error) {
    console.error("Failed to store dashboard event:", error);
  }

  // The actual broadcasting is handled by the Supabase real-time subscriptions
  // This endpoint just validates and logs the event

  return NextResponse.json({
    success: true,
    eventId: event.id,
    message: "Event broadcasted successfully",
  });
}

/**
 * Get active subscriptions for monitoring
 */
async function getActiveSubscriptions(
  supabase: any,
  currentStaffId: string,
  targetStaffId: string
) {
  // Verify permissions
  const { data: currentStaff } = await supabase
    .from("staff")
    .select("role, business_id")
    .eq("id", currentStaffId)
    .single();

  if (!currentStaff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  // Only allow viewing own subscriptions or admin/accountant viewing others
  if (
    currentStaffId !== targetStaffId &&
    !["admin", "accountant"].includes(currentStaff.role)
  ) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Get subscription data
  const { data: subscriptions, error } = await supabase
    .from("staff_dashboard_subscriptions")
    .select(
      `
      *,
      staff:staff_id (
        id,
        first_name,
        last_name,
        role
      )
    `
    )
    .eq("staff_id", targetStaffId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    subscriptions: subscriptions || [],
  });
}
