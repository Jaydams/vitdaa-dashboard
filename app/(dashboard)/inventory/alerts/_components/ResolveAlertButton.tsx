"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { resolveInventoryAlert } from "@/data/inventory";
import { useState } from "react";

interface ResolveAlertButtonProps {
  alertId: string;
  userId: string;
}

export function ResolveAlertButton({ alertId, userId }: ResolveAlertButtonProps) {
  const [isResolving, setIsResolving] = useState(false);

  const handleResolveAlert = async () => {
    setIsResolving(true);
    try {
      const result = await resolveInventoryAlert(alertId, userId);
      if (result.success) {
        // Refresh the page to show updated alerts
        window.location.reload();
      } else {
        console.error("Failed to resolve alert:", result.error);
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResolveAlert}
      disabled={isResolving}
    >
      <CheckCircle className="mr-2 h-4 w-4" />
      {isResolving ? "Resolving..." : "Resolve"}
    </Button>
  );
}
