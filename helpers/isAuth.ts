import { createClient } from "@/lib/supabase/server";
import { Session } from "@supabase/supabase-js";

/**
 * isAuth - Function to check if a user is authenticated using Supabase.
 * @returns A Promise that resolves to the session data if authenticated, or null if not authenticated.
 */
export default async function isAuth(): Promise<Session | null> {
  const supabase = await createClient();

  // Call Supabase's getSession() method to retrieve session data.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Return the session data obtained from Supabase, or null if not authenticated.
  return session;
}
