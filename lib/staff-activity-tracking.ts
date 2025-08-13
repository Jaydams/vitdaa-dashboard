import { createClient } from "@/lib/supabase/server";
import {
  StaffActivityLog,
  StaffSessionActivity,
  StaffActivitySummary,
  ActiveStaffSessionWithActivity,
} from "@/types/staff";

/**
 * Logs a staff activity action
 * @param businessId - The business ID
 * @param staffId - The staff member's ID
 * @param action - The action being performed
 * @param performedBy - The user ID who performed the action (staff or business owner)
 * @param details - Additional details about the action
 * @param sessionId - Optional session ID if action is performed during a session
 * @param ipAddress - Optional IP address
 * @param userAgent - Optional user agent string
 * @returns True if successful, false otherwise
 */
export async function logStaffActivity(
  businessId: string,
  staffId: string,
  action: string,
  performedBy: string,
  details?: Record<string, unknown>,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("staff_activity_logs").insert({
      business_id: businessId,
      staff_id: staffId,
      session_id: sessionId,
      action,
      performed_by: performedBy,
      details: details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error logging staff activity:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error logging staff activity:", error);
    return false;
  }
}

/**
 * Updates session activity metrics
 * @param sessionId - The session ID
 * @param activityType - Type of activity ('page_visit' | 'action')
 * @returns True if successful, false otherwise
 */
export async function updateSessionActivity(
  sessionId: string,
  activityType: "page_visit" | "action"
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const updateField =
      activityType === "page_visit" ? "page_visits" : "actions_performed";

    const { error } = await supabase
      .from("staff_session_activity")
      .update({
        [updateField]: supabase.raw(`${updateField} + 1`),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating session activity:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating session activity:", error);
    return false;
  }
}

/**
 * Updates idle time for a session
 * @param sessionId - The session ID
 * @param idleMinutes - Number of idle minutes to add
 * @returns True if successful, false otherwise
 */
export async function updateSessionIdleTime(
  sessionId: string,
  idleMinutes: number
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("staff_session_activity")
      .update({
        idle_time_minutes: supabase.raw(`idle_time_minutes + ${idleMinutes}`),
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating session idle time:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating session idle time:", error);
    return false;
  }
}

/**
 * Gets activity logs for a specific staff member
 * @param businessId - The business ID
 * @param staffId - The staff member's ID
 * @param limit - Maximum number of logs to return (default: 50)
 * @param offset - Number of logs to skip (default: 0)
 * @returns Array of activity logs
 */
export async function getStaffActivityLogs(
  businessId: string,
  staffId: string,
  limit: number = 50,
  offset: number = 0
): Promise<StaffActivityLog[]> {
  try {
    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from("staff_activity_logs")
      .select("*")
      .eq("business_id", businessId)
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error getting staff activity logs:", error);
      return [];
    }

    return logs || [];
  } catch (error) {
    console.error("Error getting staff activity logs:", error);
    return [];
  }
}

/**
 * Gets activity logs for all staff in a business
 * @param businessId - The business ID
 * @param limit - Maximum number of logs to return (default: 100)
 * @param offset - Number of logs to skip (default: 0)
 * @param actionFilter - Optional action filter
 * @returns Array of activity logs with staff information
 */
export async function getBusinessActivityLogs(
  businessId: string,
  limit: number = 100,
  offset: number = 0,
  actionFilter?: string
): Promise<
  (StaffActivityLog & {
    staff: { first_name: string; last_name: string; role: string };
  })[]
> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("staff_activity_logs")
      .select(
        `
        *,
        staff:staff_id (
          first_name,
          last_name,
          role
        )
      `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error("Error getting business activity logs:", error);
      return [];
    }

    return logs || [];
  } catch (error) {
    console.error("Error getting business activity logs:", error);
    return [];
  }
}

/**
 * Gets session activity for a specific session
 * @param sessionId - The session ID
 * @returns Session activity data or null
 */
export async function getSessionActivity(
  sessionId: string
): Promise<StaffSessionActivity | null> {
  try {
    const supabase = await createClient();

    const { data: activity, error } = await supabase
      .from("staff_session_activity")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (error) {
      console.error("Error getting session activity:", error);
      return null;
    }

    return activity;
  } catch (error) {
    console.error("Error getting session activity:", error);
    return null;
  }
}

/**
 * Gets activity summary for all staff in a business
 * @param businessId - The business ID
 * @param dateFrom - Optional start date filter
 * @param dateTo - Optional end date filter
 * @returns Array of staff activity summaries
 */
