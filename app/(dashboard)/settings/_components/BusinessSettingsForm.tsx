"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Percent } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  upsertBusinessSettings,
  type BusinessSettings,
} from "@/actions/business-settings-actions";

// Form validation schema
const businessSettingsSchema = z.object({
  vat_rate: z
    .number()
    .min(0, "VAT rate must be 0 or greater")
    .max(100, "VAT rate cannot exceed 100%")
    .refine((val) => Number.isFinite(val), "VAT rate must be a valid number"),
  service_charge_rate: z
    .number()
    .min(0, "Service charge rate must be 0 or greater")
    .max(100, "Service charge rate cannot exceed 100%")
    .refine(
      (val) => Number.isFinite(val),
      "Service charge rate must be a valid number"
    ),
});

type BusinessSettingsFormData = z.infer<typeof businessSettingsSchema>;

interface BusinessSettingsFormProps {
  businessId: string;
  initialSettings?: BusinessSettings | null;
}

export default function BusinessSettingsForm({
  businessId,
  initialSettings,
}: BusinessSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BusinessSettingsFormData>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      vat_rate: initialSettings?.vat_rate ?? 7.5,
      service_charge_rate: initialSettings?.service_charge_rate ?? 2.5,
    },
  });

  const onSubmit = async (data: BusinessSettingsFormData) => {
    if (!businessId) {
      toast.error("Business ID is required");
      return;
    }

    setIsSubmitting(true);

    startTransition(async () => {
      try {
        await upsertBusinessSettings(businessId, {
          vat_rate: data.vat_rate,
          service_charge_rate: data.service_charge_rate,
        });

        toast.success("Business settings updated successfully");
      } catch (error) {
        console.error("Error updating business settings:", error);
        toast.error("Failed to update business settings. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const isLoading = isPending || isSubmitting;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Percent className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle>Tax & Service Charges</CardTitle>
            <CardDescription>
              Configure VAT and service charge rates for order calculations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Rate (%)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="7.5"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                          className="pr-8"
                        />
                        <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Value Added Tax rate applied to orders (default: 7.5%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_charge_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Charge Rate (%)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="2.5"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                          className="pr-8"
                        />
                        <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Service charge rate applied to orders (default: 2.5%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <Button type="submit" disabled={isLoading} className="min-w-32">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isLoading}
              >
                Reset
              </Button>
            </div>

            {/* Current Settings Display */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Current Settings</h4>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>VAT Rate:</span>
                  <span>{form.watch("vat_rate")}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge Rate:</span>
                  <span>{form.watch("service_charge_rate")}%</span>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
