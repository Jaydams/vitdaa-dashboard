import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";

/**
 * Updated Hybrid Authentication System
 * Adapted to work with your existing database schema
 * Four-layer authentication structure:
 * 1. Admin Authentication (Supabase Auth)
 * 2. Shift Control (Time-bound permission gate)
 * 3. Staff PIN Authentication (Simple PIN codes)
 * 4. Session Management (Hierarchical session tracking)
 */

// Updated types to match your database schema
export interface AdminSession {
  id: string;
  business_owner_id: string; // Updated to match your schema
  session_token: string;
  required_for: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  admin_id?: string; // Added by our addon
  last_activity?: string; // Added by our addon
  ip_address?: string; // Added by our addon
  user_agent?: string; // Added by our addon
}

export interface RestaurantShift {
  id: string;
  business_id: string;
  admin_id: string;
  shift_name: string;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  max_staff_sessions: number;
  auto_end_time?: string;
  created_at: string;
}

export interface StaffSession {
  id: string;
  staff_id: string;
  business_id: string;
  session_token: string;
  signed_in_by: string; // Matches your existing schema
  signed_in_at: string; // Matches your existing schema
  signed_out_at?: string; // Matches your existing schema
  is_active: boolean;
  expires_at: string;
  shift_id?: string; // Added by our addon
  pin_hash?: string; // Added by our addon
  last_activity?: string; // Added by our addon
  ip_address?: string; // Added by our addon
  device_info?: any; // Added by our addon
}

export interface Staff {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  pin_hash: string; // Your existing column
  role: string; // Your existing column
  permissions: any; // Your existing column
  is_active: boolean;
  position?: string; // Added by our addon
  failed_login_attempts?: number; // Added by our addon
  locked_until?: string; // Added by our addon
  last_login?: string; // Added by our addon
  login_count?: number; // Added by our addon
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_id?: string;
  staff_id?: string;
  business_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: any;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Updated Hybrid Authentication Manager
 * Adapted to work with your existing database schema
 */
export class HybridAuthManager {
  private supabase: any = null;

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Layer 1: Admin Authentication
   * Create admin session using your existing admin_sessions table
   */
  async createAdminSession(
    businessOwnerId: string,
    requiredFor: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; session?: AdminSession; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      const sessionToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { data, error } = await supabase
        .from("admin_sessions")
        .insert({
          business_owner_id: businessOwnerId,
          session_token: sessionToken,
          required_for: requiredFor,
          is_active: true,
          expires_at: expiresAt.toISOString(),
          admin_id: adminId,
          last_activity: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      return { success: false, error: "Failed to create admin session" };
    }
  }

  /**
   * Layer 2: Shift Control
   * Start a restaurant shift for time-bound access
   */
  async startShift(
    businessId: string,
    adminId: string,
    shiftName: string,
    maxStaffSessions: number = 50,
    autoEndHours?: number
  ): Promise<{ success: boolean; shift?: RestaurantShift; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      // End any existing active shifts for this business
      await supabase
        .from("restaurant_shifts")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("business_id", businessId)
        .eq("is_active", true);

      const autoEndTime = autoEndHours
        ? new Date(Date.now() + autoEndHours * 60 * 60 * 1000)
        : null;

      const { data, error } = await supabase
        .from("restaurant_shifts")
        .insert({
          business_id: businessId,
          admin_id: adminId,
          shift_name: shiftName,
          started_at: new Date().toISOString(),
          is_active: true,
          max_staff_sessions: maxStaffSessions,
          auto_end_time: autoEndTime?.toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, shift: data };
    } catch (error) {
      return { success: false, error: "Failed to start shift" };
    }
  }

  /**
   * Layer 3: Staff PIN Authentication
   * Authenticate staff using PIN and create session
   */
  async authenticateStaff(
    businessId: string,
    staffId: string,
    pin: string,
    signedInBy: string,
    ipAddress?: string,
    deviceInfo?: any
  ): Promise<{ success: boolean; session?: StaffSession; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      // Check if there's an active shift
      const { data: activeShift } = await supabase
        .from("restaurant_shifts")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .single();

      if (!activeShift) {
        return { success: false, error: "No active shift found" };
      }

      // Get staff member and verify PIN
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("id", staffId)
        .eq("business_id", businessId)
        .eq("is_active", true)
        .single();

      if (staffError || !staff) {
        return { success: false, error: "Staff member not found" };
      }

      // Check if account is locked
      if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
        return { success: false, error: "Account is temporarily locked" };
      }

      // Verify PIN
      const pinHash = this.hashPin(pin);
      if (staff.pin_hash !== pinHash) {
        // Increment failed attempts
        const failedAttempts = (staff.failed_login_attempts || 0) + 1;
        const lockUntil =
          failedAttempts >= 5
            ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
            : null;

        await supabase
          .from("staff")
          .update({
            failed_login_attempts: failedAttempts,
            locked_until: lockUntil?.toISOString(),
          })
          .eq("id", staffId);

        return { success: false, error: "Invalid PIN" };
      }

      // Check session limit
      const { count } = await supabase
        .from("staff_sessions")
        .select("*", { count: "exact" })
        .eq("business_id", businessId)
        .eq("is_active", true);

      if (count && count >= activeShift.max_staff_sessions) {
        return { success: false, error: "Maximum staff sessions reached" };
      }

      // Create staff session (compatible with existing system)
      const sessionToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

      const { data: session, error: sessionError } = await supabase
        .from("staff_sessions")
        .insert({
          staff_id: staffId,
          business_id: businessId,
          session_token: sessionToken,
          signed_in_by: signedInBy,
          signed_in_at: new Date().toISOString(),
          is_active: true,
          expires_at: expiresAt.toISOString(),
          // Hybrid auth specific fields (added by addon)
          shift_id: activeShift.id,
          pin_hash: pinHash,
          last_activity: new Date().toISOString(),
          ip_address: ipAddress,
          device_info: deviceInfo,
        })
        .select()
        .single();

      if (sessionError) {
        return { success: false, error: sessionError.message };
      }

      // Reset failed attempts and update login info
      await supabase
        .from("staff")
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date().toISOString(),
          login_count: (staff.login_count || 0) + 1,
        })
        .eq("id", staffId);

