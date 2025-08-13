import { createClient } from "@/lib/supabase/server";

// Rate limiting configuration
export const RATE_LIMITS = {
  STAFF_PIN: {
    MAX_ATTEMPTS: 3,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  },
  ADMIN_PIN: {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes in milliseconds
  },
} as const;

// In-memory rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<
  string,
  {
    attempts: number;
    lastAttempt: number;
    lockedUntil?: number;
  }
>();

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutTimeRemaining?: number;
  resetTime?: number;
}

/**
 * Check and update rate limit for staff PIN attempts
 * @param identifier - Unique identifier for rate limiting (e.g., businessId + partial PIN)
 * @returns Rate limit result
 */
export function checkStaffPinRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const config = RATE_LIMITS.STAFF_PIN;
  const key = `staff_pin:${identifier}`;

  const current = rateLimitStore.get(key) || {
    attempts: 0,
    lastAttempt: 0,
  };

  // Check if currently locked out
  if (current.lockedUntil && now < current.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutTimeRemaining: current.lockedUntil - now,
    };
  }

  // Reset if lockout period has passed
  if (current.lockedUntil && now >= current.lockedUntil) {
    rateLimitStore.delete(key);
    return {
      allowed: true,
      remainingAttempts: config.MAX_ATTEMPTS - 1,
    };
  }

  // Check if we've exceeded max attempts
  if (current.attempts >= config.MAX_ATTEMPTS) {
    const lockedUntil = current.lastAttempt + config.LOCKOUT_DURATION;

    if (now < lockedUntil) {
      // Update lockout time
      rateLimitStore.set(key, {
        ...current,
        lockedUntil,
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTimeRemaining: lockedUntil - now,
      };
    } else {
      // Lockout period has passed, reset
      rateLimitStore.delete(key);
      return {
        allowed: true,
        remainingAttempts: config.MAX_ATTEMPTS - 1,
      };
    }
  }

  return {
    allowed: true,
    remainingAttempts: config.MAX_ATTEMPTS - current.attempts - 1,
    resetTime: current.lastAttempt + config.LOCKOUT_DURATION,
  };
}

/**
 * Record a failed staff PIN attempt
 * @param identifier - Unique identifier for rate limiting
 */
export function recordStaffPinFailure(identifier: string): void {
  const now = Date.now();
  const key = `staff_pin:${identifier}`;

  const current = rateLimitStore.get(key) || {
    attempts: 0,
    lastAttempt: 0,
  };

  const newAttempts = current.attempts + 1;
  const config = RATE_LIMITS.STAFF_PIN;

  rateLimitStore.set(key, {
    attempts: newAttempts,
    lastAttempt: now,
    lockedUntil:
      newAttempts >= config.MAX_ATTEMPTS
        ? now + config.LOCKOUT_DURATION
        : undefined,
  });
}

/**
 * Clear rate limit for successful staff PIN authentication
 * @param identifier - Unique identifier for rate limiting
 */
