"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BusinessSettings {
  id: string;
  business_id: string;
  vat_rate: number;
  service_charge_rate: number;
  enabled_dining_options: string[];
  default_takeaway_pack_price: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessSettingsData {
  business_id: string;
  vat_rate?: number;
  service_charge_rate?: number;
  enabled_dining_options?: string[];
  default_takeaway_pack_price?: number;
}

export interface UpdateBusinessSettingsData {
  vat_rate?: number;
  service_charge_rate?: number;
  enabled_dining_options?: string[];
  default_takeaway_pack_price?: number;
}

/**
 * Get business settings for a specific business
 */
export async function getBusinessSettings(
  businessId: string
): Promise<BusinessSettings | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No settings found, return null to trigger default creation
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching business settings:", error);
    throw new Error("Failed to fetch business settings");
  }
}

/**
 * Get business settings with fallback to defaults
 */
export async function getBusinessSettingsWithDefaults(
  businessId: string
): Promise<BusinessSettings> {
  try {
    const settings = await getBusinessSettings(businessId);

    if (!settings) {
      // Return default settings if none exist
      return {
        id: "",
        business_id: businessId,
        vat_rate: 7.5,
        service_charge_rate: 2.5,
        enabled_dining_options: ["indoor", "delivery", "pickup"],
        default_takeaway_pack_price: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return settings;
  } catch (error) {
    console.error("Error fetching business settings with defaults:", error);
    // Return defaults on error
    return {
      id: "",
      business_id: businessId,
      vat_rate: 7.5,
      service_charge_rate: 2.5,
      enabled_dining_options: ["indoor", "delivery", "pickup"],
      default_takeaway_pack_price: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Create new business settings
 */
export async function createBusinessSettings(
  data: CreateBusinessSettingsData
): Promise<BusinessSettings> {
  try {
    const supabase = await createClient();

    const settingsData = {
      business_id: data.business_id,
      vat_rate: data.vat_rate ?? 7.5,
      service_charge_rate: data.service_charge_rate ?? 2.5,
      enabled_dining_options: data.enabled_dining_options ?? [
        "indoor",
        "delivery",
        "pickup",
      ],
      default_takeaway_pack_price: data.default_takeaway_pack_price ?? 100,
    };

    const { data: newSettings, error } = await supabase
      .from("business_settings")
      .insert(settingsData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath("/settings");
    return newSettings;
  } catch (error) {
    console.error("Error creating business settings:", error);
    throw new Error("Failed to create business settings");
  }
}

/**
 * Update existing business settings
 */
export async function updateBusinessSettings(
  businessId: string,
  data: UpdateBusinessSettingsData
): Promise<BusinessSettings> {
  try {
    const supabase = await createClient();

    const { data: updatedSettings, error } = await supabase
      .from("business_settings")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath("/settings");
    revalidatePath("/menu");
    return updatedSettings;
  } catch (error) {
    console.error("Error updating business settings:", error);
    throw new Error("Failed to update business settings");
  }
}

/**
 * Upsert business settings (create if not exists, update if exists)
 */
export async function upsertBusinessSettings(
  businessId: string,
  data: UpdateBusinessSettingsData
): Promise<BusinessSettings> {
  try {
    const existingSettings = await getBusinessSettings(businessId);

    if (existingSettings) {
      return await updateBusinessSettings(businessId, data);
    } else {
      return await createBusinessSettings({
        business_id: businessId,
        ...data,
      });
    }
  } catch (error) {
    console.error("Error upserting business settings:", error);
    throw new Error("Failed to save business settings");
  }
}

/**
 * Delete business settings
 */
export async function deleteBusinessSettings(
  businessId: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("business_settings")
      .delete()
      .eq("business_id", businessId);

    if (error) {
      throw error;
    }

    revalidatePath("/settings");
  } catch (error) {
    console.error("Error deleting business settings:", error);
    throw new Error("Failed to delete business settings");
  }
}
