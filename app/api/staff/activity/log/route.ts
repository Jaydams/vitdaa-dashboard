import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  ActivityLogData,
  ActivityType,
} from "@/lib/activity-logging-middleware";

interface LogActivityBody extends Omit<ActivityLogData, "activity_type"> {
  activity_type: ActivityType;
}

const validActivityTypes: ActivityType[] = [
  "order_created",
  "order_updated",
  "order_status_changed",
  "payment_processed",
  "inventory_requested",
  "inventory_approved",
  "inventory_denied",
  "inventory_updated",
  "table_assigned",
  "customer_served",
  "report_generated",
  "refund_processed",
  "dashboard_accessed",
  "login",
  "logout",
  "error_occurred",
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: LogActivityBody = await request.json();

    const {
      staff_id,
      staff_session_id,
      business_id,
      activity_type,
      activity_details = {},
      performance_metrics = {},
      resource_id,
      resource_type,
      success = true,
      error_message,
    } = body;

    // Validate required fields
    if (!staff_id || !business_id || !activity_type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: staff_id, business_id, activity_type",
        },
        { status: 400 }
      );
    }

    // Validate activity_type
    if (!validActivityTypes.includes(activity_type)) {
      return NextResponse.json(
        {
          error: `Invalid activity_type. Must be one of: ${validActivityTypes.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Enhanced activity details with categorization
    const enhancedActivityDetails = {
      ...activity_details,
      resource_id,
      resource_type,
      success,
      error_message,
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get("user-agent"),
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
    };

    // Create the activity log
    const { data: activityLog, error } = await supabase
      .from("staff_activity_logs")
      .insert({
        staff_id,
        staff_session_id,
        business_id,
        activity_type,
        activity_details: enhancedActivityDetails,
        performance_metrics,
        shift_date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating activity log:", error);
      return NextResponse.json(
        { error: "Failed to log activity" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        activity_log: activityLog,
        message: "Activity logged successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Batch logging endpoint for multiple activities
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: { activities: LogActivityBody[] } = await request.json();

    if (!body.activities || !Array.isArray(body.activities)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected 'activities' array." },
        { status: 400 }
      );
    }

    if (body.activities.length === 0) {
      return NextResponse.json(
        { error: "Activities array cannot be empty" },
        { status: 400 }
      );
    }

    if (body.activities.length > 100) {
      return NextResponse.json(
        { error: "Cannot log more than 100 activities at once" },
        { status: 400 }
      );
    }

    // Validate and enhance each activity
    const enhancedActivities = body.activities.map((activity) => {
      const {
        staff_id,
        staff_session_id,
        business_id,
        activity_type,
        activity_details = {},
        performance_metrics = {},
        resource_id,
        resource_type,
        success = true,
        error_message,
      } = activity;

      // Validate required fields
      if (!staff_id || !business_id || !activity_type) {
        throw new Error(
          `Missing required fields in activity: staff_id, business_id, activity_type`
        );
      }

      // Validate activity_type
      if (!validActivityTypes.includes(activity_type)) {
        throw new Error(
          `Invalid activity_type: ${activity_type}. Must be one of: ${validActivityTypes.join(
            ", "
          )}`
        );
      }

      return {
        staff_id,
        staff_session_id,
        business_id,
        activity_type,
        activity_details: {
          ...activity_details,
          resource_id,
          resource_type,
          success,
          error_message,
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get("user-agent"),
          ip_address:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip"),
        },
        performance_metrics,
        shift_date: new Date().toISOString().split("T")[0],
      };
    });

    // Insert all activities
    const { data: activityLogs, error } = await supabase
      .from("staff_activity_logs")
      .insert(enhancedActivities)
      .select();

    if (error) {
      console.error("Error creating batch activity logs:", error);
      return NextResponse.json(
        { error: "Failed to log activities" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        activity_logs: activityLogs,
        count: activityLogs?.length || 0,
        message: "Activities logged successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error in batch logging:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const businessId = searchParams.get("business_id");
    const staffId = searchParams.get("staff_id");
    const activityType = searchParams.get("activity_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("staff_activity_logs")
      .select(
        `
        *,
        staff:staff(id, first_name, last_name, role),
        staff_session:staff_sessions(id, login_time, logout_time)
      `
      )
      .eq("business_id", businessId)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (staffId) {
      query = query.eq("staff_id", staffId);
    }
    if (activityType) {
      query = query.eq("activity_type", activityType);
    }
    if (startDate) {
      query = query.gte("timestamp", startDate);
    }
    if (endDate) {
      query = query.lte("timestamp", endDate);
    }

    const { data: activityLogs, error } = await query;

    if (error) {
      console.error("Error fetching activity logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch activity logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ activity_logs: activityLogs });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
