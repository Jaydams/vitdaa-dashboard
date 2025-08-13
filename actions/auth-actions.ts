"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { validateBusinessOwner } from "./auth-utils";
import {
  validateStaffMember,
  hashPin,
  generateSecurePin,
  verifyPin,
  createStaffSession,
  terminateStaffSession,
  hashAdminPin,
  generateSessionToken,
  getActiveStaffSessions,
  generateNewStaffPIN,
  changeStaffPIN,
  getStaffForPINManagement,
} from "./staff-auth-utils";
import { User } from "@supabase/supabase-js";
import { StaffRole } from "@/types/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Audit logging function
async function logStaffActivity(
  businessId: string,
  staffId: string,
  action: string,
  performedBy: string,
  details?: Record<string, unknown>
) {
  try {
    const supabase = await createClient();
    await supabase.from("staff_activity_logs").insert({
      business_id: businessId,
      staff_id: staffId,
      action,
      performed_by: performedBy,
      details: details || {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging staff activity:", error);
    // Don't throw error to avoid breaking the main functionality
  }
}

// Business owner authentication actions
export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=missing-credentials");
  }

  try {
    const supabase = await createClient();

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.error("Authentication error:", authError);
      redirect(`/login?error=${encodeURIComponent(authError.message)}`);
    }

    if (!authData.user) {
      redirect("/login?error=authentication-failed");
    }

    // Validate business owner status
    const businessOwner = await validateBusinessOwner(authData.user.id);

    if (!businessOwner) {
      // Sign out the user since they're not a business owner
      await supabase.auth.signOut();
      redirect("/login?error=unauthorized-access");
    }

    // Revalidate the path to update the session
    revalidatePath("/", "layout");

    // Redirect to dashboard on successful authentication
    redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    // Do NOT redirect here, let the thrown redirect above handle navigation
  }
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const businessName = formData.get("businessName") as string;
  const businessType = formData.get("businessType") as string;

  if (!email || !password || !firstName || !lastName) {
    redirect("/signup?error=missing-required-fields");
  }

  try {
    const supabase = await createClient();

    // Create Supabase Auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (authError) {
      console.error("Signup error:", authError);
      redirect(`/signup?error=${encodeURIComponent(authError.message)}`);
    }

    if (!authData.user) {
      redirect("/signup?error=account-creation-failed");
    }

    // Create business owner profile in database
    const { error: profileError } = await supabase
      .from("business_owner")
      .insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        business_name: businessName || null,
        business_type: businessType || null,
        account_type: "business",
        email_verified: false,
        phone_verified: false,
        bvn_verified: false,
        identity_verified: false,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      redirect("/signup?error=profile-creation-failed");
    }

    // Check if email confirmation is required
    if (!authData.session) {
      // Email confirmation required
      redirect("/signup/confirm?message=check-email");
    }

    // If session exists, user is automatically signed in
    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (error) {
    console.error("Signup error:", error);
    redirect("/signup?error=server-error");
  }
}

export async function signInWithGoogle() {
  try {
    const supabase = await createClient();

    // Get the origin for redirect URL
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Initiate Google OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Google OAuth error:", error);
      redirect("/login?error=oauth-failed");
    }

    if (data.url) {
      // Redirect to Google OAuth URL
      redirect(data.url);
    }

    redirect("/login?error=oauth-url-missing");
  } catch (error) {
    console.error("Google OAuth error:", error);
    redirect("/login?error=server-error");
  }
}

export async function signout() {
  try {
    const supabase = await createClient();

    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Signout error:", error);
      // Even if there's an error, we should still redirect to login
      // as the session might be partially cleared
    }

    // Revalidate the path to clear any cached session data
    revalidatePath("/", "layout");

    // Redirect to login page
    redirect("/login?message=signed-out");
  } catch (error) {
    console.error("Signout error:", error);
    // Still redirect to login even if there's an error
    redirect("/login?error=signout-error");
  }
}

// Import rate limiting and security audit functions
import {
  checkStaffPinRateLimit,
  recordStaffPinFailure,
  clearStaffPinRateLimit,
  checkAdminPinRateLimit,
  recordAdminPinFailure,
  clearAdminPinRateLimit,
} from "@/lib/rate-limiting";
import {
  logStaffPinFailure,
  logStaffPinSuccess,
  logStaffPinLockout,
  logAdminPinFailure,
  logAdminPinSuccess,
  logAdminPinLockout,
} from "@/lib/security-audit";

