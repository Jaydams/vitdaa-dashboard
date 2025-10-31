"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BusinessSettings,
  getBusinessSettingsWithDefaults,
  upsertBusinessSettings,
  UpdateBusinessSettingsData,
} from "@/actions/business-settings-actions";
import { useBusinessOwnerId } from "./useBusinessOwnerId";

export interface UseBusinessSettingsReturn {
  settings: BusinessSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (data: UpdateBusinessSettingsData) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing business settings
 * Fetches settings with fallback to defaults and provides update functionality
 * Includes caching and error handling
 */
export function useBusinessSettings(): UseBusinessSettingsReturn {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const businessOwnerId = useBusinessOwnerId();

  // Fetch settings from server
  const fetchSettings = useCallback(async () => {
    if (!businessOwnerId) {
      setLoading(false);
      setError("Business owner ID not available");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const businessSettings = await getBusinessSettingsWithDefaults(
        businessOwnerId
      );
      setSettings(businessSettings);
    } catch (err) {
      console.error("Error fetching business settings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch business settings"
      );

      // Set fallback default settings on error
      setSettings({
        id: "",
        business_id: businessOwnerId,
        vat_rate: 7.5,
        service_charge_rate: 2.5,
        enabled_dining_options: ["indoor", "delivery"],
        default_takeaway_pack_price: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [businessOwnerId]);

  // Update settings
  const updateSettings = useCallback(
    async (data: UpdateBusinessSettingsData) => {
      if (!businessOwnerId) {
        throw new Error("Business owner ID not available");
      }

      try {
        setError(null);

        const updatedSettings = await upsertBusinessSettings(
          businessOwnerId,
          data
        );
        setSettings(updatedSettings);
      } catch (err) {
        console.error("Error updating business settings:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update business settings";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [businessOwnerId]
  );

  // Refetch settings
  const refetch = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  // Initial fetch when business owner ID is available
  useEffect(() => {
    if (businessOwnerId) {
      fetchSettings();
    }
  }, [businessOwnerId]); // Remove fetchSettings from dependency array to prevent loops

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch,
  };
}
