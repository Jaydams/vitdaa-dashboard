"use client";

import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Loader2,
  Shield,
  Wifi,
  WifiOff,
  Building2,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRealtimeShiftStatus } from "@/lib/hybrid-auth-realtime";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Typography from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { staffLoginFields } from "./fields";
import { staffLoginFormSchema } from "./schema";
import { staffLogin } from "@/actions/auth-actions";

type FormData = z.infer<typeof staffLoginFormSchema>;

export default function StaffLoginForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if this is a hybrid auth link (has adminToken in URL)
  const adminTokenFromUrl = searchParams.get("adminToken");
  const businessIdFromUrl = searchParams.get("businessId");
  // Force regular auth mode for staff login from admin link
  const isHybridAuth = false; // Changed from !!(businessIdFromUrl && adminTokenFromUrl)

  // Use realtime hook for shift status if hybrid auth
  const {
    shiftStatus,
    loading: checkingShift,
    error: realtimeError,
  } = useRealtimeShiftStatus(isHybridAuth ? "" : "");

  const form = useForm<FormData>({
    resolver: zodResolver(staffLoginFormSchema),
    defaultValues: {
      email: "",
      username: "",
      pin: "",
    },
  });

  // Set business ID cookie if provided in URL
  useEffect(() => {
    if (businessIdFromUrl) {
      console.log("Setting business ID cookie from URL:", businessIdFromUrl);
      // Set the cookie via API call
      fetch("/api/staff/set-business-cookie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId: businessIdFromUrl,
        }),
      })
        .then((response) => {
          if (response.ok) {
            console.log("Business ID cookie set successfully from URL");
            // Also set a client-side cookie as backup
            document.cookie = `staff_business_id=${businessIdFromUrl}; path=/; max-age=3600`;
          } else {
            console.error("Failed to set business ID cookie from URL");
          }
        })
        .catch((error) => {
          console.error("Error setting business ID cookie from URL:", error);
        });
    }
  }, [businessIdFromUrl]);

  // Handle error messages from URL search params
  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    const minutes = searchParams.get("minutes");

    if (error) {
      let errorMessage = "Login failed. Please try again.";

      switch (error) {
        case "missing-credentials":
          errorMessage = "Please enter both PIN and Business ID.";
          break;
        case "invalid-pin":
          errorMessage = "Invalid PIN. Please check your PIN and try again.";
          break;
        case "rate-limited":
          const remainingMinutes = minutes ? parseInt(minutes) : 15;
          errorMessage = `Too many failed attempts. Please try again in ${remainingMinutes} minute${
            remainingMinutes !== 1 ? "s" : ""
          }.`;
          break;
        case "business-not-found":
          errorMessage = "Business not found. Please check your Business ID.";
          break;
        case "server-error":
          errorMessage = "Server error occurred. Please try again later.";
          break;
        default:
          try {
            errorMessage = decodeURIComponent(error);
          } catch {
            errorMessage = "Login failed. Please try again.";
          }
      }

      toast.error(errorMessage);
    }

    if (message) {
      let successMessage = "";

      switch (message) {
        case "signed-out":
          successMessage = "You have been signed out successfully.";
          break;
        default:
          try {
            successMessage = decodeURIComponent(message);
          } catch {
            successMessage = message;
          }
      }

      if (successMessage) {
        toast.success(successMessage);
      }
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    const pin = formData.get("pin") as string;

    if (!email && !username) {
      toast.error("Please provide either email or username");
      return;
    }

    if (!pin) {
      toast.error("Please enter your PIN");
      return;
    }

    startTransition(async () => {
      try {
        // Create a new FormData for the server action
        const serverFormData = new FormData();
        if (email) serverFormData.append("email", email);
        if (username) serverFormData.append("username", username);
        serverFormData.append("pin", pin);
        
        // Add URL parameters to the FormData
        serverFormData.append("_url", window.location.href);

        await staffLogin(serverFormData);
        
        // If we reach here, login was successful
        toast.success("Login successful!");
        // Remove manual redirect - staffLogin function handles it
      } catch (error) {
        console.error("Login error:", error);
        
        // Check if this is a NEXT_REDIRECT error (which is actually successful)
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
          // This is a successful redirect, not an error
          toast.success("Login successful!");
          return;
        }
        
        toast.error("Login failed. Please try again.");
      }
    });
  };

  const handleHybridLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const staffId = formData.get("email") as string; // In hybrid mode, email field contains Staff ID
    const pin = formData.get("pin") as string; // In hybrid mode, pin field contains PIN

    if (!staffId || !pin || !adminTokenFromUrl) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!shiftStatus?.is_active) {
      toast.error("No active shift. Please contact your manager.");
      return;
    }

    try {
      const response = await fetch("/api/auth/hybrid/staff/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: staffId,
          pin: pin,
          adminSessionToken: adminTokenFromUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store staff session in cookies (to match your existing system)
        document.cookie = `staff_session_token=${
          data.session.session_token
        }; path=/; max-age=${8 * 60 * 60}`;

        // Redirect to your existing staffs page
        router.push("/staffs");
        toast.success("Login successful!");
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    }
  };

  // Check if user is currently rate limited
  const isRateLimited = searchParams.get("error") === "rate-limited";
  const remainingMinutes = searchParams.get("minutes");

  return (
    <div className="w-full">
      <div className="flex items-center justify-center mb-6">
        <Shield className="h-8 w-8 text-primary mr-2" />
        <Typography variant="h2">Staff Login</Typography>
      </div>

      <Typography
        variant="p"
        className="text-center text-muted-foreground mb-8"
      >
        {isHybridAuth
          ? "Enter your Staff ID and PIN to access your dashboard"
          : "Enter your PIN and Business ID to access the staff dashboard"}
      </Typography>

      {/* Hybrid Auth: Show shift status */}
      {isHybridAuth && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-sm">Shift Status</span>
            <div className="flex items-center gap-1">
              {realtimeError ? (
                <WifiOff className="h-3 w-3 text-red-500" />
              ) : (
                <Wifi className="h-3 w-3 text-green-500" />
              )}
            </div>
          </div>

          {checkingShift ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Checking shift status...</span>
            </div>
          ) : shiftStatus?.is_active ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <Badge variant="default" className="bg-green-500 text-xs">
                  {shiftStatus.shift?.shift_name || "Active Shift"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>
                    {shiftStatus.active_staff_count}/
                    {shiftStatus.max_staff_allowed} staff
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Started{" "}
                    {new Date(
                      shiftStatus.shift?.started_at || ""
                    ).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              <Badge variant="secondary" className="text-xs">
                No Active Shift
              </Badge>
            </div>
          )}
        </div>
      )}

      {isRateLimited && remainingMinutes && (
        <Alert className="mb-6 border-destructive">
          <AlertDescription>
            Too many failed login attempts. Please wait {remainingMinutes}{" "}
            minute{parseInt(remainingMinutes) !== 1 ? "s" : ""} before trying
            again.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {isHybridAuth ? (
            // Hybrid Auth Mode: Staff ID + PIN
            <>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff ID</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your Staff ID"
                        disabled={
                          isPending || isRateLimited || !shiftStatus?.is_active
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your PIN"
                        disabled={
                          isPending || isRateLimited || !shiftStatus?.is_active
                        }
                        maxLength={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : (
            // Regular Auth Mode: Email/Username + PIN
            <>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        disabled={isPending || isRateLimited}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Or enter your username"
                        disabled={isPending || isRateLimited}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your 4-6 digit PIN"
                        disabled={isPending || isRateLimited}
                        maxLength={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <Button
            disabled={
              isPending ||
              isRateLimited ||
              (isHybridAuth && !shiftStatus?.is_active)
            }
            type="submit"
            className="w-full"
            size="lg"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRateLimited ? "Login Disabled" : "Login"}
          </Button>

          {isHybridAuth && !shiftStatus?.is_active && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No active shift. Please wait for your manager to start the
                shift.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </Form>

      <div className="mt-8 text-center">
        <Typography variant="p" className="text-sm text-muted-foreground">
          Need help? Contact your business owner or manager.
        </Typography>
        <Typography variant="a" href="/login" className="block mt-2 text-sm">
          Business Owner Login
        </Typography>
      </div>
    </div>
  );
}
