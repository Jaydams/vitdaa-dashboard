import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Staff, StaffSessionRecord } from "@/types/auth";
import bcrypt from "bcryptjs";
// Use Web Crypto API instead of Node.js crypto for Edge Runtime compatibility

// ============================================================================
// PIN MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Validates staff member credentials using PIN
 * @param pin - The staff member's PIN
 * @param businessId - The business ID to validate against (optional - if not provided, searches all businesses)
 * @returns Staff object if valid, null otherwise
 */
export async function validateStaffMember(
  pin: string,
  businessId?: string
): Promise<Staff | null> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return null;
    }

    // Get all active staff members for the business (or all businesses if no businessId provided)
    let query = supabase.from("staff").select("*").eq("is_active", true);

    if (businessId) {
      query = query.eq("business_id", businessId);
    }

    const { data: staffMembers, error } = await query;

    if (error || !staffMembers) {
      return null;
    }

    // Check PIN against each staff member's hashed PIN
    for (const staff of staffMembers) {
      const isValidPin = await verifyPin(pin, staff.pin_hash);
      if (isValidPin) {
        // Update last login time
        await supabase
          .from("staff")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", staff.id);

        return staff as Staff;
      }
    }

    return null;
  } catch (error) {
    console.error("Error validating staff member:", error);
    return null;
  }
}

/**
 * Hashes a PIN using bcrypt
 * @param pin - The plain text PIN
 * @returns Hashed PIN
 */
export async function hashPin(pin: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(pin, saltRounds);
}

/**
 * Verifies a PIN against its hash
 * @param pin - The plain text PIN
 * @param hashedPin - The hashed PIN to compare against
 * @returns True if PIN matches, false otherwise
 */
export async function verifyPin(
  pin: string,
  hashedPin: string
): Promise<boolean> {
  return bcrypt.compare(pin, hashedPin);
}

/**
 * Generates a secure random PIN
 * @param length - Length of the PIN (default: 4)
 * @returns Generated PIN as string
 */
export function generateSecurePin(length: number = 4): string {
  const digits = "0123456789";
  let pin = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    pin += digits[randomIndex];
  }

  return pin;
}

// ============================================================================
// ADMIN PIN MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Hashes an admin PIN using bcrypt
 * @param adminPin - The plain text admin PIN
 * @returns Hashed admin PIN
 */
export async function hashAdminPin(adminPin: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(adminPin, saltRounds);
}

/**
 * Verifies an admin PIN against its hash
 * @param adminPin - The plain text admin PIN
 * @param hashedAdminPin - The hashed admin PIN to compare against
 * @returns True if admin PIN matches, false otherwise
 */
export async function verifyAdminPin(
  adminPin: string,
  hashedAdminPin: string
): Promise<boolean> {
  return bcrypt.compare(adminPin, hashedAdminPin);
}

// ============================================================================
// SESSION TOKEN MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Generates a cryptographically secure session token
 * @returns Secure session token string
 */
export function generateSessionToken(): string {
  // Use Web Crypto API for Edge Runtime compatibility
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// ============================================================================
// STAFF SESSION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Validates a staff session token and returns session data
 * @param sessionToken - The session token to validate
 * @returns StaffSessionRecord if valid and active, null otherwise
 */
export async function validateStaffSession(
  sessionToken: string
): Promise<StaffSessionRecord | null> {
  try {
    const supabase = await createServiceClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return null;
    }

    const { data: session, error } = await supabase
      .from("staff_sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .eq("is_active", true)
      .single();

    if (error || !session) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      // Session has expired, mark as inactive
      await supabase
        .from("staff_sessions")
        .update({
          is_active: false,
          signed_out_at: now.toISOString(),
        })
        .eq("id", session.id);

      return null;
    }

    return session as StaffSessionRecord;
  } catch (error) {
    console.error("Error validating staff session:", error);
    return null;
  }
}

/**
 * Creates a new staff session
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param signedInBy - The business owner ID who signed in the staff
 * @returns StaffSessionRecord if successful, null otherwise
 */
