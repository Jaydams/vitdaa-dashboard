"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Shield, Loader2, Lock, Unlock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

interface AdminPinModalProps {
  hasAdminPin: boolean;
}

export default function AdminPinModal({ hasAdminPin }: AdminPinModalProps) {
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
            adminPin: data.adminPin,
          }),
        });

        if (response.ok) {
          toast.success("Admin PIN set successfully");
          setupForm.reset();
          window.location.reload();
        } else {
          const error = await response.json();
          toast.error(error.message || "Failed to set admin PIN");
        }
      } catch (error) {
        toast.error("An error occurred while setting admin PIN");
      }
    });
  };

  const handleUpdateSubmit = (data: UpdateAdminPinFormData) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/pin", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPin: data.currentPin,
            newPin: data.newPin,
          }),
        });

        if (response.ok) {
          toast.success("Admin PIN updated successfully");
          updateForm.reset();
          window.location.reload();
        } else {
          const error = await response.json();
          toast.error(error.message || "Failed to update admin PIN");
        }
      } catch (error) {
        toast.error("An error occurred while updating admin PIN");
      }
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {hasAdminPin ? (
            <>
              <Lock className="h-4 w-4" />
              Manage Admin PIN
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              Set Admin PIN
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin PIN Security
          </DialogTitle>
          <DialogDescription>
            {hasAdminPin
              ? "Update your admin PIN for enhanced security"
              : "Set up an admin PIN to protect sensitive operations"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {hasAdminPin ? (
            // Update PIN Form
            <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    Update PIN
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Enter your current PIN and set a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...updateForm}>
                  <form onSubmit={updateForm.handleSubmit(handleUpdateSubmit)} className="space-y-4">
                    <FormField
                      control={updateForm.control}
                      name="currentPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current PIN</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPins.currentPin ? "text" : "password"}
                                placeholder="Enter current PIN"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => toggleShowPin("currentPin")}
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
                          <FormLabel>New PIN</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPins.newPin ? "text" : "password"}
                                placeholder="Enter new PIN"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => toggleShowPin("newPin")}
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
                          <FormLabel>Confirm New PIN</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPins.confirmNewPin ? "text" : "password"}
                                placeholder="Confirm new PIN"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => toggleShowPin("confirmNewPin")}
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

                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Admin PIN
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            // Setup PIN Form
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    Setup PIN
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Create a secure admin PIN for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...setupForm}>
                  <form onSubmit={setupForm.handleSubmit(handleSetupSubmit)} className="space-y-4">
                    <FormField
                      control={setupForm.control}
                      name="adminPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin PIN</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPins.adminPin ? "text" : "password"}
                                placeholder="Enter 4-6 digit PIN"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => toggleShowPin("adminPin")}
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
                          <FormLabel>Confirm PIN</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPins.confirmPin ? "text" : "password"}
                                placeholder="Confirm your PIN"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => toggleShowPin("confirmPin")}
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

                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Set Admin PIN
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground text-center">
            <p>• Admin PIN is used to protect sensitive operations</p>
            <p>• PIN must be 4-6 digits and contain only numbers</p>
            <p>• Keep your PIN secure and don't share it with others</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 