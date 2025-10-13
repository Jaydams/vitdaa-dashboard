export interface BusinessInfo {
  business_name: string | null;
  business_number: string | null;
  address: any; // JSONB field
  phoneNumber: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Format business address from JSONB field
 */
export function formatBusinessAddress(address: any): string {
  if (!address) return "";

  if (typeof address === "string") {
    return address;
  }

  if (typeof address === "object") {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    return parts.join(", ");
  }

  return "";
}

/**
 * Get formatted business name with fallback
 */
export function getFormattedBusinessName(
  businessInfo: BusinessInfo | null
): string {
  if (!businessInfo) return "Business Name Not Set";

  if (businessInfo.business_name) {
    return businessInfo.business_name;
  }

  // Fallback to owner name
  if (businessInfo.first_name || businessInfo.last_name) {
    const name = [businessInfo.first_name, businessInfo.last_name]
      .filter(Boolean)
      .join(" ");
    return name || "Business Name Not Set";
  }

  return "Business Name Not Set";
}