export async function createStaffSession(
  staffId: string,
  businessId: string,
  signedInBy: string
): Promise<StaffSessionRecord | null> {
  try {
    const supabase = await createServiceClient();

    if (!supabase) {
      console.error("Failed to create Supabase service client");
      return null;
    }



    // First, terminate any existing active sessions for this staff member
    await supabase
      .from("staff_sessions")
      .update({
        is_active: false,
        signed_out_at: new Date().toISOString(),
      })
      .eq("staff_id", staffId)
      .eq("is_active", true);

    // Create new session with 8-hour expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours
    const sessionToken = generateSessionToken();

    const sessionData = {
      staff_id: staffId,
      business_id: businessId,
      session_token: sessionToken,
      signed_in_by: signedInBy,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    };

    const { data: session, error } = await supabase
      .from("staff_sessions")
      .insert(sessionData)
      .select()
      .single();

    if (error || !session) {
      console.error("Error creating staff session:", error);
      return null;
    }

    return session as StaffSessionRecord;
  } catch (error) {
    console.error("Error creating staff session:", error);
    return null;
  }
}

/**
 * Terminates a staff session
 * @param sessionId - The session ID to terminate
 * @returns True if successful, false otherwise
 */
export async function terminateStaffSession(
  sessionId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return false;
    }

    const { error } = await supabase
      .from("staff_sessions")
      .update({
        is_active: false,
        signed_out_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Error terminating staff session:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error terminating staff session:", error);
    return false;
  }
}

/**
 * Terminates all active sessions for a specific staff member
 * @param staffId - The staff member's ID
 * @returns True if successful, false otherwise
 */
export async function terminateAllStaffSessions(
  staffId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return false;
    }

    const { error } = await supabase
      .from("staff_sessions")
      .update({
        is_active: false,
        signed_out_at: new Date().toISOString(),
      })
      .eq("staff_id", staffId)
      .eq("is_active", true);

    if (error) {
      console.error("Error terminating all staff sessions:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error terminating all staff sessions:", error);
    return false;
  }
}

/**
 * Gets all active staff sessions for a business
 * @param businessId - The business ID
 * @returns Array of active staff sessions with staff details
 */
