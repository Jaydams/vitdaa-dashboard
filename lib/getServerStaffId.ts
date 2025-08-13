import { cookies } from "next/headers";
import { validateStaffSession } from "@/actions/staff-auth-utils";

/**
 * Get the current staff id from the staff session cookie (server-side).
 * Returns null if not authenticated as staff.
 */
export async function getServerStaffId(): Promise<string | null> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const sessionToken = allCookies.find(
    (c) => c.name === "staff_session_token"
  )?.value;
  if (!sessionToken) return null;
  const session = await validateStaffSession(sessionToken);
  return session?.staff_id || null;
}
