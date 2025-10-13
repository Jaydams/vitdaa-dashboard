import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { BusinessInfo } from "@/lib/business-info";

/**
 * Fetch business information for invoices and receipts (Server-side only)
 */
export async function getBusinessInfo(): Promise<BusinessInfo | null> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      console.error("No business owner ID found");
      return null;
    }

    const { data: businessInfo, error } = await supabase
      .from("business_owner")
      .select(
        "business_name, business_number, address, phoneNumber, email, first_name, last_name"
      )
      .eq("id", businessOwnerId)
      .single();

    if (error) {
      console.error("Error fetching business info:", error);
      return null;
    }

    return businessInfo;
  } catch (error) {
    console.error("Error in getBusinessInfo:", error);
    return null;
  }
}
