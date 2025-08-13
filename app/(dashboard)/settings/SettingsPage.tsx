import PageTitle from "@/components/shared/PageTitle";
import SettingsForm from "./_components/SettingsForm";
import AdminPinModal from "./_components/AdminPinModal";
import SettingsErrorHandler from "./_components/SettingsErrorHandler";

import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { getBusinessOwnerSettings } from "@/data/settings";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Settings, Building, Image as ImageIcon } from "lucide-react";

export default async function SettingsPage() {
  const businessOwnerId = await getServerBusinessOwnerId();
  let defaultValues = {};
  let hasAdminPin = false;

  if (businessOwnerId) {
    const settings = await getBusinessOwnerSettings(businessOwnerId);

    // Check if admin PIN is set
    const supabase = await createClient();
    const { data: businessOwner } = await supabase
      .from("business_owner")
      .select("admin_pin_hash")
      .eq("id", businessOwnerId)
      .single();

    hasAdminPin = !!businessOwner?.admin_pin_hash;
    defaultValues = {
      business_name: settings.business_name ?? "",
      business_number: settings.business_number ?? "",
      description: settings.description ?? "",
      address: settings.address ?? {
        street: "",
        city: "",
        state: "",
        country: "",
        postal_code: "",
        raw: "",
      },
      profile_image_url: settings.profile_image_url ?? "",
      cover_image_url: settings.cover_image_url ?? "",
      facebook_url: settings.facebook_url ?? "",
      instagram_url: settings.instagram_url ?? "",
      x_url: settings.x_url ?? "",
      does_delivery:
        typeof settings.does_delivery === "boolean"
          ? settings.does_delivery
          : false,
      delivery_locations: Array.isArray(settings.delivery_locations)
        ? settings.delivery_locations
        : [],
      takeaway_packs: Array.isArray(settings.takeaway_packs)
        ? settings.takeaway_packs
        : [],
      number_of_tables:
        typeof settings.number_of_tables === "number"
          ? settings.number_of_tables
          : 0,
    };
  }

  return (
    <section className="space-y-6">
      {/* Error/Success Handler */}
      <SettingsErrorHandler />

      <div className="flex items-center justify-between">
        <PageTitle>Settings</PageTitle>
        <AdminPinModal hasAdminPin={hasAdminPin} />
      </div>

      {/* Settings Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Business Profile</CardTitle>
                <CardDescription>
                  Manage your business information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Update your business name, description, and contact details
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Branding</CardTitle>
                <CardDescription>Profile and cover images</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload your business logo and cover images
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>Admin PIN protection</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {hasAdminPin
                ? "Admin PIN is configured"
                : "Set up admin PIN for security"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Settings Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>
                Configure your restaurant's settings and preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaultValues={defaultValues}
            ownerId={businessOwnerId || ""}
          />
        </CardContent>
      </Card>
    </section>
  );
}
