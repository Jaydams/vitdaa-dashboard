"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Alert, AlertDescription } from "@/components/ui/alert";

// Admin PIN verification schema
const adminPINVerificationSchema = z.object({
  adminPin: z
    .string()
    .min(4, "Admin PIN must be at least 4 digits")
    .regex(/^\d+$/, "Admin PIN must contain only numbers"),
});

type AdminPINVerificationFormData = z.infer<typeof adminPINVerificationSchema>;

interface AdminPINVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sessionToken: string) => void;
  businessOwnerId: string;
  title?: string;
  description?: string;
}

interface VerificationAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function AdminPINVerification({
  isOpen,
  onClose,
  onSuccess,
  businessOwnerId,
  title = "Admin PIN Required",
  description = "Please enter your admin PIN to continue with this elevated action.",
}: AdminPINVerificationProps) {
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState<VerificationAttempt>({
    count: 0,
    lastAttempt: 0,
  });
  const [timeRemaining, setTimeRemaining] = useState(0);

  const form = useForm<AdminPINVerificationFormData>({
    resolver: zodResolver(adminPINVerificationSchema),
    defaultValues: {
      adminPin: "",
    },
  });

  // Load attempts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(
      `admin_pin_attempts_${businessOwnerId}`
    );
    if (stored) {
      const parsedAttempts = JSON.parse(stored) as VerificationAttempt;
      setAttempts(parsedAttempts);

      // Check if still locked
      if (
        parsedAttempts.lockedUntil &&
        parsedAttempts.lockedUntil > Date.now()
      ) {
        setTimeRemaining(
          Math.ceil((parsedAttempts.lockedUntil - Date.now()) / 1000)
        );
      }
    }
  }, [businessOwnerId]);

  // Update countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Reset attempts when lockout expires
            const newAttempts = { count: 0, lastAttempt: 0 };
            setAttempts(newAttempts);
            localStorage.setItem(
              `admin_pin_attempts_${businessOwnerId}`,
              JSON.stringify(newAttempts)
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, businessOwnerId]);

  const isLocked = timeRemaining > 0;
  const remainingAttempts = MAX_ATTEMPTS - attempts.count;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const onSubmit = async (data: AdminPINVerificationFormData) => {
    if (isLocked) {
      toast.error(
        "Account is temporarily locked. Please wait before trying again."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/business-owner/verify-admin-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessOwnerId,
          adminPin: data.adminPin,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Reset attempts on successful verification
        const newAttempts = { count: 0, lastAttempt: 0 };
        setAttempts(newAttempts);
        localStorage.setItem(
          `admin_pin_attempts_${businessOwnerId}`,
          JSON.stringify(newAttempts)
        );

        // Store the elevated session
        const adminSession = {
          sessionToken: result.sessionToken,
          expiresAt: result.expiresAt,
          isActive: true,
        };
        localStorage.setItem("admin_session", JSON.stringify(adminSession));

        toast.success("Admin PIN verified successfully");
        form.reset();
        onSuccess(result.sessionToken);
        onClose();
      } else {
        // Increment failed attempts
        const newCount = attempts.count + 1;
        const now = Date.now();
        const newAttempts: VerificationAttempt = {
          count: newCount,
          lastAttempt: now,
        };

        // Check if we should lock the account
        if (newCount >= MAX_ATTEMPTS) {
          newAttempts.lockedUntil = now + LOCKOUT_DURATION;
          setTimeRemaining(LOCKOUT_DURATION / 1000);
          toast.error(
            `Too many failed attempts. Account locked for 30 minutes.`
          );
        } else {
          toast.error(
            `Invalid admin PIN. ${MAX_ATTEMPTS - newCount} attempts remaining.`
          );
        }

        setAttempts(newAttempts);
        localStorage.setItem(
          `admin_pin_attempts_${businessOwnerId}`,
          JSON.stringify(newAttempts)
        );

        form.setError("adminPin", {
          type: "manual",
          message: result.error || "Invalid admin PIN",
        });
      }
    } catch (error) {
      console.error("Error verifying admin PIN:", error);
      toast.error("Failed to verify admin PIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isLocked && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Account is locked due to too many failed attempts. Please wait{" "}
              {formatTime(timeRemaining)} before trying again.
            </AlertDescription>
          </Alert>
        )}

        {!isLocked && remainingAttempts < MAX_ATTEMPTS && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""}{" "}
              remaining before account lockout.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        placeholder="Enter your admin PIN"
                        className="pr-10"
                        disabled={isLocked}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPin(!showPin)}
                        disabled={isLocked}
                      >
                        {showPin ? (
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

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="min-w-[100px]"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Verify
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
