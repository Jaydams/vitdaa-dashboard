"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Shield, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Removed server action imports - using API route instead

const adminPinSchema = z
  .object({
    adminPin: z
      .string()
      .min(4, "Admin PIN must be at least 4 digits")
      .max(6, "Admin PIN must be at most 6 digits")
      .regex(/^\d+$/, "Admin PIN must contain only numbers"),
    confirmPin: z.string().min(4, "Please confirm your PIN"),
  })
  .refine((data) => data.adminPin === data.confirmPin, {
    message: "PINs don't match",
    path: ["confirmPin"],
  });

const updateAdminPinSchema = z
  .object({
    currentPin: z.string().min(4, "Current PIN must be at least 4 digits"),
    newPin: z
      .string()
      .min(4, "New PIN must be at least 4 digits")
      .max(6, "New PIN must be at most 6 digits")
      .regex(/^\d+$/, "New PIN must contain only numbers"),
    confirmNewPin: z.string().min(4, "Please confirm your new PIN"),
  })
  .refine((data) => data.newPin === data.confirmNewPin, {
    message: "New PINs don't match",
    path: ["confirmNewPin"],
  });

type AdminPinFormData = z.infer<typeof adminPinSchema>;
type UpdateAdminPinFormData = z.infer<typeof updateAdminPinSchema>;

interface AdminPinSectionProps {
  hasAdminPin: boolean;
}

export default function AdminPinSection({ hasAdminPin }: AdminPinSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [showPins, setShowPins] = useState({
    adminPin: false,
    confirmPin: false,
    currentPin: false,
    newPin: false,
    confirmNewPin: false,
  });

  const setupForm = useForm<AdminPinFormData>({
    resolver: zodResolver(adminPinSchema),
    defaultValues: {
      adminPin: "",
      confirmPin: "",
    },
  });

  const updateForm = useForm<UpdateAdminPinFormData>({
    resolver: zodResolver(updateAdminPinSchema),
    defaultValues: {
      currentPin: "",
      newPin: "",
      confirmNewPin: "",
    },
  });

  const toggleShowPin = (field: keyof typeof showPins) => {
    setShowPins((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSetupSubmit = (data: AdminPinFormData) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "set",
            adminPin: data.adminPin,
            confirmPin: data.confirmPin,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          toast.success(result.message || "Admin PIN set successfully!");
          setupForm.reset();
          // Refresh the page to update the hasAdminPin status
          window.location.reload();
        } else {
          toast.error(result.error || "Failed to set admin PIN");
        }
      } catch (error) {
        console.error("Set admin PIN error:", error);
        toast.error("Failed to set admin PIN. Please try again.");
      }
    });
  };

  const handleUpdateSubmit = (data: UpdateAdminPinFormData) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update",
            currentPin: data.currentPin,
            newPin: data.newPin,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          toast.success(result.message || "Admin PIN updated successfully!");
          updateForm.reset();
        } else {
          toast.error(result.error || "Failed to update admin PIN");
        }
      } catch (error) {
        console.error("Update admin PIN error:", error);
        toast.error("Failed to update admin PIN. Please try again.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Admin PIN Security</CardTitle>
          {hasAdminPin && (
            <Badge variant="secondary" className="ml-auto">
              PIN Set
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasAdminPin
            ? "Your admin PIN is set. You can update it here if needed."
            : "Set up an admin PIN to enable staff sign-in functionality and enhanced security."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!hasAdminPin ? (
          // Setup Admin PIN Form
          <Form {...setupForm}>
            <form
              onSubmit={setupForm.handleSubmit(handleSetupSubmit)}
              className="space-y-4"
            >
              <FormField
                control={setupForm.control}
                name="adminPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin PIN</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPins.adminPin ? "text" : "password"}
                          placeholder="Enter 4-6 digit PIN"
                          disabled={isPending}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleShowPin("adminPin")}
                          disabled={isPending}
                        >
                          {showPins.adminPin ? (
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

              <FormField
                control={setupForm.control}
                name="confirmPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Admin PIN</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPins.confirmPin ? "text" : "password"}
                          placeholder="Confirm your PIN"
                          disabled={isPending}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleShowPin("confirmPin")}
                          disabled={isPending}
                        >
                          {showPins.confirmPin ? (
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

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set Admin PIN
              </Button>
            </form>
          </Form>
        ) : (
          // Update Admin PIN Form
          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(handleUpdateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={updateForm.control}
                name="currentPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Admin PIN</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPins.currentPin ? "text" : "password"}
                          placeholder="Enter current PIN"
                          disabled={isPending}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleShowPin("currentPin")}
                          disabled={isPending}
                        >
                          {showPins.currentPin ? (
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

              <FormField
                control={updateForm.control}
                name="newPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Admin PIN</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPins.newPin ? "text" : "password"}
                          placeholder="Enter new 4-8 digit PIN"
                          disabled={isPending}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleShowPin("newPin")}
                          disabled={isPending}
                        >
                          {showPins.newPin ? (
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

              <FormField
                control={updateForm.control}
                name="confirmNewPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Admin PIN</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPins.confirmNewPin ? "text" : "password"}
                          placeholder="Confirm new PIN"
                          disabled={isPending}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleShowPin("confirmNewPin")}
                          disabled={isPending}
                        >
                          {showPins.confirmNewPin ? (
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

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Admin PIN
              </Button>
            </form>
          </Form>
        )}

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Important:</strong> Your admin PIN is required to sign in
            staff members and access sensitive operations. Keep it secure and
            don&apos;t share it with staff members.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
