import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getRealTimeActivityMonitoring,
  getStaffSessionAnalytics,
  updateScreenAccess,
  updateTaskCompletion,
  updateActiveTime,
  updateBreakTime,
  updateProductivityScore,
} from "@/lib/staff-activity-tracking";

// GET /api/staff/session-activity - Get real-time monitoring data or staff analytics
export async function GET(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "realtime" or "analytics"
    const staffId = searchParams.get("staffId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (type === "realtime") {
      // Get real-time monitoring data for all active sessions
      const monitoringData = await getRealTimeActivityMonitoring(businessId);
      return NextResponse.json(monitoringData);
    } else if (type === "analytics" && staffId) {
      // Get detailed analytics for a specific staff member
      const analyticsData = await getStaffSessionAnalytics(
        businessId,
        staffId,
        dateFrom || undefined,
        dateTo || undefined
      );
      return NextResponse.json(analyticsData);
    } else {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in session activity API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/staff/session-activity - Update session activity data
export async function POST(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, sessionId, data } = body;

    if (!action || !sessionId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    let result = false;

    switch (action) {
      case "screen_access":
        if (data.screenName && data.durationMinutes) {
          result = await updateScreenAccess(
            sessionId,
            data.screenName,
            data.durationMinutes
          );
        }
        break;

      case "task_completion":
        if (data.taskName && typeof data.success === "boolean") {
          result = await updateTaskCompletion(
            sessionId,
            data.taskName,
            data.success,
            data.details
          );
        }
        break;

      case "active_time":
        if (data.activeMinutes) {
          result = await updateActiveTime(sessionId, data.activeMinutes);
        }
        break;

      case "break_time":
        if (data.breakMinutes) {
          result = await updateBreakTime(sessionId, data.breakMinutes);
        }
        break;

      case "update_productivity":
        result = await updateProductivityScore(sessionId);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (result) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to update session activity" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating session activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
