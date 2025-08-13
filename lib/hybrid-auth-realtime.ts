import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import React, { useState, useEffect } from "react";

/**
 * Updated Hybrid Authentication Realtime Manager
 * Adapted to work with your existing database schema
 * Provides real-time updates for shift status, session changes, and system events
 */

export interface RealtimeShiftStatus {
  id: string;
  business_id: string;
  shift_name: string;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  max_staff_sessions: number;
  auto_end_time?: string;
}

export interface RealtimeSessionUpdate {
  id: string;
  staff_id?: string;
  business_owner_id?: string; // Updated for admin sessions
  business_id: string;
  is_active: boolean;
  signed_in_at?: string; // For staff sessions
  created_at?: string; // For admin sessions
  last_activity?: string;
  action: "INSERT" | "UPDATE" | "DELETE";
}

export interface RealtimeAuditLog {
  id: string;
  business_id: string;
  action: string;
  details: any;
  created_at: string;
}

/**
 * Realtime Shift Manager
 * Manages real-time subscriptions for shift status changes
 */
export class RealtimeShiftManager {
  private static channels: Map<string, RealtimeChannel> = new Map();
  private static supabase = createClient();

  /**
   * Subscribe to shift status changes for a specific business
   */
  static subscribeToShiftChanges(
    businessId: string,
    onShiftChange: (shift: RealtimeShiftStatus | null) => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `shifts:${businessId}`;

    console.log(`Attempting to subscribe to shift changes for business: ${businessId}`);
    console.log(`Channel name: ${channelName}`);

    // Remove existing channel if it exists
    this.unsubscribeFromShiftChanges(businessId);

    const channel = this.supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "restaurant_shifts",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log("Shift change detected:", payload);

          try {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            switch (eventType) {
              case "INSERT":
              case "UPDATE":
                onShiftChange(newRecord as RealtimeShiftStatus);
                break;
              case "DELETE":
                onShiftChange(null);
                break;
            }
          } catch (error) {
            console.error("Error processing shift change:", error);
            onError?.(error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for ${businessId}:`, status);
        if (status === "SUBSCRIBED") {
          console.log(
            `Successfully subscribed to shift changes for business: ${businessId}`
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            `Error subscribing to shift changes for business: ${businessId}`
          );
          onError?.(new Error("Failed to subscribe to shift changes"));
        } else {
          console.log(`Subscription status: ${status} for business: ${businessId}`);
        }
      });

    this.channels.set(businessId, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromShiftChanges(businessId);
  }

  /**
   * Unsubscribe from shift changes for a specific business
   */
  static unsubscribeFromShiftChanges(businessId: string): void {
    const channel = this.channels.get(businessId);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(businessId);
      console.log(
        `Unsubscribed from shift changes for business: ${businessId}`
      );
    }
  }

  /**
   * Subscribe to active staff session count changes
   */
  static subscribeToSessionCount(
    businessId: string,
    onCountChange: (count: number) => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `topic:staff_sessions:${businessId}`;

    const channel = this.supabase
      .channel(channelName)
      .on('broadcast', { event: 'INSERT' }, async (payload) => {
        try {
          // Get updated session count
          const { count } = await this.supabase
            .from("staff_sessions")
            .select("*", { count: "exact" })
            .eq("business_id", businessId)
            .eq("is_active", true);
          
          onCountChange(count || 0);
        } catch (error) {
          console.error("Error updating session count:", error);
          onError?.(error);
        }
      })
      .on('broadcast', { event: 'UPDATE' }, async (payload) => {
        try {
          // Get updated session count
          const { count } = await this.supabase
            .from("staff_sessions")
            .select("*", { count: "exact" })
            .eq("business_id", businessId)
            .eq("is_active", true);
          
          onCountChange(count || 0);
        } catch (error) {
          console.error("Error updating session count:", error);
          onError?.(error);
        }
      })
      .on('broadcast', { event: 'DELETE' }, async (payload) => {
        try {
          // Get updated session count
          const { count } = await this.supabase
            .from("staff_sessions")
            .select("*", { count: "exact" })
            .eq("business_id", businessId)
            .eq("is_active", true);
          
          onCountChange(count || 0);
        } catch (error) {
          console.error("Error updating session count:", error);
          onError?.(error);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(
            `Subscribed to session count changes for business: ${businessId}`
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            `Error subscribing to session count changes for business: ${businessId}`
          );
          onError?.(new Error("Failed to subscribe to session count changes"));
        }
      });

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}

/**
 * Realtime Session Manager
 * Manages real-time subscriptions for session changes
 */
export class RealtimeSessionManager {
  private static channels: Map<string, RealtimeChannel> = new Map();
  private static supabase = createClient();

  /**
   * Subscribe to session changes for admin dashboard
   * Updated to work with your existing admin_sessions and staff_sessions tables
   */
  static subscribeToSessionChanges(
    businessId: string,
    onSessionChange: (update: RealtimeSessionUpdate) => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `admin-sessions:${businessId}`;

    // Subscribe to admin sessions (using business_owner_id)
    const adminChannel = this.supabase
      .channel(`${channelName}:admin`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_sessions",
          filter: `business_owner_id=eq.${businessId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          onSessionChange({
            ...newRecord,
            action: eventType,
          } as RealtimeSessionUpdate);
        }
      )
      .subscribe();

    // Subscribe to staff sessions
    const staffChannel = this.supabase
      .channel(`${channelName}:staff`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_sessions",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          onSessionChange({
            ...newRecord,
            action: eventType,
          } as RealtimeSessionUpdate);
        }
      )
      .subscribe();

    this.channels.set(`${channelName}:admin`, adminChannel);
    this.channels.set(`${channelName}:staff`, staffChannel);

    return () => {
      this.supabase.removeChannel(adminChannel);
      this.supabase.removeChannel(staffChannel);
      this.channels.delete(`${channelName}:admin`);
      this.channels.delete(`${channelName}:staff`);
    };
  }

  /**
   * Subscribe to audit log changes for security monitoring
   */
  static subscribeToAuditLogs(
    businessId: string,
    onAuditLog: (log: RealtimeAuditLog) => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `audit:${businessId}`;

    const channel = this.supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          onAuditLog(payload.new as RealtimeAuditLog);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
    };
  }
}