export async function getActiveStaffSessions(
  businessId: string
): Promise<(StaffSessionRecord & { staff: Staff })[]> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return [];
    }

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
        )
      `
      )
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("signed_in_at", { ascending: false });

    if (error) {
      console.error("Error getting active staff sessions:", error);
      return [];
    }

    return sessions || [];
  } catch (error) {
    console.error("Error getting active staff sessions:", error);
    return [];
  }
}

/**
 * Cleans up expired staff sessions
 * @param businessId - Optional business ID to limit cleanup to specific business
 * @returns Number of sessions cleaned up
 */
export async function cleanupExpiredSessions(
  businessId?: string
): Promise<number> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return 0;
    }

    let query = supabase
      .from("staff_sessions")
      .update({
        is_active: false,
        signed_out_at: new Date().toISOString(),
      })
      .eq("is_active", true)
      .lt("expires_at", new Date().toISOString());

    if (businessId) {
      query = query.eq("business_id", businessId);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error("Error cleaning up expired sessions:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    return 0;
  }
}

// ============================================================================
// ADMIN PIN MANAGEMENT FUNCTIONS FOR STAFF
// ============================================================================

/**
 * Generates a new PIN for a staff member (admin function)
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @returns New PIN if successful, null otherwise
 */
export async function generateNewStaffPIN(
  staffId: string,
  businessId: string
): Promise<string | null> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return null;
    }

    // Verify staff belongs to business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, business_id")
      .eq("id", staffId)
      .eq("business_id", businessId)
      .single();

    if (staffError || !staff) {
      console.error("Staff not found or doesn't belong to business");
      return null;
    }

    // Generate new PIN and hash it
    const newPin = generateSecurePin(4);
    const hashedPin = await hashPin(newPin);

    // Update staff PIN
    const { error: updateError } = await supabase
      .from("staff")
      .update({ pin_hash: hashedPin })
      .eq("id", staffId);

    if (updateError) {
      console.error("Error updating staff PIN:", updateError);
      return null;
    }

    return newPin;
  } catch (error) {
    console.error("Error generating new staff PIN:", error);
    return null;
  }
}

/**
 * Changes a staff member's PIN to a custom PIN (admin function)
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param newPin - The new PIN to set
 * @returns True if successful, false otherwise
 */
export async function changeStaffPIN(
  staffId: string,
  businessId: string,
  newPin: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return false;
    }

    // Validate PIN format (4-8 digits)
    if (!/^\d{4,8}$/.test(newPin)) {
      console.error("Invalid PIN format");
      return false;
    }

    // Verify staff belongs to business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, business_id")
      .eq("id", staffId)
      .eq("business_id", businessId)
      .single();

    if (staffError || !staff) {
      console.error("Staff not found or doesn't belong to business");
      return false;
    }

    // Hash the new PIN
    const hashedPin = await hashPin(newPin);

    // Update staff PIN
    const { error: updateError } = await supabase
      .from("staff")
      .update({ pin_hash: hashedPin })
      .eq("id", staffId);

    if (updateError) {
      console.error("Error updating staff PIN:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error changing staff PIN:", error);
    return false;
  }
}

/**
 * Retrieves staff information for PIN management (admin function)
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @returns Staff information if found, null otherwise
 */
export async function getStaffForPINManagement(
  staffId: string,
  businessId: string
): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
} | null> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return null;
    }

    const { data: staff, error } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role, email")
      .eq("id", staffId)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .single();

    if (error || !staff) {
      return null;
    }

    return {
      id: staff.id,
      firstName: staff.first_name,
      lastName: staff.last_name,
      role: staff.role,
      email: staff.email || undefined,
    };
  } catch (error) {
    console.error("Error getting staff for PIN management:", error);
    return null;
  }
}

// ============================================================================
// ELEVATED ADMIN SESSION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Validates an elevated admin session token
 * @param sessionToken - The admin session token to validate
 * @returns AdminSession object if valid and active, null otherwise
 */
export async function validateAdminSession(
  sessionToken: string
): Promise<{ businessOwnerId: string; expiresAt: string } | null> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return null;
    }

    const { data: session, error } = await supabase
      .from("admin_sessions")
      .select("business_owner_id, expires_at")
      .eq("session_token", sessionToken)
      .eq("is_active", true)
      .single();

    if (error || !session) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      // Session has expired, mark as inactive
      await supabase
        .from("admin_sessions")
        .update({ is_active: false })
        .eq("session_token", sessionToken);

      return null;
    }

    return {
      businessOwnerId: session.business_owner_id,
      expiresAt: session.expires_at,
    };
  } catch (error) {
    console.error("Error validating admin session:", error);
    return null;
  }
}

/**
 * Invalidates an elevated admin session
 * @param sessionToken - The admin session token to invalidate
 * @returns True if successful, false otherwise
 */
export async function invalidateAdminSession(
  sessionToken: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return false;
    }

    const { error } = await supabase
      .from("admin_sessions")
      .update({ is_active: false })
      .eq("session_token", sessionToken);

    if (error) {
      console.error("Error invalidating admin session:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error invalidating admin session:", error);
    return false;
  }
}

/**
 * Cleans up expired admin sessions
 * @param businessOwnerId - Optional business owner ID to limit cleanup to specific owner
 * @returns Number of sessions cleaned up
 */
export async function cleanupExpiredAdminSessions(
  businessOwnerId?: string
): Promise<number> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return 0;
    }

    let query = supabase
      .from("admin_sessions")
      .update({ is_active: false })
      .eq("is_active", true)
      .lt("expires_at", new Date().toISOString());

    if (businessOwnerId) {
      query = query.eq("business_owner_id", businessOwnerId);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error("Error cleaning up expired admin sessions:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error cleaning up expired admin sessions:", error);
    return 0;
  }
}
