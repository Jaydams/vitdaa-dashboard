"use client";

import { useTransition } from "react";
import { FaGithub } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/actions/auth-actions";

type AuthProvider = "github" | "google";

type Props = {
  authType?: "Login" | "Signup";
};

export default function AuthProviders({ authType = "Login" }: Props) {
  const [isPending, startTransition] = useTransition();

  // Handle Google OAuth authentication using server action
  const handleGoogleAuth = () => {
    startTransition(async () => {
      try {
        await signInWithGoogle();
        // If we reach here, there was no redirect (which shouldn't happen in normal flow)
        // The signInWithGoogle function should always redirect
      } catch (error) {
        console.error("Google OAuth error:", error);
        toast.error("Google authentication failed. Please try again.");
      }
    });
  };

  // Handle GitHub authentication (keeping original implementation for now)
  // Note: GitHub OAuth would need similar server action implementation
  const handleGitHubAuth = () => {
    toast.info(
      "GitHub authentication is not yet implemented for business owners."
    );
  };

  return (
    <div className="space-y-4 mb-10">
      <Button
        onClick={handleGitHubAuth}
        variant="secondary"
        className="w-full min-h-14"
        disabled={isPending}
      >
        <FaGithub className="mr-3 size-4" />
        {authType} With Github
      </Button>

      <Button
        onClick={handleGoogleAuth}
        variant="secondary"
        className="w-full min-h-14"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-3 size-4 animate-spin" />
        ) : (
          <FcGoogle className="mr-3 size-4" />
        )}
        {authType} With Google
      </Button>
    </div>
  );
}
