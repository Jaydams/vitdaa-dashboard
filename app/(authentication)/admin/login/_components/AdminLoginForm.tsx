"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Shield } from "lucide-react";

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

const adminLoginSchema = z.object({
  credential: z.string().min(1, "Admin PIN or password is required"),
  usePassword: z.boolean().optional(),
});

type FormData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginForm() {
  const [isPending, startTransition] = useTransition();
  const [usePassword, setUsePassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<FormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      credential: "",
      usePassword: false,
    },
  });

  // Handle error messages from URL search params
  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    if (error) {
      let errorMessage = "Authentication failed. Please try again.";

      switch (error) {
        case "missing-admin-pin":
          errorMessage = "Please enter your admin PIN.";
          break;
        case "invalid-admin-pin":
          errorMessage = "Invalid admin PIN. Please try again.";
          break;
        case "admin-pin-not-set":
          errorMessage =
            "Admin PIN not set. Please use your login password instead.";
          break;
        case "admin-pin-locked":
          errorMessage = "Admin PIN is locked due to too many failed attempts.";
          break;
        case "server-error":
          errorMessage = "Server error occurred. Please try again later.";
          break;
        default:
          try {
            errorMessage = decodeURIComponent(error);
          } catch {
            errorMessage = "Authentication failed. Please try again.";
          }
      }

      toast.error(errorMessage);
    }

    if (message) {
      toast.success(decodeURIComponent(message));
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Don't prevent default - let the form submit naturally
    // This will allow the server redirect to work properly

    // Clear any existing URL parameters
    if (searchParams.get("error") || searchParams.get("message")) {
      router.replace("/admin/login", { scroll: false });
    }

    // Add the usePassword field to the form
    const form = e.currentTarget;
    const usePasswordInput = form.querySelector(
      'input[name="usePassword"]'
    ) as HTMLInputElement;
    if (usePasswordInput) {
      usePasswordInput.value = usePassword.toString();
    } else {
      // Create hidden input for usePassword
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = "usePassword";
      hiddenInput.value = usePassword.toString();
      form.appendChild(hiddenInput);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center mb-6">
        <Shield className="h-8 w-8 text-primary mr-2" />
        <Typography variant="h2">Admin Access</Typography>
      </div>

      <Typography
        variant="p"
        className="text-center text-muted-foreground mb-8"
      >
        Enter your admin {usePassword ? "password" : "PIN"} to switch back to
        admin mode
      </Typography>

      <Form {...form}>
        <form
          action="/api/admin/authenticate"
          method="POST"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="credential"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin {usePassword ? "Password" : "PIN"}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={`Enter your admin ${
                      usePassword ? "password" : "PIN"
                    }`}
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setUsePassword(!usePassword)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              {usePassword
                ? "Use Admin PIN instead"
                : "Use login password instead"}
            </button>
          </div>

          <Button
            disabled={isPending}
            type="submit"
            className="w-full"
            size="lg"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Switch to Admin Mode
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center">
        <Typography variant="p" className="text-sm text-muted-foreground">
          Continue as staff member?
        </Typography>
        <Typography variant="a" href="/staffs" className="block mt-2 text-sm">
          Back to Staff Dashboard
        </Typography>
      </div>
    </div>
  );
}