/**
 * React Hook for Realtime Shift Status
 * Updated to work with your database schema
 */
export function useRealtimeShiftStatus(businessId: string) {
  const [shiftStatus, setShiftStatus] = useState<{
    is_active: boolean;
    shift?: RealtimeShiftStatus;
    active_staff_count: number;
    max_staff_allowed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;

    console.log(`Setting up realtime shift status for business: ${businessId}`);

    const fetchInitialStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/auth/hybrid/shifts/status?businessId=${businessId}`
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch shift status");
        }
        
        const data = await response.json();
        console.log("Initial shift status:", data);
        
        setShiftStatus({
          is_active: data.is_active,
          shift: data.shift,
          active_staff_count: data.active_staff_count || 0,
          max_staff_allowed: data.max_staff_allowed || 0,
        });
      } catch (err) {
        console.error("Error fetching initial shift status:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch shift status");
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial status
    fetchInitialStatus();

    // Set up realtime subscription
    const unsubscribe = RealtimeShiftManager.subscribeToShiftChanges(
      businessId,
      (shift) => {
        console.log("Realtime shift update received:", shift);
        if (shift) {
          setShiftStatus((prev) => ({
            ...prev,
            is_active: shift.is_active,
            shift: shift,
            max_staff_allowed: shift.max_staff_sessions || 0,
            active_staff_count: prev?.active_staff_count || 0,
          }));
        } else {
          setShiftStatus((prev) => ({
            ...prev,
            is_active: false,
            shift: undefined,
            max_staff_allowed: 0,
            active_staff_count: 0,
          }));
        }
      },
      (error) => {
        console.error("Realtime subscription error:", error);
        setError("Failed to subscribe to realtime updates");
      }
    );

    // Set up polling fallback (every 30 seconds)
    const pollInterval = setInterval(() => {
      console.log("Polling for shift status update...");
      fetchInitialStatus();
    }, 30000);

    return () => {
      console.log("Cleaning up realtime subscription and polling");
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [businessId]);

  return { shiftStatus, loading, error };
}

/**
 * React Hook for Realtime Session Monitoring
 * Updated to work with your admin_sessions table structure
 */
export function useRealtimeSessionMonitoring(
  businessId: string,
  adminSessionToken: string
) {
  const [sessions, setSessions] = React.useState<{
    admin_sessions: any[];
    staff_sessions: any[];
  }>({ admin_sessions: [], staff_sessions: [] });
  const [auditLogs, setAuditLogs] = React.useState<RealtimeAuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!businessId || !adminSessionToken) return;

    let unsubscribeSessions: (() => void) | null = null;
    let unsubscribeAudit: (() => void) | null = null;

    // Initial fetch
    const fetchInitialData = async () => {
      try {
        const response = await fetch(
          `/api/auth/hybrid/sessions/active?sessionToken=${adminSessionToken}&businessId=${businessId}`
        );
        const data = await response.json();

        if (data.success) {
          setSessions(data.sessions);
        }
      } catch (err) {
        console.error("Error fetching initial session data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to session changes
    unsubscribeSessions = RealtimeSessionManager.subscribeToSessionChanges(
      businessId,
      (update) => {
        // Refresh session data when changes occur
        fetchInitialData();
      },
      (error) => {
        console.error("Session monitoring error:", error);
      }
    );

    // Subscribe to audit logs
    unsubscribeAudit = RealtimeSessionManager.subscribeToAuditLogs(
      businessId,
      (log) => {
        setAuditLogs((prev) => [log, ...prev.slice(0, 49)]); // Keep last 50 logs
      },
      (error) => {
        console.error("Audit log error:", error);
      }
    );

    return () => {
      unsubscribeSessions?.();
      unsubscribeAudit?.();
    };
  }, [businessId, adminSessionToken]);

  return { sessions, auditLogs, loading };
}

/**
 * Utility function to check if Supabase Realtime is available
 */
export function isRealtimeAvailable(): boolean {
  try {
    const supabase = createClient();
    return !!supabase.realtime;
  } catch (error) {
    console.error("Realtime not available:", error);
    return false;
  }
}

/**
 * Cleanup all realtime subscriptions
 */
export function cleanupRealtimeSubscriptions(): void {
  RealtimeShiftManager.unsubscribeFromShiftChanges("all");
  // Note: RealtimeSessionManager doesn't have a cleanup method, so we'll just clear the channels
  // This is a temporary fix until we add proper cleanup methods
}