// Staff authentication actions
export async function staffLogin(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    const pin = formData.get("pin") as string;

    console.log("Staff login attempt:", {
      email,
      username,
      pin: "***",
    });

    if (!email && !username) {
      redirect("/staff-login?error=missing-credentials");
    }

    if (!pin) {
      redirect("/staff-login?error=missing-credentials");
    }

    // Create service client to bypass RLS
    const supabase = await createServiceClient();

    if (!supabase) {
      console.error("Failed to create Supabase service client");
      redirect("/staff-login?error=server-error");
    }

    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from("staff")
      .select("count")
      .limit(1);

    console.log("Database connection test:", { testData, testError });

    // Get business ID from secure cookie or URL parameters
    const cookieStore = await cookies();
    let businessId = cookieStore.get("staff_business_id")?.value;

    console.log("Business ID from cookie:", businessId);
    
    // Debug: List all available cookies
    const allCookies = cookieStore.getAll();
    console.log("All available cookies:", allCookies.map(c => ({ name: c.name, value: c.value })));

    // If no business ID in cookie, try to get it from URL parameters
    if (!businessId) {
      console.log("No business ID found in cookie, checking URL parameters");
      // Note: We can't access URL parameters directly in server actions
      // The business ID should be set as a cookie when the page loads
      redirect("/staff-login?error=invalid-business");
    }

    // First, let's check what staff members exist for this business
    const { data: allBusinessStaff, error: allBusinessError } = await supabase
      .from("staff")
      .select("id, email, username, is_active, business_id")
      .eq("business_id", businessId);

    console.log("All staff for business:", allBusinessStaff);
    console.log("All business staff error:", allBusinessError);

    // Let's also check if there are any staff members at all in the database
    const { data: allStaffInDB, error: allStaffError } = await supabase
      .from("staff")
      .select("id, email, username, is_active, business_id");

    console.log("All staff in database:", allStaffInDB);
    console.log("All staff error:", allStaffError);

    // Let's also check the specific staff member by ID
    const { data: specificStaff, error: specificStaffError } = await supabase
      .from("staff")
      .select("*")
      .eq("id", "3d477cde-f8fb-4763-b904-9a6360cfe933");

    console.log("Specific staff member:", specificStaff);
    console.log("Specific staff error:", specificStaffError);

    // Build the query to find staff by email or username within the business
    let query = supabase
      .from("staff")
      .select("*")
      .eq("is_active", true)
      .eq("business_id", businessId);

    console.log("Base query built, adding email/username filter...");

    if (email) {
      query = query.eq("email", email);
      console.log("Searching by email:", email);
    } else if (username) {
      query = query.eq("username", username);
      console.log("Searching by username:", username);
    }

    console.log("Executing query...");
    const { data: staffMembers, error } = await query;

    console.log("Raw query result:", { 
      staffCount: staffMembers?.length || 0, 
      error: error?.message,
      errorCode: error?.code,
      foundStaff: staffMembers?.[0] ? {
        id: staffMembers[0].id,
        email: staffMembers[0].email,
        username: staffMembers[0].username,
        is_active: staffMembers[0].is_active,
        business_id: staffMembers[0].business_id
      } : null
    });

    if (error || !staffMembers || staffMembers.length === 0) {
      console.log("No staff member found");
      redirect("/staff-login?error=invalid-credentials");
    }

    const staff = staffMembers[0];

    console.log("Staff member found:", {
      id: staff.id,
      email: staff.email,
      username: staff.username,
      is_active: staff.is_active,
      hasPinHash: !!staff.pin_hash,
      business_id: staff.business_id
    });

    // Rate limiting check
    const rateLimitKey = `${staff.business_id}-${pin.substring(0, 2)}`;
    const rateLimitResult = checkStaffPinRateLimit(rateLimitKey);

    if (!rateLimitResult.allowed) {
      console.log("Rate limited:", rateLimitResult);
      // Log lockout event
      await logStaffPinLockout(staff.business_id, {
        identifier: rateLimitKey,
        attemptCount: 3,
        lockoutDuration: 15 * 60 * 1000,
      });

      const remainingMinutes = rateLimitResult.lockoutTimeRemaining
        ? Math.ceil(rateLimitResult.lockoutTimeRemaining / (60 * 1000))
        : 15;

      redirect(`/staff-login?error=rate-limited&minutes=${remainingMinutes}`);
    }

    console.log("Rate limit check passed, verifying PIN...");

    // Validate PIN
    const isValidPin = await verifyPin(pin, staff.pin_hash);

    console.log("PIN verification result:", { isValidPin, pinLength: pin.length });

    if (!isValidPin) {
      console.log("Invalid PIN");
      // Record failed attempt
      recordStaffPinFailure(rateLimitKey);

      // Log security event
      await logStaffPinFailure(staff.business_id, {
        partialPin: pin.substring(0, 2),
        attemptCount: 3 - rateLimitResult.remainingAttempts + 1,
      });

      redirect("/staff-login?error=invalid-pin");
    }

    console.log("PIN verification successful, proceeding with login...");

    // Clear rate limit on successful authentication
    clearStaffPinRateLimit(rateLimitKey);

    // Get business owner information for the staff session
    const businessOwner = await validateBusinessOwner(staff.business_id);
    if (!businessOwner) {
      redirect("/staff-login?error=business-not-found");
    }

    // Create staff session in database
    const staffSession = await createStaffSession(
      staff.id,
      staff.business_id,
      businessOwner.id  // Use business owner ID instead of business_id
    );

    if (!staffSession) {
      redirect("/staff-login?error=session-creation-failed");
    }

    // Set session token in cookies
    // Reuse the existing cookieStore variable from earlier in the function

    // Set secure HTTP-only cookie with session token
    cookieStore.set("staff_session_token", staffSession.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    // Log successful authentication
    await logStaffPinSuccess(staff.business_id, staff.id, {
      sessionId: staffSession.id,
      signedInBy: staff.business_id,
    });

    // Log staff activity
    await logStaffActivity(
      staff.business_id,
      staff.id,
      "staff_login",
      staff.id,
      { loginMethod: "email_username", sessionId: staffSession.id }
    );

    // Revalidate the path to update any cached data
    revalidatePath("/", "layout");

    // Redirect to staff dashboard
    redirect("/staffs");
  } catch (error) {
    console.error("Staff login error:", error);
    
    // If this is a NEXT_REDIRECT error, re-throw it to allow the redirect to happen
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    
    redirect("/staff-login?error=server-error");
  }
}

export async function staffSignout() {
  try {
    // Clear any staff session data
    // In a production app, you would clear the session from your session store
    // For now, we'll just handle the basic cleanup

    // Revalidate the path to clear any cached session data
    revalidatePath("/", "layout");

    // Redirect to staff login page
    redirect("/staff/login?message=signed-out");
  } catch (error) {
    console.error("Staff signout error:", error);
    // Still redirect to login even if there's an error
    redirect("/staff/login?error=signout-error");
  }
}

// OAuth callback handling
export async function handleOAuthCallback(user: User): Promise<string> {
  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (!user) {
      return `${origin}/login?error=${encodeURIComponent(
        "No user data received from OAuth provider"
      )}`;
    }

    // Validate business owner status for OAuth users
    const businessOwner = await validateBusinessOwner(user.id);

    if (businessOwner) {
      // User exists as business owner - redirect to dashboard
      revalidatePath("/", "layout");
      return `${origin}/dashboard`;
    }

    // Check if user exists in personal_users table (unauthorized access)
    const supabase = await createClient();
    const { data: personalUser } = await supabase
      .from("personal_users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (personalUser) {
      // Personal user trying to access business dashboard - deny access
      await supabase.auth.signOut();
      return `${origin}/login?error=${encodeURIComponent(
        "This account is not authorized for business access"
      )}`;
    }

    // User doesn't exist in either table - create business owner profile
    const redirectUrl = await handleOAuthUserCreation(user);
    return redirectUrl;
  } catch (error) {
    console.error("OAuth callback handling error:", error);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return `${origin}/login?error=${encodeURIComponent(
      "OAuth authentication failed. Please try again."
    )}`;
  }
}

