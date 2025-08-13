import { createClient } from "@/lib/supabase/server";
import { BusinessOwner } from "@/types/auth";

/**
 * Validates if a user is a business owner by checking the business_owner table
 * @param userId - The Supabase Auth user ID
 * @returns BusinessOwner object if valid, null otherwise
 */
export async function validateBusinessOwner(
  userId: string
): Promise<BusinessOwner | null> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return null;
    }

    const { data: businessOwner, error } = await supabase
      .from("business_owner")
      .select("*")
      .eq("id", userId)
      .eq("account_type", "business")
      .single();

    if (error || !businessOwner) {
      return null;
    }

    return businessOwner as BusinessOwner;
  } catch (error) {
    console.error("Error validating business owner:", error);
    return null;
  }
}

/**
 * Validates user profile and determines if they are a business owner
 * @param userId - The Supabase Auth user ID
 * @returns Object with validation results
 */
export async function validateUserProfile(userId: string) {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return {
        isBusinessOwner: false,
        hasBusinessProfile: false,
        isPersonalUser: false,
        businessOwner: null,
        personalUser: null,
      };
    }

    // Check if user exists in business_owner table
    const { data: businessOwner, error: businessError } = await supabase
      .from("business_owner")
      .select("*")
      .eq("id", userId)
      .single();

    // Check if user exists in personal_users table
    const { data: personalUser, error: personalError } = await supabase
      .from("personal_users")
      .select("*")
      .eq("id", userId)
      .single();

    const isBusinessOwner =
      !businessError &&
      businessOwner &&
      businessOwner.account_type === "business";
    const hasBusinessProfile = !businessError && businessOwner !== null;
    const isPersonalUser = !personalError && personalUser !== null;

    return {
      isBusinessOwner,
      hasBusinessProfile,
      isPersonalUser,
      businessOwner: businessOwner || null,
      personalUser: personalUser || null,
    };
  } catch (error) {
    console.error("Error validating user profile:", error);
    return {
      isBusinessOwner: false,
      hasBusinessProfile: false,
      isPersonalUser: false,
      businessOwner: null,
      personalUser: null,
    };
  }
}
