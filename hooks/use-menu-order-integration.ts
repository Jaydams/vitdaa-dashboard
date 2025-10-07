"use client";

import { useOrderState, UseOrderStateReturn } from "./use-order-state";
import {
  useBusinessSettings,
  UseBusinessSettingsReturn,
} from "./use-business-settings";

export interface UseMenuOrderIntegrationReturn {
  order: UseOrderStateReturn;
  businessSettings: UseBusinessSettingsReturn;
}

/**
 * Combined hook that integrates order state management with business settings
 * Automatically applies dynamic VAT and service charge rates from business settings
 * to order calculations
 */
export function useMenuOrderIntegration(): UseMenuOrderIntegrationReturn {
  const businessSettings = useBusinessSettings();

  // Use business settings rates or fallback to defaults
  const vatRate = businessSettings.settings?.vat_rate ?? 7.5;
  const serviceChargeRate =
    businessSettings.settings?.service_charge_rate ?? 2.5;

  const order = useOrderState({
    vatRate,
    serviceChargeRate,
  });

  return {
    order,
    businessSettings,
  };
}