// OAuth user creation for new business owners
export async function handleOAuthUserCreation(user: User): Promise<string> {
  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const supabase = await createClient();

    if (!user) {
      return `${origin}/login?error=${encodeURIComponent(
        "No user data received for profile creation"
      )}`;
    }

    // Extract user information from OAuth provider
    const email = user.email;
    const firstName =
      user.user_metadata?.first_name ||
      user.user_metadata?.name?.split(" ")[0] ||
      "";
    const lastName =
      user.user_metadata?.last_name ||
      user.user_metadata?.name?.split(" ").slice(1).join(" ") ||
      "";

    if (!email) {
      return `${origin}/login?error=${encodeURIComponent(
        "Email is required for business account creation"
      )}`;
    }

    // Create business owner profile in database
    const { error: profileError } = await supabase
      .from("business_owner")
      .insert({
        id: user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        business_name: null, // Will be set during profile setup
        business_type: null, // Will be set during profile setup
        account_type: "business",
        email_verified: user.email_confirmed_at ? true : false,
        phone_verified: false,
        bvn_verified: false,
        identity_verified: false,
      });

    if (profileError) {
      console.error("OAuth profile creation error:", profileError);

      // If profile creation fails due to existing record, try to validate again
      if (profileError.code === "23505") {
        // Unique constraint violation
        const businessOwner = await validateBusinessOwner(user.id);
        if (businessOwner) {
          revalidatePath("/", "layout");
          return `${origin}/dashboard`;
        }
      }

      // Clean up the auth user if profile creation fails
      await supabase.auth.signOut();
      return `${origin}/login?error=${encodeURIComponent(
        "Failed to create business profile. Please try again."
      )}`;
    }

    // Profile created successfully - redirect to profile setup or dashboard
    revalidatePath("/", "layout");

    // If user has minimal profile info, redirect to profile setup
    if (!firstName || !lastName) {
      return `${origin}/profile/setup?message=${encodeURIComponent(
        "Please complete your business profile"
      )}`;
    }

    // Otherwise redirect to dashboard
    return `${origin}/dashboard`;
  } catch (error) {
    console.error("OAuth user creation error:", error);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Sign out user on error to prevent inconsistent state
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error(
        "Error signing out user after profile creation failure:",
        signOutError
      );
    }

    return `${origin}/login?error=${encodeURIComponent(
      "OAuth profile creation failed. Please try again."
    )}`;
  }
}

// Staff management actions
export async function createStaff(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const username = formData.get("username") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const role = formData.get("role") as StaffRole;
  const customPermissions = formData.get("customPermissions") as string;

  if (!firstName || !lastName || !email || !role) {
    redirect("/staff?error=missing-required-fields");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Import role utilities for proper permission assignment
    const { prepareStaffCreation } = await import("@/lib/staff-role-utils");
    const { isValidRole } = await import("@/lib/permissions");
    const { getPermissionsForRole, validatePermissions } = await import(
      "@/lib/permissions"
    );

    // Validate role constraints
    if (!isValidRole(role)) {
      redirect("/staff?error=invalid-role");
    }

    // Generate secure PIN for staff member
    const pin = generateSecurePin(4);
    const hashedPin = await hashPin(pin);

    // Parse custom permissions if provided
    let parsedCustomPermissions: string[] = [];
    if (customPermissions) {
      try {
        parsedCustomPermissions = JSON.parse(customPermissions);

        // Validate custom permissions
        const validation = validatePermissions(parsedCustomPermissions);
        if (!validation.isValid) {
          redirect(
            `/staff?error=invalid-permissions&details=${encodeURIComponent(
              validation.invalidPermissions.join(", ")
            )}`
          );
        }
      } catch (error) {
        console.error("Error parsing custom permissions:", error);
        redirect("/staff?error=invalid-permissions-format");
      }
    }

    // Prepare staff creation with role-based permission assignment
    const staffPreparation = prepareStaffCreation({
      firstName,
      lastName,
      email: email || undefined,
      username: username || undefined,
      phoneNumber: phoneNumber || undefined,
      role,
      customPermissions: parsedCustomPermissions,
      pin,
    });

    if (!staffPreparation.success) {
      const errorMessage = staffPreparation.errors.join(", ");
      redirect(
        `/staff?error=validation-failed&details=${encodeURIComponent(
          errorMessage
        )}`
      );
    }

    // Get role-based permissions (this ensures consistency)
    const rolePermissions = getPermissionsForRole(role);
    const combinedPermissions = [
      ...rolePermissions,
      ...parsedCustomPermissions,
    ];
    const finalPermissions = Array.from(new Set(combinedPermissions));

    // Create staff member in database
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .insert({
        business_id: businessOwner.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email?.trim() || null,
        username: username?.trim() || null,
        phone_number: phoneNumber?.trim() || null,
        pin_hash: hashedPin,
        role: role,
        permissions: finalPermissions,
        is_active: true,
      })
      .select()
      .single();

    if (staffError) {
      console.error("Staff creation error:", staffError);

      if (staffError.code === "23505") {
        // Unique constraint violation - check which field
        if (staffError.message.includes("email")) {
          redirect("/staff?error=email-already-exists");
        } else if (staffError.message.includes("phone")) {
          redirect("/staff?error=phone-already-exists");
        } else {
          redirect("/staff?error=staff-already-exists");
        }
      }

      if (staffError.code === "23514") {
        // Check constraint violation - likely role constraint
        redirect("/staff?error=invalid-role-constraint");
      }

      redirect("/staff?error=staff-creation-failed");
    }

    // Log staff creation activity
    await logStaffActivity(
      businessOwner.id,
      staff.id,
      "staff_created",
      businessOwner.id,
      {
        staff_role: role,
        permissions_count: finalPermissions.length,
        has_custom_permissions: parsedCustomPermissions.length > 0,
        created_by: "business_owner",
      }
    );

    // Revalidate the staff list page
    revalidatePath("/staff");

    // Return success with the generated PIN (in a real app, you'd send this via SMS/email)
    redirect(
      `/staff?success=staff-created&pin=${pin}&staffId=${staff.id}&role=${role}`
    );
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Create staff error:", error);
    redirect("/staff?error=server-error");
  }
}

