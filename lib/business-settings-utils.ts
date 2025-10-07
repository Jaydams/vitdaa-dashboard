import { createClient } from "@/lib/supabase/server";
import type { BusinessSettings } from "@/actions/business-settings-actions";

/**
 * Default business settings rates
 */
export const DEFAULT_BUSINESS_SETTINGS = {
  vat_rate: 7.5,
  service_charge_rate: 2.5,
} as const;

/**
 * Calculate order totals using business settings rates
 */
export interface OrderCalculations {
  subtotal: number;
  vatAmount: number;
  serviceChargeAmount: number;
  total: number;
  vatRate: number;
  serviceChargeRate: number;
}

/**
 * Calculate order totals with VAT and service charge
 */
export function calculateOrderTotals(
  subtotal: number,
  vatRate: number = DEFAULT_BUSINESS_SETTINGS.vat_rate,
  serviceChargeRate: number = DEFAULT_BUSINESS_SETTINGS.service_charge_rate
): OrderCalculations {
  const vatAmount = Math.round((subtotal * vatRate) / 100);
  const serviceChargeAmount = Math.round((subtotal * serviceChargeRate) / 100);
  const total = subtotal + vatAmount + serviceChargeAmount;

  return {
    subtotal,
    vatAmount,
    serviceChargeAmount,
    total,
    vatRate,
    serviceChargeRate,
  };
}

/**
 * Fetch business settings with caching and fallback
 */
export async function fetchBusinessSettingsWithFallback(
  businessId: string
): Promise<BusinessSettings> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (error || !data) {
      // Return default settings if none found or error occurred
      return {
        id: "",
        business_id: businessId,
        vat_rate: DEFAULT_BUSINESS_SETTINGS.vat_rate,
        service_charge_rate: DEFAULT_BUSINESS_SETTINGS.service_charge_rate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return data;
  } catch (error) {
    console.error("Error fetching business settings:", error);
    // Return defaults on any error
    return {
      id: "",
      business_id: businessId,
      vat_rate: DEFAULT_BUSINESS_SETTINGS.vat_rate,
      service_charge_rate: DEFAULT_BUSINESS_SETTINGS.service_charge_rate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
/**
 * Format percentage for display
 */
export function formatPercentage(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Validate business settings rates
 */
export function validateBusinessSettingsRates(
  vatRate: number,
  serviceChargeRate: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (vatRate < 0 || vatRate > 100) {
    errors.push("VAT rate must be between 0% and 100%");
  }

  if (serviceChargeRate < 0 || serviceChargeRate > 100) {
    errors.push("Service charge rate must be between 0% and 100%");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get business settings rates only (for calculations)
 */
export async function getBusinessRates(businessId: string): Promise<{
  vatRate: number;
  serviceChargeRate: number;
}> {
  try {
    const settings = await fetchBusinessSettingsWithFallback(businessId);
    return {
      vatRate: settings.vat_rate,
      serviceChargeRate: settings.service_charge_rate,
    };
  } catch (error) {
    console.error("Error getting business rates:", error);
    return {
      vatRate: DEFAULT_BUSINESS_SETTINGS.vat_rate,
      serviceChargeRate: DEFAULT_BUSINESS_SETTINGS.service_charge_rate,
    };
  }
}
