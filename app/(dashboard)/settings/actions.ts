"use server";

import { updateBusinessOwnerSettings } from "@/data/settings";
import { SettingsFormData } from "./_components/SettingsForm";

export async function updateSettingsAction(
  ownerId: string,
  data: SettingsFormData
) {
  "use server";
  return await updateBusinessOwnerSettings(ownerId, data);
}