export async function updateStaff(formData: FormData) {
  const staffId = formData.get("staffId") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const role = formData.get("role") as StaffRole;
  const customPermissions = formData.get("customPermissions") as string;
  const isActive = formData.get("isActive") === "true";

  if (!staffId || !firstName || !lastName || !role) {
    redirect("/staff?error=missing-required-fields");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Verify staff belongs to this business and get current data
    const { data: existingStaff, error: staffCheckError } = await supabase
      .from("staff")
      .select("business_id, role, permissions, is_active")
      .eq("id", staffId)
      .single();

    if (
      staffCheckError ||
      !existingStaff ||
      existingStaff.business_id !== businessOwner.id
    ) {
      redirect("/staff?error=staff-not-found");
    }

    // Import role utilities for proper permission assignment
    const { assignRolePermissions } = await import("@/lib/staff-role-utils");
    const { isValidRole } = await import("@/lib/permissions");
    const { validatePermissions } = await import("@/lib/permissions");

    // Validate role constraints
    if (!isValidRole(role)) {
      redirect("/staff?error=invalid-role");
    }

    // Parse custom permissions if provided
    let parsedCustomPermissions: string[] = [];
    if (customPermissions) {
      try {
        parsedCustomPermissions = JSON.parse(customPermissions);

        // Validate custom permissions
        const validation = validatePermissions(parsedCustomPermissions);
        if (!validation.isValid) {
          redirect(
            `/staff?error=invalid-permissions&details=${encodeURIComponent(
              validation.invalidPermissions.join(", ")
            )}`
          );
        }
      } catch (error) {
        console.error("Error parsing custom permissions:", error);
        redirect("/staff?error=invalid-permissions-format");
      }
    }

    // Assign role-based permissions with custom permissions
    const roleAssignment = assignRolePermissions(role, parsedCustomPermissions);
    if (!roleAssignment.success) {
      const errorMessage = roleAssignment.errors.join(", ");
      redirect(
        `/staff?error=permission-assignment-failed&details=${encodeURIComponent(
          errorMessage
        )}`
      );
    }

    // Check if role changed to determine if we need to terminate active sessions
    const roleChanged = existingStaff.role !== role;
    const permissionsChanged =
      JSON.stringify(existingStaff.permissions.sort()) !==
      JSON.stringify(roleAssignment.permissions.sort());
    const statusChanged = existingStaff.is_active !== isActive;

    // Update staff member
    const { error: updateError } = await supabase
      .from("staff")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email?.trim() || null,
        phone_number: phoneNumber?.trim() || null,
        role: role,
        permissions: roleAssignment.permissions,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("Staff update error:", updateError);

      if (updateError.code === "23505") {
        // Unique constraint violation
        if (updateError.message.includes("email")) {
          redirect("/staff?error=email-already-exists");
        } else if (updateError.message.includes("phone")) {
          redirect("/staff?error=phone-already-exists");
        }
      }

      if (updateError.code === "23514") {
        // Check constraint violation - likely role constraint
        redirect("/staff?error=invalid-role-constraint");
      }

      redirect("/staff?error=staff-update-failed");
    }

    // If role changed or staff was deactivated, terminate any active sessions
    if (roleChanged || !isActive) {
      const activeSessions = await getActiveStaffSessions(businessOwner.id);
      const staffSessions = activeSessions.filter(
        (session) => session.staff_id === staffId
      );

      for (const session of staffSessions) {
        await terminateStaffSession(session.id);

        // Log session termination
        await logStaffActivity(
          businessOwner.id,
          staffId,
          "session_terminated_due_to_update",
          businessOwner.id,
          {
            reason: roleChanged ? "role_changed" : "staff_deactivated",
            old_role: existingStaff.role,
            new_role: role,
            session_id: session.id,
          }
        );
      }
    }

    // Log staff update activity
    await logStaffActivity(
      businessOwner.id,
      staffId,
      "staff_updated",
      businessOwner.id,
      {
        role_changed: roleChanged,
        old_role: existingStaff.role,
        new_role: role,
        permissions_changed: permissionsChanged,
        status_changed: statusChanged,
        new_permissions_count: roleAssignment.permissions.length,
        updated_by: "business_owner",
      }
    );

    // Revalidate the staff list page
    revalidatePath("/staff");

    // Provide specific success message based on what changed
    let successMessage = "staff-updated";
    if (roleChanged) {
      successMessage += "&role-changed=true";
    }
    if (!isActive && statusChanged) {
      successMessage += "&deactivated=true";
    }

    redirect(`/staff?success=${successMessage}`);
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Update staff error:", error);
    redirect("/staff?error=server-error");
  }
}

