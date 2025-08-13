import { useStaffSession } from "@/hooks/useStaffSession";

/**
 * Custom hook to get the current ownerId (staff id) for filtering menus/items.
 * Falls back to null if not available.
 */
export function useOwnerId(): string | null {
  const { staff } = useStaffSession();
  return staff?.id || null;
}
