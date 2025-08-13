"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "../actions";
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
  does_delivery: z.boolean().optional(),
  delivery_locations: z
    .array(
      z.object({
        name: z.string().optional(),
        price: z.number().optional(),
        state: z.string().optional(),
      })
    )
    .optional(),
  takeaway_packs: z
    .array(
      z.object({
        name: z.string().optional(),
        price: z.number().optional(),
      })
    )
    .optional(),
  number_of_tables: z.number().optional(),
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
import { Trash2, Plus, MapPin, Package, Users, Building, Camera, Upload, Image as ImageIcon } from "lucide-react";
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
      does_delivery:
        typeof defaultValues.does_delivery === "boolean"
          ? defaultValues.does_delivery
          : false,
      number_of_tables:
        typeof defaultValues.number_of_tables === "number"
          ? defaultValues.number_of_tables
          : 0,
    },
  });

  const [profileImage, setProfileImage] = useState<string | null>(
    defaultValues.profile_image_url || null
  );
  const [coverImage, setCoverImage] = useState<string | null>(
    defaultValues.cover_image_url || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    try {
      await updateSettingsAction({
        ...data,
        profile_image_url: profileImage || "",
        cover_image_url: coverImage || "",
        ownerId,
      });
      toast.success("Settings updated successfully");
    } catch (error) {
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
                    Upload your business logo and cover images to enhance your brand
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
                          setCoverImage(URL.createObjectURL(file));
                        }}
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
                            setProfileImage(URL.createObjectURL(file));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Instructions */}
                <div className="absolute right-4 top-4">
                  <Badge variant="secondary" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
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
                  <CardTitle className="text-lg">Business Information</CardTitle>
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
                            placeholder={hasValue ? undefined : "Enter business number"}
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Address Information</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your business location and address details
                  </p>
                </div>
              </div>
            </CardHeader>
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
          </Card>

          {/* Social Media Links */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <div className="h-5 w-5 text-purple-600 dark:text-purple-400">📱</div>
                </div>
                <div>
                  <CardTitle className="text-lg">Social Media</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Connect your social media accounts
                  </p>
                </div>
              </div>
            </CardHeader>
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
          </Card>

          {/* Delivery Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Delivery Settings</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure delivery options and locations
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                name="does_delivery"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">
                        Enable Delivery
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to order for delivery
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("does_delivery") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Delivery Locations</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const current = form.getValues("delivery_locations") || [];
                        form.setValue("delivery_locations", [
                          ...current,
                          { name: "", price: 0, state: "" },
                        ]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </div>

                  {form.watch("delivery_locations")?.map((_, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                      <FormField
                        name={`delivery_locations.${index}.name`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Location Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter location name" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        name={`delivery_locations.${index}.price`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Delivery Fee</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="0"
                                onChange={(e) => field.onChange(Number(e.target.value))}
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
                              <FormLabel className="text-sm">State</FormLabel>
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
                            const current = form.getValues("delivery_locations") || [];
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
            </CardContent>
          </Card>

          {/* Takeaway Packs */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Takeaway Packs</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure takeaway packaging options
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Packaging Options</h4>
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
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
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
                                onChange={(e) => field.onChange(Number(e.target.value))}
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
                          const current = form.getValues("takeaway_packs") || [];
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
          </Card>

          {/* Tables Configuration */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tables Configuration</CardTitle>
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
