"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "../actions";
import { upsertBusinessSettings } from "@/actions/business-settings-actions";
import * as z from "zod";

// Define the schema and type here since they are not exported from SettingsForm
export const settingsFormSchema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  business_number: z.string().optional(),
  description: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postal_code: z.string().optional(),
      raw: z.string().optional(),
    })
    .optional(),
  profile_image_url: z.string().optional(),
  cover_image_url: z.string().optional(),
  facebook_url: z.string().optional(),
  instagram_url: z.string().optional(),
  x_url: z.string().optional(),

  delivery_locations: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        price: z.number().optional(),
        state: z.string().optional(),
      })
    )
    .optional(),
  takeaway_packs: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        price: z.number().optional(),
      })
    )
    .optional(),
  number_of_tables: z.number().optional(),
  enabled_dining_options: z
    .array(z.enum(["indoor", "delivery", "pickup"]))
    .min(1, "At least one dining option must be enabled")
    .optional(),
  default_takeaway_pack_price: z.number().min(0).optional(),
});

export type SettingsFormData = z.infer<typeof settingsFormSchema>;
import Image from "next/image";
import ImageDropzone from "@/components/shared/ImageDropzone";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  Plus,
  MapPin,
  Package,
  Users,
  Building,
  Camera,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function SettingsFormClient({
  defaultValues,
  ownerId,
}: {
  defaultValues: Partial<SettingsFormData>;
  ownerId: string;
}) {
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      ...defaultValues,
      address:
        typeof defaultValues.address === "object" &&
        defaultValues.address !== null
          ? defaultValues.address
          : {},
      delivery_locations: Array.isArray(defaultValues.delivery_locations)
        ? defaultValues.delivery_locations
        : [],
      takeaway_packs: Array.isArray(defaultValues.takeaway_packs)
        ? defaultValues.takeaway_packs
        : [],

      number_of_tables:
        typeof defaultValues.number_of_tables === "number"
          ? defaultValues.number_of_tables
          : 0,
      enabled_dining_options: Array.isArray(
        defaultValues.enabled_dining_options
      )
        ? defaultValues.enabled_dining_options
        : ["indoor", "delivery", "pickup"],
      default_takeaway_pack_price:
        typeof defaultValues.default_takeaway_pack_price === "number"
          ? defaultValues.default_takeaway_pack_price
          : 100,
    },
  });

  const [profileImage, setProfileImage] = useState<string | undefined>(
    defaultValues.profile_image_url || undefined
  );
  const [coverImage, setCoverImage] = useState<string | undefined>(
    defaultValues.cover_image_url || undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapsible section states
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);
  const [isTakeawayExpanded, setIsTakeawayExpanded] = useState(false);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [isSocialExpanded, setIsSocialExpanded] = useState(false);

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    try {
      // Debug: Log the data being submitted
      console.log("Submitting settings data:", {
        delivery_locations: data.delivery_locations,
        takeaway_packs: data.takeaway_packs,
        enabled_dining_options: data.enabled_dining_options,
        default_takeaway_pack_price: data.default_takeaway_pack_price,
      });

      // Update business owner settings (profile, delivery locations, takeaway packs, etc.)
      await updateSettingsAction(ownerId, {
        ...data,
        profile_image_url: profileImage || "",
        cover_image_url: coverImage || "",
      });

      // Update business settings (dining options and default takeaway pack price)
      await upsertBusinessSettings(ownerId, {
        enabled_dining_options: data.enabled_dining_options || [
          "indoor",
          "delivery",
          "pickup",
        ],
        default_takeaway_pack_price: data.default_takeaway_pack_price || 100,
      });

      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Settings update error:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Enhanced Profile & Cover Images Section */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Branding & Images</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload your business logo and cover images to enhance your
                    brand
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative">
                {/* Cover Image */}
                <div className="relative h-48 sm:h-64 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                  {coverImage ? (
                    <Image
                      src={coverImage}
                      alt="Cover"
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Upload cover image</p>
                      </div>
                    </div>
                  )}

                  {/* Cover Image Upload Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="bg-white/90 dark:bg-slate-900/90 rounded-lg p-4 backdrop-blur-sm">
                      <ImageDropzone
                        previewImage={coverImage}
                        onFileAccepted={(file) => {
                          // Keep local preview for immediate feedback
                          setCoverImage(URL.createObjectURL(file));
                        }}
                        onImageUploaded={(url) => {
                          // Update with the actual uploaded URL
                          setCoverImage(url);
                        }}
                        uploadType="cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Image */}
                <div className="absolute left-6 -bottom-16">
                  <div className="relative w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                    {profileImage ? (
                      <Image
                        src={profileImage}
                        alt="Profile"
                        fill
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <Camera className="h-8 w-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">Logo</p>
                        </div>
                      </div>
                    )}

                    {/* Profile Image Upload Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="bg-white/90 dark:bg-slate-900/90 rounded-lg p-2 backdrop-blur-sm">
                        <ImageDropzone
                          previewImage={profileImage}
                          onFileAccepted={(file) => {
                            // Keep local preview for immediate feedback
                            setProfileImage(URL.createObjectURL(file));
                          }}
                          onImageUploaded={(url) => {
                            // Update with the actual uploaded URL
                            setProfileImage(url);
                          }}
                          uploadType="profile"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Instructions */}
                <div className="absolute right-4 top-4">
                  <Badge
                    variant="secondary"
                    className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Hover to upload
                  </Badge>
                </div>
              </div>

              {/* Spacer for profile image */}
              <div className="h-20"></div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Business Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Update your business details and contact information
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="business_name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Business Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-11"
                          placeholder="Enter your business name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="business_number"
                  control={form.control}
                  render={({ field }) => {
                    const hasValue = !!field.value;
                    const value = field.value ?? "";
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Business Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            readOnly={hasValue}
                            value={hasValue ? "*".repeat(value.length) : value}
                            placeholder={
                              hasValue ? undefined : "Enter business number"
                            }
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Tell customers about your business..."
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card
            className={`border-0 shadow-sm transition-all duration-200 ${
              isAddressExpanded
                ? "ring-2 ring-green-100 dark:ring-green-900/30"
                : "hover:shadow-md"
            }`}
          >
            <CardHeader
              className={`pb-4 cursor-pointer transition-colors duration-200 ${
                !isAddressExpanded
                  ? "hover:bg-green-50/50 dark:hover:bg-green-950/20"
                  : ""
              }`}
              onClick={() => setIsAddressExpanded(!isAddressExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Address Information
                      {!isAddressExpanded && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          Click to expand
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Your business location and address details
                    </p>
                  </div>
                </div>
                <div
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isAddressExpanded
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "hover:bg-green-100 dark:hover:bg-green-900/30"
                  }`}
                >
                  {isAddressExpanded ? (
                    <ChevronUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
              </div>
            </CardHeader>
            {isAddressExpanded && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    name="address.street"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Street
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11"
                            placeholder="Enter street address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="address.city"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          City
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11"
                            placeholder="Enter city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="address.state"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          State
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11"
                            placeholder="Enter state"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="address.country"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Country
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11"
                            placeholder="Enter country"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="address.postal_code"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Postal Code
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11"
                            placeholder="Enter postal code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Social Media Links */}
          <Card
            className={`border-0 shadow-sm transition-all duration-200 ${
              isSocialExpanded
                ? "ring-2 ring-purple-100 dark:ring-purple-900/30"
                : "hover:shadow-md"
            }`}
          >
            <CardHeader
              className={`pb-4 cursor-pointer transition-colors duration-200 ${
                !isSocialExpanded
                  ? "hover:bg-purple-50/50 dark:hover:bg-purple-950/20"
                  : ""
              }`}
              onClick={() => setIsSocialExpanded(!isSocialExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <div className="h-5 w-5 text-purple-600 dark:text-purple-400">
                      📱
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Social Media
                      {!isSocialExpanded && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                        >
                          Click to expand
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Connect your social media accounts
                    </p>
                  </div>
                </div>
                <div
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isSocialExpanded
                      ? "bg-purple-100 dark:bg-purple-900/30"
                      : "hover:bg-purple-100 dark:hover:bg-purple-900/30"
                  }`}
                >
                  {isSocialExpanded ? (
                    <ChevronUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
              </div>
            </CardHeader>
            {isSocialExpanded && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    name="facebook_url"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Facebook URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11"
                            placeholder="https://facebook.com/..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="instagram_url"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Instagram URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11"
                            placeholder="https://instagram.com/..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="x_url"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          X (Twitter) URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11"
                            placeholder="https://x.com/..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Dining Options & Delivery Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Dining Options & Delivery
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure available dining options and delivery settings
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dining Options Configuration */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">
                  Available Dining Options
                </h4>
                <FormField
                  name="enabled_dining_options"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(["indoor", "delivery", "pickup"] as const).map(
                          (option) => (
                            <div
                              key={option}
                              className="flex items-center space-x-2 p-3 border rounded-lg"
                            >
                              <input
                                type="checkbox"
                                id={option}
                                checked={field.value?.includes(option) || false}
                                onChange={(e) => {
                                  const currentOptions = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentOptions, option]);
                                    // Auto-enable delivery switch if delivery option is selected
                                    if (option === "delivery") {
                                      form.setValue("does_delivery", true);
                                    }
                                  } else {
                                    field.onChange(
                                      currentOptions.filter((o) => o !== option)
                                    );
                                    // Auto-disable delivery switch if delivery option is deselected
                                    if (option === "delivery") {
                                      form.setValue("does_delivery", false);
                                    }
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <label
                                htmlFor={option}
                                className="text-sm font-medium capitalize"
                              >
                                {option === "indoor"
                                  ? "Indoor Dining"
                                  : option === "delivery"
                                  ? "Delivery"
                                  : "Pickup"}
                              </label>
                            </div>
                          )
                        )}
                      </div>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Select the dining options you want to offer to
                        customers. At least one option must be enabled.
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {form.watch("enabled_dining_options")?.includes("delivery") && (
                <div
                  className={`space-y-4 p-4 rounded-lg border transition-all duration-200 ${
                    isDeliveryExpanded
                      ? "bg-orange-50/30 border-orange-200 dark:bg-orange-950/10 dark:border-orange-800"
                      : "bg-gray-50/30 border-gray-200 dark:bg-gray-950/10 dark:border-gray-800 hover:bg-orange-50/20 dark:hover:bg-orange-950/5"
                  }`}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsDeliveryExpanded(!isDeliveryExpanded)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isDeliveryExpanded
                            ? "bg-orange-100 dark:bg-orange-900/30"
                            : "bg-gray-100 dark:bg-gray-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                        }`}
                      >
                        <MapPin
                          className={`h-4 w-4 transition-colors duration-200 ${
                            isDeliveryExpanded
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          Delivery Locations
                          {!isDeliveryExpanded && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                            >
                              {form.watch("delivery_locations")?.length || 0}{" "}
                              locations
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Configure delivery areas and fees
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDeliveryExpanded && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const current =
                              form.getValues("delivery_locations") || [];
                            form.setValue("delivery_locations", [
                              ...current,
                              { name: "", price: 0, state: "" },
                            ]);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Location
                        </Button>
                      )}
                      <div
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isDeliveryExpanded
                            ? "bg-orange-100 dark:bg-orange-900/30"
                            : "hover:bg-orange-100 dark:hover:bg-orange-900/30"
                        }`}
                      >
                        {isDeliveryExpanded ? (
                          <ChevronUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isDeliveryExpanded && (
                    <div className="space-y-4">
                      {form.watch("delivery_locations")?.map((_, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg"
                        >
                          {/* Hidden field to preserve ID for existing locations */}
                          <FormField
                            name={`delivery_locations.${index}.id`}
                            control={form.control}
                            render={({ field }) => (
                              <input type="hidden" {...field} />
                            )}
                          />
                          <FormField
                            name={`delivery_locations.${index}.name`}
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">
                                  Location Name
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter location name"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            name={`delivery_locations.${index}.price`}
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">
                                  Delivery Fee
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    placeholder="0"
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex items-end gap-2">
                            <FormField
                              name={`delivery_locations.${index}.state`}
                              control={form.control}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-sm">
                                    State
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="State" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const current =
                                  form.getValues("delivery_locations") || [];
                                form.setValue(
                                  "delivery_locations",
                                  current.filter((_, i) => i !== index)
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Takeaway Packs */}
          <Card
            className={`border-0 shadow-sm transition-all duration-200 ${
              isTakeawayExpanded
                ? "ring-2 ring-yellow-100 dark:ring-yellow-900/30"
                : "hover:shadow-md"
            }`}
          >
            <CardHeader
              className={`pb-4 cursor-pointer transition-colors duration-200 ${
                !isTakeawayExpanded
                  ? "hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20"
                  : ""
              }`}
              onClick={() => setIsTakeawayExpanded(!isTakeawayExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Package className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Takeaway Packs
                      {!isTakeawayExpanded && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          {form.watch("takeaway_packs")?.length || 0} custom
                          packs
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Configure takeaway packaging options
                    </p>
                  </div>
                </div>
                <div
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isTakeawayExpanded
                      ? "bg-yellow-100 dark:bg-yellow-900/30"
                      : "hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                  }`}
                >
                  {isTakeawayExpanded ? (
                    <ChevronUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  )}
                </div>
              </div>
            </CardHeader>
            {isTakeawayExpanded && (
              <CardContent>
                <div className="space-y-4">
                  {/* Default Takeaway Pack Price */}
                  <FormField
                    name="default_takeaway_pack_price"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Default Takeaway Pack Price (₦)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="100"
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                field.onChange(isNaN(value) ? 0 : value);
                              }}
                              className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                              ₦
                            </span>
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Default price used when no specific pack price is set
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      Custom Packaging Options
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const current = form.getValues("takeaway_packs") || [];
                        form.setValue("takeaway_packs", [
                          ...current,
                          { name: "", price: 0 },
                        ]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Pack
                    </Button>
                  </div>

                  {form.watch("takeaway_packs")?.map((_, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
                    >
                      {/* Hidden field to preserve ID for existing packs */}
                      <FormField
                        name={`takeaway_packs.${index}.id`}
                        control={form.control}
                        render={({ field }) => (
                          <input type="hidden" {...field} />
                        )}
                      />
                      <FormField
                        name={`takeaway_packs.${index}.name`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Pack Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter pack name" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end gap-2">
                        <FormField
                          name={`takeaway_packs.${index}.price`}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-sm">Price</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder="0"
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current =
                              form.getValues("takeaway_packs") || [];
                            form.setValue(
                              "takeaway_packs",
                              current.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Tables Configuration */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Tables Configuration
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Set the number of tables in your restaurant
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FormField
                name="number_of_tables"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Number of Tables
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        className="h-11 w-48"
                        placeholder="Enter number of tables"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="px-8">
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