export function clearStaffPinRateLimit(identifier: string): void {
  const key = `staff_pin:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Check and update rate limit for admin PIN attempts
 * @param businessOwnerId - Business owner ID for rate limiting
 * @returns Rate limit result
 */
export function checkAdminPinRateLimit(
  businessOwnerId: string
): RateLimitResult {
  const now = Date.now();
  const config = RATE_LIMITS.ADMIN_PIN;
  const key = `admin_pin:${businessOwnerId}`;

  const current = rateLimitStore.get(key) || {
    attempts: 0,
    lastAttempt: 0,
  };

  // Check if currently locked out
  if (current.lockedUntil && now < current.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutTimeRemaining: current.lockedUntil - now,
    };
  }

  // Reset if lockout period has passed
  if (current.lockedUntil && now >= current.lockedUntil) {
    rateLimitStore.delete(key);
    return {
      allowed: true,
      remainingAttempts: config.MAX_ATTEMPTS - 1,
    };
  }

  // Check if we've exceeded max attempts
  if (current.attempts >= config.MAX_ATTEMPTS) {
    const lockedUntil = current.lastAttempt + config.LOCKOUT_DURATION;

    if (now < lockedUntil) {
      // Update lockout time
      rateLimitStore.set(key, {
        ...current,
        lockedUntil,
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTimeRemaining: lockedUntil - now,
      };
    } else {
      // Lockout period has passed, reset
      rateLimitStore.delete(key);
      return {
        allowed: true,
        remainingAttempts: config.MAX_ATTEMPTS - 1,
      };
    }
  }

  return {
    allowed: true,
    remainingAttempts: config.MAX_ATTEMPTS - current.attempts - 1,
    resetTime: current.lastAttempt + config.LOCKOUT_DURATION,
  };
}

/**
 * Record a failed admin PIN attempt
 * @param businessOwnerId - Business owner ID
 */
export function recordAdminPinFailure(businessOwnerId: string): void {
  const now = Date.now();
  const key = `admin_pin:${businessOwnerId}`;

  const current = rateLimitStore.get(key) || {
    attempts: 0,
    lastAttempt: 0,
  };

  const newAttempts = current.attempts + 1;
  const config = RATE_LIMITS.ADMIN_PIN;

  rateLimitStore.set(key, {
    attempts: newAttempts,
    lastAttempt: now,
    lockedUntil:
      newAttempts >= config.MAX_ATTEMPTS
        ? now + config.LOCKOUT_DURATION
        : undefined,
  });
}

/**
 * Clear rate limit for successful admin PIN authentication
 * @param businessOwnerId - Business owner ID
 */
export function clearAdminPinRateLimit(businessOwnerId: string): void {
  const key = `admin_pin:${businessOwnerId}`;
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status without updating it
 * @param type - Type of rate limit to check
 * @param identifier - Unique identifier
 * @returns Current rate limit status
 */
export function getRateLimitStatus(
  type: "staff_pin" | "admin_pin",
  identifier: string
): RateLimitResult {
  const now = Date.now();
  const config =
    type === "staff_pin" ? RATE_LIMITS.STAFF_PIN : RATE_LIMITS.ADMIN_PIN;
  const key = `${type}:${identifier}`;

  const current = rateLimitStore.get(key) || {
    attempts: 0,
    lastAttempt: 0,
  };

  // Check if currently locked out
  if (current.lockedUntil && now < current.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutTimeRemaining: current.lockedUntil - now,
    };
  }

  // Check if lockout period has passed
  if (current.lockedUntil && now >= current.lockedUntil) {
    return {
      allowed: true,
      remainingAttempts: config.MAX_ATTEMPTS,
    };
  }

  return {
    allowed: current.attempts < config.MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, config.MAX_ATTEMPTS - current.attempts),
    resetTime: current.lastAttempt + config.LOCKOUT_DURATION,
  };
}

/**
 * Clean up expired rate limit entries
 * This should be called periodically to prevent memory leaks
 */
export function cleanupExpiredRateLimits(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, data] of rateLimitStore.entries()) {
    // Remove entries that are past their lockout period and haven't been accessed recently
    if (data.lockedUntil && now > data.lockedUntil + 60 * 60 * 1000) {
      // 1 hour after lockout
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Database-backed rate limiting for production use
 * This stores rate limit data in the database for persistence across server restarts
 */
export class DatabaseRateLimit {
  /**
   * Check rate limit using database storage
   * @param type - Type of rate limit
   * @param identifier - Unique identifier
   * @returns Rate limit result
   */
  static async checkRateLimit(
    type: "staff_pin" | "admin_pin",
    identifier: string
  ): Promise<RateLimitResult> {
    try {
      const supabase = await createClient();
      const now = new Date();
      const config =
        type === "staff_pin" ? RATE_LIMITS.STAFF_PIN : RATE_LIMITS.ADMIN_PIN;

      // Get current rate limit record
      const { data: rateLimitRecord } = await supabase
        .from("rate_limits")
        .select("*")
        .eq("type", type)
        .eq("identifier", identifier)
        .single();

      if (!rateLimitRecord) {
        return {
          allowed: true,
          remainingAttempts: config.MAX_ATTEMPTS - 1,
        };
      }

      const lockedUntil = rateLimitRecord.locked_until
        ? new Date(rateLimitRecord.locked_until)
        : null;
      const lastAttempt = new Date(rateLimitRecord.last_attempt);

      // Check if currently locked out
      if (lockedUntil && now < lockedUntil) {
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutTimeRemaining: lockedUntil.getTime() - now.getTime(),
        };
      }

      // Reset if lockout period has passed
      if (lockedUntil && now >= lockedUntil) {
        await supabase
          .from("rate_limits")
          .delete()
          .eq("type", type)
          .eq("identifier", identifier);

        return {
          allowed: true,
          remainingAttempts: config.MAX_ATTEMPTS - 1,
        };
      }

      // Check if we've exceeded max attempts
      if (rateLimitRecord.attempts >= config.MAX_ATTEMPTS) {
        const lockoutEnd = new Date(
          lastAttempt.getTime() + config.LOCKOUT_DURATION
        );

        if (now < lockoutEnd) {
          return {
            allowed: false,
            remainingAttempts: 0,
            lockoutTimeRemaining: lockoutEnd.getTime() - now.getTime(),
          };
        } else {
          // Lockout period has passed, reset
          await supabase
            .from("rate_limits")
            .delete()
            .eq("type", type)
            .eq("identifier", identifier);

          return {
            allowed: true,
            remainingAttempts: config.MAX_ATTEMPTS - 1,
          };
        }
      }

      return {
        allowed: true,
        remainingAttempts: config.MAX_ATTEMPTS - rateLimitRecord.attempts - 1,
        resetTime: lastAttempt.getTime() + config.LOCKOUT_DURATION,
      };
    } catch (error) {
      console.error("Error checking database rate limit:", error);
      // Fall back to allowing the request if database check fails
      return {
        allowed: true,
        remainingAttempts: 0,
      };
    }
  }

  /**
   * Record a failed attempt in the database
   * @param type - Type of rate limit
   * @param identifier - Unique identifier
   */
  static async recordFailure(
    type: "staff_pin" | "admin_pin",
    identifier: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      const now = new Date();
      const config =
        type === "staff_pin" ? RATE_LIMITS.STAFF_PIN : RATE_LIMITS.ADMIN_PIN;

      // Upsert rate limit record
      const { data: existing } = await supabase
        .from("rate_limits")
        .select("attempts")
        .eq("type", type)
        .eq("identifier", identifier)
        .single();

      const newAttempts = (existing?.attempts || 0) + 1;
      const lockedUntil =
        newAttempts >= config.MAX_ATTEMPTS
          ? new Date(now.getTime() + config.LOCKOUT_DURATION)
          : null;

      await supabase.from("rate_limits").upsert({
        type,
        identifier,
        attempts: newAttempts,
        last_attempt: now.toISOString(),
        locked_until: lockedUntil?.toISOString() || null,
        created_at: existing ? undefined : now.toISOString(),
        updated_at: now.toISOString(),
      });
    } catch (error) {
      console.error("Error recording rate limit failure:", error);
    }
  }

  /**
   * Clear rate limit record for successful authentication
   * @param type - Type of rate limit
   * @param identifier - Unique identifier
   */
  static async clearRateLimit(
    type: "staff_pin" | "admin_pin",
    identifier: string
  ): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase
        .from("rate_limits")
        .delete()
        .eq("type", type)
        .eq("identifier", identifier);
    } catch (error) {
      console.error("Error clearing rate limit:", error);
    }
  }
}
