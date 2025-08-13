"use client";

import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";

import { loginFields } from "./fields";
import { loginFormSchema } from "./schema";
import AuthProviders from "@/components/shared/AuthProviders";
import { login } from "@/actions/auth-actions";

type FormData = z.infer<typeof loginFormSchema>;

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<FormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle error messages from URL search params
  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    if (error) {
      let errorMessage = "Login failed. Please try again.";

      switch (error) {
        case "missing-credentials":
          errorMessage = "Please enter both email and password.";
          break;
        case "authentication-failed":
          errorMessage = "Invalid email or password.";
          break;
        case "unauthorized-access":
          errorMessage = "This account is not authorized for business access.";
          break;
        case "server-error":
          errorMessage = "Server error occurred. Please try again later.";
          break;
        case "oauth-failed":
          errorMessage = "OAuth authentication failed. Please try again.";
          break;
        case "oauth-url-missing":
          errorMessage = "OAuth configuration error. Please contact support.";
          break;
        case "signout-error":
          errorMessage = "Error occurred during sign out.";
          break;
        default:
          // For other errors, try to decode the error message
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

    // Clear any existing URL parameters to avoid showing stale error messages
    if (searchParams.get("error") || searchParams.get("message")) {
      router.replace("/login", { scroll: false });
    }

    startTransition(async () => {
      try {
        await login(new FormData(e.currentTarget));
        // If we reach here, there was no redirect (which shouldn't happen in normal flow)
        // The login function should always redirect on success or failure
      } catch (error) {
        console.error("Login error:", error);
        // Handle any client-side errors that weren't caught by the server action
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="w-full">
      <Typography variant="h2" className="mb-8">
        Login
      </Typography>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {loginFields.map((formField) => (
            <FormField
              key={`form-field-${formField.name}`}
              control={form.control}
              name={formField.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{formField.label}</FormLabel>
                  <FormControl>
                    <Input
                      type={formField.inputType}
                      placeholder={formField.placeholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <Button
            disabled={isPending}
            type="submit"
            className="w-full"
            size="lg"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
        </form>
      </Form>

      <Separator className="my-12" />

      <AuthProviders />

      <div className="flex flex-wrap justify-between gap-4 w-full">
        <Typography variant="a" href="/forgot-password" className="md:!text-sm">
          Forgot password?
        </Typography>
        <Typography variant="a" href="/signup" className="md:!text-sm">
          Create an account
        </Typography>
      </div>
    </div>
  );
}
