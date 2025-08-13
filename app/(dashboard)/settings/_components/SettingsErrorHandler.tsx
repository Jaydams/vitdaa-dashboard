"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function SettingsErrorHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const success = searchParams.get("success");

    if (error) {
      let errorMessage = "An error occurred";

      switch (error) {
        case "admin-pin-setup-failed":
          errorMessage = "Failed to set admin PIN. Please try again.";
          break;
        case "admin-pin-update-failed":
          errorMessage = "Failed to update admin PIN. Please try again.";
          break;
        case "missing-admin-pin":
          errorMessage = "Please enter both admin PIN and confirmation.";
          break;
        case "admin-pin-mismatch":
          errorMessage = "Admin PINs don't match.";
          break;
        case "invalid-admin-pin-length":
          errorMessage = "Admin PIN must be between 4 and 8 digits.";
          break;
        case "server-error":
          errorMessage = "Server error occurred. Please try again.";
          break;
        default:
          try {
            errorMessage = decodeURIComponent(error);
          } catch {
            errorMessage = "An error occurred. Please try again.";
          }
      }

      toast.error(errorMessage);
    }

    if (success) {
      let successMessage = "";

      switch (success) {
        case "admin-pin-set":
          successMessage = "Admin PIN set successfully!";
          break;
        case "admin-pin-updated":
          successMessage = "Admin PIN updated successfully!";
          break;
        default:
          try {
            successMessage = decodeURIComponent(success);
          } catch {
            successMessage = success;
          }
      }

      if (successMessage) {
        toast.success(successMessage);
      }
    }
  }, [searchParams]);

  return null;
}
