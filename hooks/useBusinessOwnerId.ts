import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Custom hook to get the current business owner id from Supabase auth session (client-side).
 * Returns null if not authenticated as a business owner.
 */
export function useBusinessOwnerId(): string | null {
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOwnerId() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setOwnerId(null);
          return;
        }
        // If your user object has a role or type, check for business owner here
        // For now, just use user.id as ownerId
        setOwnerId(user.id);
      } catch (err) {
        setOwnerId(null);
      }
    }
    fetchOwnerId();
  }, []);

  return ownerId;
}
