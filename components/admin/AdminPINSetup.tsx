"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setAdminPin } from "@/actions/auth-actions";

// Admin PIN validation schema
const adminPINSchema = z
  .object({
    adminPin: z
      .string()
      .min(4, "Admin PIN must be at least 4 digits")
      .max(8, "Admin PIN must be at most 8 digits")
      .regex(/^\d+$/, "Admin PIN must contain only numbers"),
    confirmAdminPin: z.string().min(4, "Please confirm your admin PIN"),
  })
  .refine((data) => data.adminPin === data.confirmAdminPin, {
    message: "Admin PINs do not match",
    path: ["confirmAdminPin"],
  });

type AdminPINFormData = z.infer<typeof adminPINSchema>;

interface AdminPINSetupProps {
  businessOwnerId: string;
  onSuccess?: () => void;
  className?: string;
}

export default function AdminPINSetup({
  businessOwnerId,
  onSuccess,
  className,
}: AdminPINSetupProps) {
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AdminPINFormData>({
    resolver: zodResolver(adminPINSchema),
    defaultValues: {
      adminPin: "",
      confirmAdminPin: "",
    },
  });

  const validatePinStrength = (pin: string) => {
    if (pin.length < 4) return "Too short";
    if (pin.length < 6) return "Weak";
    if (pin.length >= 6) return "Strong";
    return "";
  };

  const onSubmit = async (data: AdminPINFormData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("businessOwnerId", businessOwnerId);
      formData.append("adminPin", data.adminPin);

      await setAdminPin(formData);

      // The server action will handle the redirect, so we don't need to do anything else here
      toast.success("Admin PIN has been set successfully");
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error setting admin PIN:", error);
      toast.error("Failed to set admin PIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPin = form.watch("adminPin");
  const pinStrength = validatePinStrength(currentPin);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Set Admin PIN
        </CardTitle>
        <CardDescription>
          Create a secure PIN for elevated administrative actions. This PIN will
          be required for sensitive operations like managing staff permissions
          and accessing financial data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="adminPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin PIN</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPin ? "text" : "password"}
                        placeholder="Enter 4-8 digit PIN"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPin(!showPin)}
                      >
                        {showPin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  {currentPin && (
                    <FormDescription>
                      PIN strength:{" "}
                      <span
                        className={`font-medium ${
                          pinStrength === "Strong"
                            ? "text-green-600"
                            : pinStrength === "Weak"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {pinStrength}
                      </span>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmAdminPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Admin PIN</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPin ? "text" : "password"}
                        placeholder="Confirm your PIN"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                      >
                        {showConfirmPin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Set Admin PIN
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