      return { success: true, session };
    } catch (error) {
      return { success: false, error: "Authentication failed" };
    }
  }

  /**
   * Layer 4: Session Management
   * Validate and manage sessions
   */
  async validateAdminSession(
    sessionToken: string
  ): Promise<{ valid: boolean; session?: AdminSession; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("admin_sessions")
        .select("*")
        .eq("session_token", sessionToken)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return { valid: false, error: "Invalid session" };
      }

      // Check if session has expired
      if (new Date(data.expires_at) < new Date()) {
        await supabase
          .from("admin_sessions")
          .update({ is_active: false })
          .eq("id", data.id);
        return { valid: false, error: "Session expired" };
      }

      // Update last activity
      await supabase
        .from("admin_sessions")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", data.id);

      return { valid: true, session: data };
    } catch (error) {
      return { valid: false, error: "Session validation failed" };
    }
  }

  async validateStaffSession(
    sessionToken: string
  ): Promise<{ valid: boolean; session?: StaffSession; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("staff_sessions")
        .select("*")
        .eq("session_token", sessionToken)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return { valid: false, error: "Invalid session" };
      }

      // Check if session has expired
      if (new Date(data.expires_at) < new Date()) {
        await supabase
          .from("staff_sessions")
          .update({ is_active: false, signed_out_at: new Date().toISOString() })
          .eq("id", data.id);
        return { valid: false, error: "Session expired" };
      }

      // Update last activity
      await supabase
        .from("staff_sessions")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", data.id);

      return { valid: true, session: data };
    } catch (error) {
      return { valid: false, error: "Session validation failed" };
    }
  }

  /**
   * End shift and all associated staff sessions
   */
  async endShift(
    shiftId: string,
    adminId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getSupabase();
      // End the shift
      await supabase
        .from("restaurant_shifts")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", shiftId)
        .eq("admin_id", adminId);

      // End all staff sessions for this shift
      await supabase
        .from("staff_sessions")
        .update({ is_active: false, signed_out_at: new Date().toISOString() })
        .eq("shift_id", shiftId)
        .eq("is_active", true);

      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to end shift" };
    }
  }

  /**
   * Get active sessions for a business
   */
  async getActiveSessions(businessId: string): Promise<{
    admin_sessions: AdminSession[];
    staff_sessions: StaffSession[];
  }> {
    const supabase = await this.getSupabase();
    const { data: adminSessions } = await supabase
      .from("admin_sessions")
      .select("*")
      .eq("business_owner_id", businessId)
      .eq("is_active", true);

    const { data: staffSessions } = await supabase
      .from("staff_sessions")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true);

    return {
      admin_sessions: adminSessions || [],
      staff_sessions: staffSessions || [],
    };
  }

  /**
   * Get current shift status
   */
  async getShiftStatus(businessId: string): Promise<{
    is_active: boolean;
    shift?: RestaurantShift;
    active_staff_count: number;
    max_staff_allowed: number;
  }> {
    const supabase = await this.getSupabase();
    const { data: shift } = await supabase
      .from("restaurant_shifts")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .single();

    if (!shift) {
      return {
        is_active: false,
        active_staff_count: 0,
        max_staff_allowed: 0,
      };
    }

    const { count } = await supabase
      .from("staff_sessions")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .eq("is_active", true);

    return {
      is_active: true,
      shift,
      active_staff_count: count || 0,
      max_staff_allowed: shift.max_staff_sessions,
    };
  }

  /**
   * Utility functions
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString("hex");
  }

  private hashPin(pin: string): string {
    return createHash("sha256").update(pin).digest("hex");
  }

  /**
   * Log audit events
   */
  async logAuditEvent(
    businessId: string,
    action: string,
    details: any,
    adminId?: string,
    staffId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      await supabase.from("audit_logs").insert({
        business_id: businessId,
        admin_id: adminId,
        staff_id: staffId,
        action,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  }
}

// Export singleton instance
export const hybridAuth = new HybridAuthManager();

// Export ShiftManager as an alias for backward compatibility
export const ShiftManager = hybridAuth;