export async function resetStaffPin(formData: FormData) {
  const staffId = formData.get("staffId") as string;

  if (!staffId) {
    redirect("/staff?error=missing-staff-id");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Verify staff belongs to this business
    const { data: existingStaff, error: staffCheckError } = await supabase
      .from("staff")
      .select("business_id, first_name, last_name, email, phone_number")
      .eq("id", staffId)
      .single();

    if (
      staffCheckError ||
      !existingStaff ||
      existingStaff.business_id !== businessOwner.id
    ) {
      redirect("/staff?error=staff-not-found");
    }

    // Generate new PIN and hash it
    const newPin = generateSecurePin(4);
    const hashedPin = await hashPin(newPin);

    // Update staff member's PIN
    const { error: updateError } = await supabase
      .from("staff")
      .update({
        pin_hash: hashedPin,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("PIN reset error:", updateError);
      redirect("/staff?error=pin-reset-failed");
    }

    // Revalidate the staff list page
    revalidatePath("/staff");

    // In a real app, you'd send the new PIN via SMS/email
    redirect(`/staff?success=pin-reset&pin=${newPin}&staffId=${staffId}`);
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Reset PIN error:", error);
    redirect("/staff?error=server-error");
  }
}

// Admin functions to retrieve/change staff PINs
export async function getStaffPin(formData: FormData) {
  const staffId = formData.get("staffId") as string;

  if (!staffId) {
    redirect("/staff?error=missing-staff-id");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Get staff information
    const staffInfo = await getStaffForPINManagement(staffId, businessOwner.id);
    if (!staffInfo) {
      redirect("/staff?error=staff-not-found");
    }

    // Generate new PIN for the staff member
    const newPin = await generateNewStaffPIN(staffId, businessOwner.id);
    if (!newPin) {
      redirect("/staff?error=pin-generation-failed");
    }

    // Log the PIN retrieval activity
    await logStaffActivity(
      businessOwner.id,
      staffId,
      "pin_retrieved",
      businessOwner.id,
      {
        staff_role: staffInfo.role,
        action_type: "admin_pin_retrieval",
      }
    );

    // Revalidate the staff list page
    revalidatePath("/staff");

    // Return success with the new PIN
    redirect(
      `/staff?success=pin-retrieved&pin=${newPin}&staffId=${staffId}&name=${encodeURIComponent(
        staffInfo.firstName + " " + staffInfo.lastName
      )}`
    );
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Get staff PIN error:", error);
    redirect("/staff?error=server-error");
  }
}

export async function changeStaffPin(formData: FormData) {
  const staffId = formData.get("staffId") as string;
  const newPin = formData.get("newPin") as string;

  if (!staffId || !newPin) {
    redirect("/staff?error=missing-required-fields");
  }

  // Validate PIN format
  if (!/^\d{4,8}$/.test(newPin)) {
    redirect("/staff?error=invalid-pin-format");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Get staff information
    const staffInfo = await getStaffForPINManagement(staffId, businessOwner.id);
    if (!staffInfo) {
      redirect("/staff?error=staff-not-found");
    }

    // Change the staff PIN
    const success = await changeStaffPIN(staffId, businessOwner.id, newPin);
    if (!success) {
      redirect("/staff?error=pin-change-failed");
    }

    // Log the PIN change activity
    await logStaffActivity(
      businessOwner.id,
      staffId,
      "pin_changed",
      businessOwner.id,
      {
        staff_role: staffInfo.role,
        action_type: "admin_pin_change",
        custom_pin_set: true,
      }
    );

    // Revalidate the staff list page
    revalidatePath("/staff");

    // Return success
    redirect(
      `/staff?success=pin-changed&staffId=${staffId}&name=${encodeURIComponent(
        staffInfo.firstName + " " + staffInfo.lastName
      )}`
    );
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Change staff PIN error:", error);
    redirect("/staff?error=server-error");
  }
}

// Admin PIN management actions
export async function setAdminPin(formData: FormData) {
  const adminPin = formData.get("adminPin") as string;
  const confirmPin = formData.get("confirmPin") as string;

  if (!adminPin || !confirmPin) {
    redirect("/dashboard/settings?error=missing-admin-pin");
  }

  if (adminPin !== confirmPin) {
    redirect("/dashboard/settings?error=admin-pin-mismatch");
  }

  if (adminPin.length < 4 || adminPin.length > 8) {
    redirect("/dashboard/settings?error=invalid-admin-pin-length");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Hash the admin PIN
    const hashedAdminPin = await hashAdminPin(adminPin);

    // Update business owner with admin PIN
    const { error: updateError } = await supabase
      .from("business_owner")
      .update({
        admin_pin_hash: hashedAdminPin,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Admin PIN setup error:", updateError);
      redirect("/dashboard/settings?error=admin-pin-setup-failed");
    }

    // Log successful admin PIN setup
    await logAdminPinSuccess(businessOwner.id, user.id, {
      requiredFor: "admin_pin_setup",
      sessionDuration: 0, // No session for setup
    });

    // Revalidate the settings page
    revalidatePath("/dashboard/settings");

    redirect("/dashboard/settings?success=admin-pin-set");
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Set admin PIN error:", error);
    redirect("/dashboard/settings?error=server-error");
  }
}

export async function verifyAdminPinAction(formData: FormData) {
  const adminPin = formData.get("adminPin") as string;
  const requiredFor = formData.get("requiredFor") as string;
  const returnUrl = formData.get("returnUrl") as string;

  if (!adminPin || !requiredFor) {
    redirect("/dashboard?error=missing-admin-pin-data");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner || !businessOwner.admin_pin_hash) {
      redirect("/dashboard/settings?error=admin-pin-not-set");
    }

    // Check rate limiting
    const rateLimitResult = checkAdminPinRateLimit(user.id);

    if (!rateLimitResult.allowed) {
      // Log lockout event
      await logAdminPinLockout(businessOwner.id, user.id, {
        attemptCount: 5, // Max attempts reached
        lockoutDuration: 30 * 60 * 1000, // 30 minutes
      });

      const remainingMinutes = rateLimitResult.lockoutTimeRemaining
        ? Math.ceil(rateLimitResult.lockoutTimeRemaining / (60 * 1000))
        : 30;

      redirect(`/dashboard?error=admin-pin-locked&minutes=${remainingMinutes}`);
    }

    // Verify admin PIN using the utility function
    const { verifyAdminPin: verifyAdminPinUtil } = await import("./auth-utils");
    const isValidPin = await verifyAdminPinUtil(
      adminPin,
      businessOwner.admin_pin_hash
    );

    if (!isValidPin) {
      // Record failed attempt
      recordAdminPinFailure(user.id);

      // Log security event
      await logAdminPinFailure(businessOwner.id, user.id, {
        attemptCount: 5 - rateLimitResult.remainingAttempts + 1,
        requiredFor,
      });

      redirect("/dashboard?error=invalid-admin-pin");
    }

    // Clear rate limit on successful verification
    clearAdminPinRateLimit(user.id);

    // Create elevated admin session (30 minutes)
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const { error: sessionError } = await supabase
      .from("admin_sessions")
      .insert({
        business_owner_id: user.id,
        session_token: sessionToken,
        required_for: requiredFor,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error("Admin session creation error:", sessionError);
      redirect("/dashboard?error=admin-session-failed");
    }

    // Set admin session cookie
    const cookieStore = await cookies();

    cookieStore.set("admin_session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    // Log successful admin PIN verification
    await logAdminPinSuccess(businessOwner.id, user.id, {
      requiredFor,
      sessionDuration: 30 * 60 * 1000, // 30 minutes
    });

    // Redirect to the requested URL or dashboard
    const redirectUrl =
      returnUrl && returnUrl.startsWith("/") ? returnUrl : "/dashboard";
    redirect(`${redirectUrl}?admin-verified=true`);
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Verify admin PIN error:", error);
    redirect("/dashboard?error=server-error");
  }
}

export async function updateAdminPin(formData: FormData) {
  const currentPin = formData.get("currentPin") as string;
  const newPin = formData.get("newPin") as string;
  const confirmPin = formData.get("confirmPin") as string;

  if (!currentPin || !newPin || !confirmPin) {
    redirect("/dashboard/settings?error=missing-admin-pin-fields");
  }

  if (newPin !== confirmPin) {
    redirect("/dashboard/settings?error=admin-pin-mismatch");
  }

  if (newPin.length < 4 || newPin.length > 8) {
    redirect("/dashboard/settings?error=invalid-admin-pin-length");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner || !businessOwner.admin_pin_hash) {
      redirect("/dashboard/settings?error=admin-pin-not-set");
    }

    // Verify current admin PIN using the utility function
    const { verifyAdminPin: verifyAdminPinUtil } = await import("./auth-utils");
    const isValidCurrentPin = await verifyAdminPinUtil(
      currentPin,
      businessOwner.admin_pin_hash
    );
    if (!isValidCurrentPin) {
      // Log failed attempt
      await logAdminPinFailure(businessOwner.id, user.id, {
        requiredFor: "admin_pin_update",
      });

      redirect("/dashboard/settings?error=invalid-current-admin-pin");
    }

    // Hash the new admin PIN
    const hashedNewPin = await hashAdminPin(newPin);

    // Update business owner with new admin PIN
    const { error: updateError } = await supabase
      .from("business_owner")
      .update({
        admin_pin_hash: hashedNewPin,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Admin PIN update error:", updateError);
      redirect("/dashboard/settings?error=admin-pin-update-failed");
    }

    // Invalidate all existing admin sessions
    await supabase
      .from("admin_sessions")
      .update({ is_active: false })
      .eq("business_owner_id", user.id)
      .eq("is_active", true);

    // Log successful admin PIN update
    await logAdminPinSuccess(businessOwner.id, user.id, {
      requiredFor: "admin_pin_update",
      sessionDuration: 0, // No session for update
    });

    // Revalidate the settings page
    revalidatePath("/dashboard/settings");

    redirect("/dashboard/settings?success=admin-pin-updated");
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Update admin PIN error:", error);
    redirect("/dashboard/settings?error=server-error");
  }
}

export async function deactivateStaff(formData: FormData) {
  const staffId = formData.get("staffId") as string;

  if (!staffId) {
    redirect("/staff?error=missing-staff-id");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Verify staff belongs to this business
    const { data: existingStaff, error: staffCheckError } = await supabase
      .from("staff")
      .select("business_id")
      .eq("id", staffId)
      .single();

    if (
      staffCheckError ||
      !existingStaff ||
      existingStaff.business_id !== businessOwner.id
    ) {
      redirect("/staff?error=staff-not-found");
    }

    // Deactivate staff member
    const { error: updateError } = await supabase
      .from("staff")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("Staff deactivation error:", updateError);
      redirect("/staff?error=staff-deactivation-failed");
    }

    // Revalidate the staff list page
    revalidatePath("/staff");

    redirect("/staff?success=staff-deactivated");
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Deactivate staff error:", error);
    redirect("/staff?error=server-error");
  }
}

export async function activateStaff(formData: FormData) {
  const staffId = formData.get("staffId") as string;

  if (!staffId) {
    redirect("/staff?error=missing-staff-id");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Verify staff belongs to this business
    const { data: existingStaff, error: staffCheckError } = await supabase
      .from("staff")
      .select("business_id")
      .eq("id", staffId)
      .single();

    if (
      staffCheckError ||
      !existingStaff ||
      existingStaff.business_id !== businessOwner.id
    ) {
      redirect("/staff?error=staff-not-found");
    }

    // Activate staff member
    const { error: updateError } = await supabase
      .from("staff")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("Staff activation error:", updateError);
      redirect("/staff?error=staff-activation-failed");
    }

    // Revalidate the staff list page
    revalidatePath("/staff");

    redirect("/staff?success=staff-activated");
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Activate staff error:", error);
    redirect("/staff?error=server-error");
  }
}

export async function deleteStaff(formData: FormData) {
  const staffId = formData.get("staffId") as string;

  if (!staffId) {
    redirect("/staff?error=missing-staff-id");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Verify staff belongs to this business and get staff details for logging
    const { data: existingStaff, error: staffCheckError } = await supabase
      .from("staff")
      .select("business_id, first_name, last_name, role, email")
      .eq("id", staffId)
      .single();

    if (
      staffCheckError ||
      !existingStaff ||
      existingStaff.business_id !== businessOwner.id
    ) {
      redirect("/staff?error=staff-not-found");
    }

    // First, terminate ALL sessions for this staff member (both active and inactive)
    const { data: allStaffSessions, error: sessionsError } = await supabase
      .from("staff_sessions")
      .select("id, is_active")
      .eq("staff_id", staffId)
      .eq("business_id", businessOwner.id);

    if (sessionsError) {
      console.error("Error fetching staff sessions:", sessionsError);
      redirect("/staff?error=session-fetch-failed");
    }

    // Terminate all sessions for this staff member
    let terminatedSessions = 0;
    if (allStaffSessions && allStaffSessions.length > 0) {
      for (const session of allStaffSessions) {
        try {
          // Update session to inactive
          const { error: updateError } = await supabase
            .from("staff_sessions")
            .update({ 
              is_active: false, 
              signed_out_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", session.id);

          if (!updateError) {
            terminatedSessions++;
          }

          // Log session termination due to deletion
          await logStaffActivity(
            businessOwner.id,
            staffId,
            "session_terminated_due_to_deletion",
            businessOwner.id,
            {
              session_id: session.id,
              staff_name: `${existingStaff.first_name} ${existingStaff.last_name}`,
              staff_role: existingStaff.role,
              was_active: session.is_active,
            }
          );
        } catch (sessionTerminationError) {
          console.error("Error terminating session:", sessionTerminationError);
          // Continue with other sessions even if one fails
        }
      }
    }

    // Log staff deletion before actual deletion
    await logStaffActivity(
      businessOwner.id,
      staffId,
      "staff_deleted",
      businessOwner.id,
      {
        staff_name: `${existingStaff.first_name} ${existingStaff.last_name}`,
        staff_role: existingStaff.role,
        staff_email: existingStaff.email,
        sessions_terminated: terminatedSessions,
        deleted_by: "business_owner",
      }
    );

    // Delete staff member
    const { error: deleteError } = await supabase
      .from("staff")
      .delete()
      .eq("id", staffId);

    if (deleteError) {
      console.error("Staff deletion error:", deleteError);
      
      // If deletion fails due to foreign key constraints, provide a more specific error
      if (deleteError.code === "23503") {
        redirect("/staff?error=staff-has-active-sessions&message=" + 
          encodeURIComponent("Cannot delete staff member with active sessions. Please sign out all sessions first."));
      }
      
      redirect("/staff?error=staff-deletion-failed");
    }

    // Revalidate the staff list page
    revalidatePath("/staff");

    redirect("/staff?success=staff-deleted");
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Delete staff error:", error);
    redirect("/staff?error=server-error");
  }
}

/**
 * Validate role-specific requirements and constraints
 * @param role - The staff role to validate
 * @param businessId - The business ID for context
 * @returns Validation result
 */
async function validateRoleRequirements(
  role: StaffRole,
  businessId: string
): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const supabase = await createClient();

    // Get business information for role compatibility checks
    const { data: business, error: businessError } = await supabase
      .from("business_owner")
      .select("business_type")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      warnings.push("Could not verify business type for role compatibility");
    } else {
      // Check role compatibility with business type
      const { canAssignRole } = await import("@/lib/staff-role-utils");
      if (!canAssignRole(role, business.business_type)) {
        errors.push(
          `Role '${role}' may not be suitable for business type '${business.business_type}'`
        );
      }
    }

    // Check for role-specific constraints (e.g., maximum number of staff per role)
    const { data: existingStaff, error: staffCountError } = await supabase
      .from("staff")
      .select("role")
      .eq("business_id", businessId)
      .eq("role", role)
      .eq("is_active", true);

    if (!staffCountError && existingStaff) {
      // Define role limits (these could be configurable per business plan)
      const roleLimits: Record<StaffRole, number> = {
        reception: 10,
        kitchen: 15,
        bar: 8,
        accountant: 3,
      };

      const currentCount = existingStaff.length;
      const limit = roleLimits[role];

      if (currentCount >= limit) {
        warnings.push(
          `You already have ${currentCount} ${role} staff members. Consider if you need another.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error("Error validating role requirements:", error);
    return {
      isValid: true, // Don't block creation due to validation errors
      errors: [],
      warnings: ["Could not validate role requirements"],
    };
  }
}

/**
 * Handle role changes for existing staff members
 * This includes permission updates and session management
 */
export async function changeStaffRole(formData: FormData) {
  const staffId = formData.get("staffId") as string;
  const newRole = formData.get("newRole") as StaffRole;
  const reason = formData.get("reason") as string;

  if (!staffId || !newRole) {
    redirect("/staff?error=missing-required-fields");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Get current staff data
    const { data: existingStaff, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("id", staffId)
      .eq("business_id", businessOwner.id)
      .single();

    if (staffError || !existingStaff) {
      redirect("/staff?error=staff-not-found");
    }

    // Validate new role
    const { isValidRole } = await import("@/lib/permissions");
    if (!isValidRole(newRole)) {
      redirect("/staff?error=invalid-role");
    }

    // Check if role is actually changing
    if (existingStaff.role === newRole) {
      redirect("/staff?error=role-unchanged");
    }

    // Validate role requirements
    const roleValidation = await validateRoleRequirements(
      newRole,
      businessOwner.id
    );
    if (!roleValidation.isValid) {
      const errorMessage = roleValidation.errors.join(", ");
      redirect(
        `/staff?error=role-validation-failed&details=${encodeURIComponent(
          errorMessage
        )}`
      );
    }

    // Get new permissions for the role
    const { getPermissionsForRole } = await import("@/lib/permissions");
    const newPermissions = getPermissionsForRole(newRole);

    // Update staff role and permissions
    const { error: updateError } = await supabase
      .from("staff")
      .update({
        role: newRole,
        permissions: newPermissions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("Role change error:", updateError);
      redirect("/staff?error=role-change-failed");
    }

    // Terminate active sessions due to role change
    const activeSessions = await getActiveStaffSessions(businessOwner.id);
    const staffSessions = activeSessions.filter(
      (session) => session.staff_id === staffId
    );

    for (const session of staffSessions) {
      await terminateStaffSession(session.id);
    }

    // Log role change activity
    await logStaffActivity(
      businessOwner.id,
      staffId,
      "role_changed",
      businessOwner.id,
      {
        old_role: existingStaff.role,
        new_role: newRole,
        reason: reason || "Role change requested by business owner",
        old_permissions: existingStaff.permissions,
        new_permissions: newPermissions,
        sessions_terminated: staffSessions.length,
        changed_by: "business_owner",
      }
    );

    // Revalidate the staff list page
    revalidatePath("/staff");

    redirect(
      `/staff?success=role-changed&oldRole=${existingStaff.role}&newRole=${newRole}`
    );
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Change staff role error:", error);
    redirect("/staff?error=server-error");
  }
}
// Rate limiting for staff sign-in attempts
const staffSignInAttempts = new Map<
  string,
  { count: number; lastAttempt: number }
>();
const MAX_SIGNIN_ATTEMPTS = 3;
const SIGNIN_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Staff session management actions for business owners
export async function signInStaff(formData: FormData) {
  const staffId = formData.get("staffId") as string;
  const pin = formData.get("pin") as string;

  if (!staffId || !pin) {
    redirect("/staff?error=missing-credentials");
  }

  // Rate limiting check
  const clientKey = `${staffId}-signin`;
  const now = Date.now();
  const attempts = staffSignInAttempts.get(clientKey);

  if (attempts && attempts.count >= MAX_SIGNIN_ATTEMPTS) {
    const timeSinceLastAttempt = now - attempts.lastAttempt;
    if (timeSinceLastAttempt < SIGNIN_LOCKOUT_DURATION) {
      const remainingTime = Math.ceil(
        (SIGNIN_LOCKOUT_DURATION - timeSinceLastAttempt) / 60000
      );
      redirect(`/staff?error=rate-limited&minutes=${remainingTime}`);
    } else {
      // Reset attempts after lockout period
      staffSignInAttempts.delete(clientKey);
    }
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Check if admin PIN is set - required for staff sign-in
    if (!businessOwner.admin_pin_hash) {
      redirect(
        "/staff?error=admin-pin-required&message=" +
          encodeURIComponent(
            "Admin PIN must be set before signing in staff members. Please go to Settings to set up your admin PIN."
          )
      );
    }

    // Get staff member and verify PIN
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("id", staffId)
      .eq("business_id", businessOwner.id)
      .eq("is_active", true)
      .single();

    if (staffError || !staff) {
      redirect("/staff?error=staff-not-found");
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, staff.pin_hash);
    if (!isValidPin) {
      // Increment failed attempts
      const currentAttempts = staffSignInAttempts.get(clientKey) || {
        count: 0,
        lastAttempt: 0,
      };
      staffSignInAttempts.set(clientKey, {
        count: currentAttempts.count + 1,
        lastAttempt: now,
      });

      redirect("/staff?error=invalid-pin");
    }

    // Clear any previous failed attempts on successful PIN verification
    staffSignInAttempts.delete(clientKey);

    // Create staff session
    const session = await createStaffSession(
      staff.id,
      businessOwner.id,
      businessOwner.id
    );

    if (!session) {
      redirect("/staff?error=session-creation-failed");
    }

    // Log the sign-in activity
    await logStaffActivity(
      businessOwner.id,
      staff.id,
      "staff_signed_in",
      businessOwner.id,
      {
        session_id: session.id,
        staff_role: staff.role,
        signed_in_by: "business_owner",
      }
    );

    // Set staff session token in cookies for immediate access
    const cookieStore = await cookies();

    cookieStore.set("staff_session_token", session.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    // Revalidate staff dashboard
    revalidatePath("/staffs");

    redirect("/staffs?success=staff-signed-in");
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Sign in staff error:", error);

    // Increment failed attempts on error
    const currentAttempts = staffSignInAttempts.get(clientKey) || {
      count: 0,
      lastAttempt: 0,
    };
    staffSignInAttempts.set(clientKey, {
      count: currentAttempts.count + 1,
      lastAttempt: now,
    });

    redirect("/staff?error=server-error");
  }
}

export async function signOutStaff(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;

  if (!sessionId) {
    redirect("/staff?error=missing-session-id");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Verify session belongs to this business
    const { data: session, error: sessionError } = await supabase
      .from("staff_sessions")
      .select("business_id")
      .eq("id", sessionId)
      .eq("is_active", true)
      .single();

    if (sessionError || !session || session.business_id !== businessOwner.id) {
      redirect("/staff?error=session-not-found");
    }

    // Get staff information for audit logging
    const { data: staffInfo, error: staffInfoError } = await supabase
      .from("staff_sessions")
      .select("staff_id")
      .eq("id", sessionId)
      .single();

    // Terminate the session
    const success = await terminateStaffSession(sessionId);
    if (!success) {
      redirect("/staff?error=signout-failed");
    }

    // Log the sign-out activity
    if (staffInfo && !staffInfoError) {
      await logStaffActivity(
        businessOwner.id,
        staffInfo.staff_id,
        "staff_signed_out",
        businessOwner.id,
        { session_id: sessionId, signed_out_by: "business_owner" }
      );
    }

    // Revalidate staff page to show updated staff status
    revalidatePath("/staff");

    redirect("/staff?success=staff-signed-out");
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Sign out staff error:", error);
    redirect("/staff?error=server-error");
  }
}

export async function bulkSignOutStaff(formData: FormData) {
  const sessionIds = formData.get("sessionIds") as string;

  if (!sessionIds) {
    redirect("/staff?error=missing-session-ids");
  }

  try {
    const supabase = await createClient();

    // Get current user and validate business owner
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login?error=authentication-required");
    }

    const businessOwner = await validateBusinessOwner(user.id);
    if (!businessOwner) {
      redirect("/login?error=unauthorized-access");
    }

    // Parse session IDs
    let parsedSessionIds: string[] = [];
    try {
      parsedSessionIds = JSON.parse(sessionIds);
    } catch (error) {
      redirect("/staff?error=invalid-session-ids");
    }

    // Verify all sessions belong to this business and terminate them
    let successCount = 0;
    const signedOutStaff: string[] = [];

    for (const sessionId of parsedSessionIds) {
      const { data: session, error: sessionError } = await supabase
        .from("staff_sessions")
        .select("business_id, staff_id")
        .eq("id", sessionId)
        .eq("is_active", true)
        .single();

      if (
        !sessionError &&
        session &&
        session.business_id === businessOwner.id
      ) {
        const success = await terminateStaffSession(sessionId);
        if (success) {
          successCount++;
          signedOutStaff.push(session.staff_id);

          // Log individual sign-out activity
          await logStaffActivity(
            businessOwner.id,
            session.staff_id,
            "staff_bulk_signed_out",
            businessOwner.id,
            { session_id: sessionId, signed_out_by: "business_owner" }
          );
        }
      }
    }

    // Log bulk sign-out activity
    if (signedOutStaff.length > 0) {
      await logStaffActivity(
        businessOwner.id,
        "bulk_operation",
        "bulk_staff_signout",
        businessOwner.id,
        {
          staff_count: signedOutStaff.length,
          staff_ids: signedOutStaff,
          session_ids: parsedSessionIds,
        }
      );
    }

    // Revalidate staff page to show updated staff status
    revalidatePath("/staff");

    redirect(`/staff?success=bulk-signout&count=${successCount}`);
  } catch (error) {
    // Re-throw redirect errors (these are expected)
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Bulk sign out staff error:", error);
    redirect("/staff?error=server-error");
  }
}

export async function setStaffLoginCookie(businessId: string) {
  try {
    const cookieStore = await cookies();
    
    // Set secure HTTP-only cookie with business ID
    cookieStore.set("staff_business_id", businessId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting staff login cookie:", error);
    return { success: false, error: "Failed to set secure cookie" };
  }
}
