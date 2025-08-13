import { createClient } from "@/lib/supabase/server";
import { validateBusinessOwner } from "@/actions/auth-utils";

/**
 * Get the current business owner id from the Supabase auth session (server-side).
 * Returns null if not authenticated as a business owner.
 */
export async function getServerBusinessOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const businessOwner = await validateBusinessOwner(user.id);
  return businessOwner ? businessOwner.id : null;
}
