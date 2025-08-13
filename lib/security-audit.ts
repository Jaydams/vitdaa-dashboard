import { createClient } from "@/lib/supabase/server";

export type SecurityEventType =
  | "staff_pin_failure"
  | "staff_pin_success"
  | "staff_pin_lockout"
  | "admin_pin_failure"
  | "admin_pin_success"
  | "admin_pin_lockout"
  | "unauthorized_access_attempt"
  | "session_hijack_attempt"
  | "permission_violation"
  | "suspicious_activity"
  | "account_lockout"
  | "password_reset_attempt"
  | "multiple_login_attempts"
  | "session_expired"
  | "forced_logout";

export interface SecurityAuditLog {
  id?: string;
  business_id: string;
  event_type: SecurityEventType;
  severity: "low" | "medium" | "high" | "critical";
  user_id?: string;
  staff_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, unknown>;
  created_at?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<string, number>;
  recentEvents: SecurityAuditLog[];
  suspiciousPatterns: {
    multipleFailedAttempts: number;
    unusualAccessPatterns: number;
    rateLimitViolations: number;
  };
}

/**
 * Log a security event to the audit trail
 * @param event - Security event details
 */
export async function logSecurityEvent(
  event: Omit<SecurityAuditLog, "id" | "created_at">
): Promise<void> {
  try {
    const supabase = await createClient();

    const auditRecord = {
      ...event,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("security_audit_logs")
      .insert(auditRecord);

    if (error) {
      console.error("Error logging security event:", error);
      // Don't throw error to avoid breaking main functionality
    }

    // Log critical events to console for immediate attention
    if (event.severity === "critical") {
      console.warn("CRITICAL SECURITY EVENT:", {
        type: event.event_type,
        businessId: event.business_id,
        details: event.details,
      });
    }
  } catch (error) {
    console.error("Error in security audit logging:", error);
  }
}

/**
 * Log staff PIN authentication failure
 * @param businessId - Business ID
 * @param attemptDetails - Details about the failed attempt
 */
export async function logStaffPinFailure(
  businessId: string,
  attemptDetails: {
    staffId?: string;
    ipAddress?: string;
    userAgent?: string;
    partialPin?: string;
    attemptCount?: number;
  }
): Promise<void> {
  await logSecurityEvent({
    business_id: businessId,
    event_type: "staff_pin_failure",
    severity:
      attemptDetails.attemptCount && attemptDetails.attemptCount >= 3
        ? "high"
        : "medium",
    staff_id: attemptDetails.staffId,
    ip_address: attemptDetails.ipAddress,
    user_agent: attemptDetails.userAgent,
    details: {
      partial_pin: attemptDetails.partialPin?.substring(0, 2) + "**", // Only log first 2 digits
      attempt_count: attemptDetails.attemptCount,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log staff PIN authentication success
 * @param businessId - Business ID
 * @param staffId - Staff member ID
 * @param sessionDetails - Session creation details
 */
export async function logStaffPinSuccess(
  businessId: string,
  staffId: string,
  sessionDetails: {
    sessionId: string;
    signedInBy: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    business_id: businessId,
    event_type: "staff_pin_success",
    severity: "low",
    staff_id: staffId,
    ip_address: sessionDetails.ipAddress,
    user_agent: sessionDetails.userAgent,
    details: {
      session_id: sessionDetails.sessionId,
      signed_in_by: sessionDetails.signedInBy,
      login_method: "pin_authentication",
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log staff PIN lockout event
 * @param businessId - Business ID
 * @param lockoutDetails - Lockout details
 */
export async function logStaffPinLockout(
  businessId: string,
  lockoutDetails: {
    identifier: string;
    attemptCount: number;
    lockoutDuration: number;
    ipAddress?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    business_id: businessId,
    event_type: "staff_pin_lockout",
    severity: "high",
    ip_address: lockoutDetails.ipAddress,
    details: {
      identifier: lockoutDetails.identifier,
      failed_attempts: lockoutDetails.attemptCount,
      lockout_duration_minutes: Math.round(
        lockoutDetails.lockoutDuration / (60 * 1000)
      ),
      lockout_triggered_at: new Date().toISOString(),
    },
  });
}

/**
 * Log admin PIN authentication failure
 * @param businessId - Business ID
 * @param businessOwnerId - Business owner ID
 * @param attemptDetails - Details about the failed attempt
 */
export async function logAdminPinFailure(
  businessId: string,
  businessOwnerId: string,
  attemptDetails: {
    ipAddress?: string;
    userAgent?: string;
    attemptCount?: number;
    requiredFor?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    business_id: businessId,
    event_type: "admin_pin_failure",
    severity:
      attemptDetails.attemptCount && attemptDetails.attemptCount >= 5
        ? "critical"
        : "high",
    user_id: businessOwnerId,
    ip_address: attemptDetails.ipAddress,
    user_agent: attemptDetails.userAgent,
    details: {
      attempt_count: attemptDetails.attemptCount,
      required_for: attemptDetails.requiredFor,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log admin PIN authentication success
 * @param businessId - Business ID
 * @param businessOwnerId - Business owner ID
 * @param sessionDetails - Elevated session details
 */
export async function logAdminPinSuccess(
  businessId: string,
  businessOwnerId: string,
  sessionDetails: {
    requiredFor: string;
    sessionDuration: number;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    business_id: businessId,
    event_type: "admin_pin_success",
    severity: "medium",
    user_id: businessOwnerId,
    ip_address: sessionDetails.ipAddress,
    user_agent: sessionDetails.userAgent,
    details: {
      required_for: sessionDetails.requiredFor,
      session_duration_minutes: Math.round(
        sessionDetails.sessionDuration / (60 * 1000)
      ),
      elevated_access_granted: true,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log admin PIN lockout event
 * @param businessId - Business ID
 * @param businessOwnerId - Business owner ID
 * @param lockoutDetails - Lockout details
 */
export async function logAdminPinLockout(
  businessId: string,
  businessOwnerId: string,
  lockoutDetails: {
    attemptCount: number;
    lockoutDuration: number;
    ipAddress?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    business_id: businessId,
    event_type: "admin_pin_lockout",
    severity: "critical",
    user_id: businessOwnerId,
    ip_address: lockoutDetails.ipAddress,
    details: {
      failed_attempts: lockoutDetails.attemptCount,
      lockout_duration_minutes: Math.round(
        lockoutDetails.lockoutDuration / (60 * 1000)
      ),
      admin_access_locked: true,
      lockout_triggered_at: new Date().toISOString(),
    },
  });
}

/**
 * Log unauthorized access attempt
 * @param businessId - Business ID
 * @param accessDetails - Access attempt details
 */
export async function logUnauthorizedAccess(
  businessId: string,
  accessDetails: {
    userId?: string;
    staffId?: string;
    attemptedResource: string;
    requiredPermission?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    business_id: businessId,
    event_type: "unauthorized_access_attempt",
    severity: "high",
    user_id: accessDetails.userId,
    staff_id: accessDetails.staffId,
    ip_address: accessDetails.ipAddress,
    user_agent: accessDetails.userAgent,
    details: {
      attempted_resource: accessDetails.attemptedResource,
      required_permission: accessDetails.requiredPermission,
      access_denied: true,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log permission violation
 * @param businessId - Business ID
 * @param violationDetails - Permission violation details
 */
export async function logPermissionViolation(
  businessId: string,
  violationDetails: {
    userId?: string;
    staffId?: string;
    attemptedAction: string;
    requiredPermissions: string[];
    currentPermissions: string[];
    ipAddress?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    business_id: businessId,
    event_type: "permission_violation",
    severity: "medium",
    user_id: violationDetails.userId,
    staff_id: violationDetails.staffId,
    ip_address: violationDetails.ipAddress,
    details: {
      attempted_action: violationDetails.attemptedAction,
      required_permissions: violationDetails.requiredPermissions,
      current_permissions: violationDetails.currentPermissions,
      permission_gap: violationDetails.requiredPermissions.filter(
        (p) => !violationDetails.currentPermissions.includes(p)
      ),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get security metrics for a business
 * @param businessId - Business ID
 * @param timeRange - Time range for metrics (in hours, default: 24)
 * @returns Security metrics
 */
export async function getSecurityMetrics(
  businessId: string,
  timeRange: number = 24
): Promise<SecurityMetrics> {
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const { data: events, error } = await supabase
      .from("security_audit_logs")
      .select("*")
      .eq("business_id", businessId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching security metrics:", error);
      return {
        totalEvents: 0,
        eventsByType: {} as Record<SecurityEventType, number>,
        eventsBySeverity: {},
        recentEvents: [],
        suspiciousPatterns: {
          multipleFailedAttempts: 0,
          unusualAccessPatterns: 0,
          rateLimitViolations: 0,
        },
      };
    }

    const eventsByType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<SecurityEventType, number>);

    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyze suspicious patterns
    const failureEvents = events.filter(
      (e) =>
        e.event_type.includes("failure") || e.event_type.includes("lockout")
    );

    const multipleFailedAttempts = failureEvents.filter(
      (e) => e.details.attempt_count && e.details.attempt_count >= 3
    ).length;

    const rateLimitViolations = events.filter((e) =>
      e.event_type.includes("lockout")
    ).length;

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      recentEvents: events.slice(0, 10), // Last 10 events
      suspiciousPatterns: {
        multipleFailedAttempts,
        unusualAccessPatterns: 0, // Could be enhanced with IP analysis
        rateLimitViolations,
      },
    };
  } catch (error) {
    console.error("Error calculating security metrics:", error);
    return {
      totalEvents: 0,
      eventsByType: {} as Record<SecurityEventType, number>,
      eventsBySeverity: {},
      recentEvents: [],
      suspiciousPatterns: {
        multipleFailedAttempts: 0,
        unusualAccessPatterns: 0,
        rateLimitViolations: 0,
      },
    };
  }
}

/**
 * Get recent security events for a business
 * @param businessId - Business ID
 * @param limit - Number of events to return (default: 50)
 * @param severity - Filter by severity level
 * @returns Recent security events
 */
export async function getRecentSecurityEvents(
  businessId: string,
  limit: number = 50,
  severity?: "low" | "medium" | "high" | "critical"
): Promise<SecurityAuditLog[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("security_audit_logs")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq("severity", severity);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("Error fetching recent security events:", error);
      return [];
    }

    return events || [];
  } catch (error) {
    console.error("Error in getRecentSecurityEvents:", error);
    return [];
  }
}

/**
 * Clean up old security audit logs
 * @param retentionDays - Number of days to retain logs (default: 90)
 * @returns Number of logs cleaned up
 */
export async function cleanupOldSecurityLogs(
  retentionDays: number = 90
): Promise<number> {
  try {
    const supabase = await createClient();
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    );

    const { data, error } = await supabase
      .from("security_audit_logs")
      .delete()
      .lt("created_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      console.error("Error cleaning up old security logs:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error in cleanupOldSecurityLogs:", error);
    return 0;
  }
}