export async function getStaffActivitySummary(
  businessId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<StaffActivitySummary[]> {
  try {
    const supabase = await createClient();

    // Build date filter conditions
    let dateFilter = "";
    if (dateFrom && dateTo) {
      dateFilter = `AND sal.created_at >= '${dateFrom}' AND sal.created_at <= '${dateTo}'`;
    } else if (dateFrom) {
      dateFilter = `AND sal.created_at >= '${dateFrom}'`;
    } else if (dateTo) {
      dateFilter = `AND sal.created_at <= '${dateTo}'`;
    }

    // Complex query to get activity summary
    const { data: summaries, error } = await supabase.rpc(
      "get_staff_activity_summary",
      {
        p_business_id: businessId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      }
    );

    if (error) {
      console.error("Error getting staff activity summary:", error);
      // Fallback to basic query if stored procedure doesn't exist
      return await getBasicStaffActivitySummary(businessId, dateFrom, dateTo);
    }

    return summaries || [];
  } catch (error) {
    console.error("Error getting staff activity summary:", error);
    return await getBasicStaffActivitySummary(businessId, dateFrom, dateTo);
  }
}

/**
 * Fallback function for basic staff activity summary
 * @param businessId - The business ID
 * @param dateFrom - Optional start date filter
 * @param dateTo - Optional end date filter
 * @returns Array of basic staff activity summaries
 */
async function getBasicStaffActivitySummary(
  businessId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<StaffActivitySummary[]> {
  try {
    const supabase = await createClient();

    // Get all staff for the business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role")
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (staffError || !staff) {
      return [];
    }

    const summaries: StaffActivitySummary[] = [];

    for (const staffMember of staff) {
      // Get session count and duration
      let sessionQuery = supabase
        .from("staff_sessions")
        .select("id, signed_in_at, signed_out_at")
        .eq("staff_id", staffMember.id);

      if (dateFrom) {
        sessionQuery = sessionQuery.gte("signed_in_at", dateFrom);
      }
      if (dateTo) {
        sessionQuery = sessionQuery.lte("signed_in_at", dateTo);
      }

      const { data: sessions } = await sessionQuery;

      // Get activity count
      let activityQuery = supabase
        .from("staff_activity_logs")
        .select("action, created_at")
        .eq("staff_id", staffMember.id);

      if (dateFrom) {
        activityQuery = activityQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        activityQuery = activityQuery.lte("created_at", dateTo);
      }

      const { data: activities } = await activityQuery;

      // Calculate metrics
      const totalSessions = sessions?.length || 0;
      const totalActions = activities?.length || 0;

      let totalDuration = 0;
      if (sessions) {
        for (const session of sessions) {
          if (session.signed_out_at) {
            const duration =
              new Date(session.signed_out_at).getTime() -
              new Date(session.signed_in_at).getTime();
            totalDuration += duration / (1000 * 60); // Convert to minutes
          }
        }
      }

      // Get most common actions
      const actionCounts: Record<string, number> = {};
      if (activities) {
        for (const activity of activities) {
          actionCounts[activity.action] =
            (actionCounts[activity.action] || 0) + 1;
        }
      }

      const mostCommonActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const lastActivity =
        activities && activities.length > 0
          ? activities.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )[0].created_at
          : undefined;

      summaries.push({
        staff_id: staffMember.id,
        staff_name: `${staffMember.first_name} ${staffMember.last_name}`,
        role: staffMember.role,
        total_sessions: totalSessions,
        total_session_duration_minutes: Math.round(totalDuration),
        total_actions: totalActions,
        total_page_visits: 0, // Would need to calculate from session activity
        last_activity_at: lastActivity,
        average_session_duration_minutes:
          totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
        most_common_actions: mostCommonActions,
      });
    }

    return summaries;
  } catch (error) {
    console.error("Error getting basic staff activity summary:", error);
    return [];
  }
}

/**
 * Gets active staff sessions with activity data
 * @param businessId - The business ID
 * @returns Array of active sessions with activity data
 */
export async function getActiveStaffSessionsWithActivity(
  businessId: string
): Promise<ActiveStaffSessionWithActivity[]> {
  try {
    const supabase = await createClient();

    const { data: sessions, error } = await supabase
      .from("staff_sessions")
      .select(
        `
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          role,
          permissions
        ),
        activity:staff_session_activity!inner (
          id,
          page_visits,
          actions_performed,
          last_activity_at,
          idle_time_minutes,
          total_session_duration_minutes
        )
      `
      )
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("signed_in_at", { ascending: false });

    if (error) {
      console.error(
        "Error getting active staff sessions with activity:",
        error
      );
      return [];
    }

    return (
      sessions?.map((session) => ({
        ...session,
        activity: Array.isArray(session.activity)
          ? session.activity[0]
          : session.activity,
      })) || []
    );
  } catch (error) {
    console.error("Error getting active staff sessions with activity:", error);
    return [];
  }
}

/**
 * Updates screen access tracking for a session
 * @param sessionId - The session ID
 * @param screenName - Name of the screen accessed
 * @param durationMinutes - Time spent on the screen
 * @returns True if successful, false otherwise
 */
export async function updateScreenAccess(
  sessionId: string,
  screenName: string,
  durationMinutes: number
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get current screens_accessed data
    const { data: currentActivity, error: fetchError } = await supabase
      .from("staff_session_activity")
      .select("screens_accessed")
      .eq("session_id", sessionId)
      .single();

    if (fetchError) {
      console.error("Error fetching current screen access:", fetchError);
      return false;
    }

    const currentScreens = currentActivity?.screens_accessed || [];
    const newScreenAccess = {
      screen_name: screenName,
      access_time: new Date().toISOString(),
      duration_minutes: durationMinutes,
    };

    const updatedScreens = [...currentScreens, newScreenAccess];

    const { error } = await supabase
      .from("staff_session_activity")
      .update({
        screens_accessed: updatedScreens,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating screen access:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating screen access:", error);
    return false;
  }
}

/**
 * Updates task completion tracking for a session
 * @param sessionId - The session ID
 * @param taskName - Name of the completed task
 * @param success - Whether the task was completed successfully
 * @param details - Additional task details
 * @returns True if successful, false otherwise
 */
export async function updateTaskCompletion(
  sessionId: string,
  taskName: string,
  success: boolean,
  details?: Record<string, unknown>
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get current tasks_completed data
    const { data: currentActivity, error: fetchError } = await supabase
      .from("staff_session_activity")
      .select("tasks_completed")
      .eq("session_id", sessionId)
      .single();

    if (fetchError) {
      console.error("Error fetching current task completions:", fetchError);
      return false;
    }

    const currentTasks = currentActivity?.tasks_completed || [];
    const newTaskCompletion = {
      task_name: taskName,
      completion_time: new Date().toISOString(),
      success,
      details: details || {},
    };

    const updatedTasks = [...currentTasks, newTaskCompletion];

    const { error } = await supabase
      .from("staff_session_activity")
      .update({
        tasks_completed: updatedTasks,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating task completion:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating task completion:", error);
    return false;
  }
}

/**
 * Calculates productivity score for a session
 * @param sessionActivity - The session activity data
 * @returns Productivity score (0-100)
 */
export function calculateProductivityScore(
  sessionActivity: StaffSessionActivity
): number {
  try {
    const {
      total_session_duration_minutes,
      active_time_minutes,
      idle_time_minutes,
      break_time_minutes,
      actions_performed,
      page_visits,
      tasks_completed,
    } = sessionActivity;

    // Base metrics
    const totalTime = total_session_duration_minutes || 1; // Avoid division by zero
    const activeRatio = Math.min(active_time_minutes / totalTime, 1);
    const idleRatio = Math.min(idle_time_minutes / totalTime, 1);

    // Activity metrics
    const actionsPerMinute = actions_performed / totalTime;
    const pageVisitsPerMinute = page_visits / totalTime;

    // Task completion metrics
    const completedTasks = tasks_completed.filter(
      (task) => task.success
    ).length;
    const totalTasks = tasks_completed.length;
    const taskSuccessRate = totalTasks > 0 ? completedTasks / totalTasks : 1;

    // Weighted scoring
    const activeTimeScore = activeRatio * 30; // 30% weight
    const idleTimePenalty = Math.max(0, 20 - idleRatio * 20); // 20% penalty for idle time
    const activityScore = Math.min(actionsPerMinute * 10, 25); // 25% weight, capped
    const taskScore = taskSuccessRate * 25; // 25% weight

    const totalScore =
      activeTimeScore + idleTimePenalty + activityScore + taskScore;

    return Math.round(Math.min(Math.max(totalScore, 0), 100));
  } catch (error) {
    console.error("Error calculating productivity score:", error);
    return 0;
  }
}

/**
 * Updates productivity score for a session
 * @param sessionId - The session ID
 * @returns True if successful, false otherwise
 */
export async function updateProductivityScore(
  sessionId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get current session activity
    const sessionActivity = await getSessionActivity(sessionId);
    if (!sessionActivity) {
      return false;
    }

    const productivityScore = calculateProductivityScore(sessionActivity);

    const { error } = await supabase
      .from("staff_session_activity")
      .update({
        productivity_score: productivityScore,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating productivity score:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating productivity score:", error);
    return false;
  }
}

/**
 * Updates active time for a session
 * @param sessionId - The session ID
 * @param activeMinutes - Number of active minutes to add
 * @returns True if successful, false otherwise
 */
export async function updateActiveTime(
  sessionId: string,
  activeMinutes: number
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("staff_session_activity")
      .update({
        active_time_minutes: supabase.raw(
          `active_time_minutes + ${activeMinutes}`
        ),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating active time:", error);
      return false;
    }

    // Update productivity score after active time change
    await updateProductivityScore(sessionId);

    return true;
  } catch (error) {
    console.error("Error updating active time:", error);
    return false;
  }
}

/**
 * Updates break time for a session
 * @param sessionId - The session ID
 * @param breakMinutes - Number of break minutes to add
 * @returns True if successful, false otherwise
 */
export async function updateBreakTime(
  sessionId: string,
  breakMinutes: number
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("staff_session_activity")
      .update({
        break_time_minutes: supabase.raw(
          `break_time_minutes + ${breakMinutes}`
        ),
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating break time:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating break time:", error);
    return false;
  }
}

/**
 * Gets detailed session analytics for a staff member
 * @param businessId - The business ID
 * @param staffId - The staff member's ID
 * @param dateFrom - Optional start date filter
 * @param dateTo - Optional end date filter
 * @returns Detailed session analytics
 */
export async function getStaffSessionAnalytics(
  businessId: string,
  staffId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  totalSessions: number;
  averageSessionDuration: number;
  averageProductivityScore: number;
  totalActiveTime: number;
  totalIdleTime: number;
  totalBreakTime: number;
  mostAccessedScreens: Array<{
    screen: string;
    count: number;
    totalTime: number;
  }>;
  taskCompletionRate: number;
  activityTrend: Array<{
    date: string;
    productivity: number;
    duration: number;
  }>;
}> {
  try {
    const supabase = await createClient();

    // Build date filter
    let dateFilter = supabase
      .from("staff_session_activity")
      .select(
        `
        *,
        session:staff_sessions!inner(signed_in_at, signed_out_at)
      `
      )
      .eq("business_id", businessId)
      .eq("staff_id", staffId);

    if (dateFrom) {
      dateFilter = dateFilter.gte("created_at", dateFrom);
    }
    if (dateTo) {
      dateFilter = dateFilter.lte("created_at", dateTo);
    }

    const { data: sessions, error } = await dateFilter;

    if (error) {
      console.error("Error getting staff session analytics:", error);
      return getEmptyAnalytics();
    }

    if (!sessions || sessions.length === 0) {
      return getEmptyAnalytics();
    }

    // Calculate metrics
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.total_session_duration_minutes || 0),
      0
    );
    const averageSessionDuration = totalDuration / totalSessions;

    const productivityScores = sessions
      .filter((s) => s.productivity_score !== null)
      .map((s) => s.productivity_score);
    const averageProductivityScore =
      productivityScores.length > 0
        ? productivityScores.reduce((sum, score) => sum + score, 0) /
          productivityScores.length
        : 0;

    const totalActiveTime = sessions.reduce(
      (sum, s) => sum + (s.active_time_minutes || 0),
      0
    );
    const totalIdleTime = sessions.reduce(
      (sum, s) => sum + (s.idle_time_minutes || 0),
      0
    );
    const totalBreakTime = sessions.reduce(
      (sum, s) => sum + (s.break_time_minutes || 0),
      0
    );

    // Analyze screen access
    const screenAccess: Record<string, { count: number; totalTime: number }> =
      {};
    sessions.forEach((session) => {
      if (session.screens_accessed) {
        session.screens_accessed.forEach((screen: any) => {
          if (!screenAccess[screen.screen_name]) {
            screenAccess[screen.screen_name] = { count: 0, totalTime: 0 };
          }
          screenAccess[screen.screen_name].count++;
          screenAccess[screen.screen_name].totalTime +=
            screen.duration_minutes || 0;
        });
      }
    });

    const mostAccessedScreens = Object.entries(screenAccess)
      .map(([screen, data]) => ({ screen, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate task completion rate
    let totalTasks = 0;
    let completedTasks = 0;
    sessions.forEach((session) => {
      if (session.tasks_completed) {
        session.tasks_completed.forEach((task: any) => {
          totalTasks++;
          if (task.success) completedTasks++;
        });
      }
    });
    const taskCompletionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Generate activity trend (last 30 days)
    const activityTrend = sessions
      .filter((s) => s.session?.signed_in_at)
      .map((s) => ({
        date: s.session.signed_in_at.split("T")[0],
        productivity: s.productivity_score || 0,
        duration: s.total_session_duration_minutes || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalSessions,
      averageSessionDuration: Math.round(averageSessionDuration),
      averageProductivityScore: Math.round(averageProductivityScore),
      totalActiveTime,
      totalIdleTime,
      totalBreakTime,
      mostAccessedScreens,
      taskCompletionRate: Math.round(taskCompletionRate),
      activityTrend,
    };
  } catch (error) {
    console.error("Error getting staff session analytics:", error);
    return getEmptyAnalytics();
  }
}

function getEmptyAnalytics() {
  return {
    totalSessions: 0,
    averageSessionDuration: 0,
    averageProductivityScore: 0,
    totalActiveTime: 0,
    totalIdleTime: 0,
    totalBreakTime: 0,
    mostAccessedScreens: [],
    taskCompletionRate: 0,
    activityTrend: [],
  };
}

/**
 * Gets real-time activity monitoring data for all active sessions
 * @param businessId - The business ID
 * @returns Real-time monitoring data
 */
export async function getRealTimeActivityMonitoring(
  businessId: string
): Promise<{
  activeSessions: ActiveStaffSessionWithActivity[];
  totalActiveStaff: number;
  averageProductivity: number;
  alertsCount: number;
  alerts: Array<{
    type: "idle" | "low_productivity" | "long_session";
    staffId: string;
    staffName: string;
    message: string;
    severity: "low" | "medium" | "high";
  }>;
}> {
  try {
    const activeSessions = await getActiveStaffSessionsWithActivity(businessId);
    const totalActiveStaff = activeSessions.length;

    // Calculate average productivity
    const productivityScores = activeSessions
      .map((s) => s.activity?.productivity_score)
      .filter((score) => score !== null && score !== undefined) as number[];

    const averageProductivity =
      productivityScores.length > 0
        ? Math.round(
            productivityScores.reduce((sum, score) => sum + score, 0) /
              productivityScores.length
          )
        : 0;

    // Generate alerts
    const alerts: Array<{
      type: "idle" | "low_productivity" | "long_session";
      staffId: string;
      staffName: string;
      message: string;
      severity: "low" | "medium" | "high";
    }> = [];

    const now = new Date();

    activeSessions.forEach((session) => {
      const staffName = `${session.staff.first_name} ${session.staff.last_name}`;
      const lastActivity = new Date(session.activity.last_activity_at);
      const idleMinutes = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60)
      );

      // Idle time alerts
      if (idleMinutes > 30) {
        alerts.push({
          type: "idle",
          staffId: session.staff_id,
          staffName,
          message: `Has been idle for ${idleMinutes} minutes`,
          severity: idleMinutes > 60 ? "high" : "medium",
        });
      }

      // Low productivity alerts
      if (
        session.activity.productivity_score !== null &&
        session.activity.productivity_score < 40
      ) {
        alerts.push({
          type: "low_productivity",
          staffId: session.staff_id,
          staffName,
          message: `Low productivity score: ${session.activity.productivity_score}%`,
          severity:
            session.activity.productivity_score < 25 ? "high" : "medium",
        });
      }

      // Long session alerts
      const sessionDuration = session.activity.total_session_duration_minutes;
      if (sessionDuration > 480) {
        // 8 hours
        alerts.push({
          type: "long_session",
          staffId: session.staff_id,
          staffName,
          message: `Long session: ${Math.round(sessionDuration / 60)} hours`,
          severity: sessionDuration > 600 ? "high" : "low", // 10+ hours is high
        });
      }
    });

    return {
      activeSessions,
      totalActiveStaff,
      averageProductivity,
      alertsCount: alerts.length,
      alerts,
    };
  } catch (error) {
    console.error("Error getting real-time activity monitoring:", error);
    return {
      activeSessions: [],
      totalActiveStaff: 0,
      averageProductivity: 0,
      alertsCount: 0,
      alerts: [],
    };
  }
}

/**
 * Cleans up old activity logs (older than specified days)
 * @param businessId - The business ID
 * @param daysToKeep - Number of days to keep logs (default: 90)
 * @returns Number of logs cleaned up
 */
export async function cleanupOldActivityLogs(
  businessId: string,
  daysToKeep: number = 90
): Promise<number> {
  try {
    const supabase = await createClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from("staff_activity_logs")
      .delete()
      .eq("business_id", businessId)
      .lt("created_at", cutoffDate.toISOString())
      .select();

    if (error) {
      console.error("Error cleaning up old activity logs:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error cleaning up old activity logs:", error);
    return 0;
  }
}
