"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ElevatedAccessGuard from "./ElevatedAccessGuard";
import { useAdminSession } from "@/hooks/useAdminSession";

interface AdminPINDemoProps {
  businessOwnerId: string;
}

export default function AdminPINDemo({ businessOwnerId }: AdminPINDemoProps) {
  const { isElevated, timeRemaining, clearElevation } = useAdminSession();
  const [showSensitiveAction, setShowSensitiveAction] = useState(false);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const SensitiveContent = () => (
    <Card>
      <CardHeader>
        <CardTitle>Sensitive Administrative Action</CardTitle>
        <CardDescription>
          This content is only visible with elevated admin privileges.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-green-600 font-medium">
            ✓ Admin PIN verified successfully
          </p>

          {isElevated && (
            <p className="text-sm text-gray-600">
              Elevated session expires in: {formatTime(timeRemaining)}
            </p>
          )}

          <div className="space-y-2">
            <Button variant="destructive" size="sm">
              Delete All Staff Data
            </Button>
            <Button variant="outline" size="sm">
              Export Financial Reports
            </Button>
            <Button variant="outline" size="sm">
              Modify System Settings
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={clearElevation}>
            End Elevated Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin PIN System Demo</CardTitle>
          <CardDescription>
            This demonstrates the admin PIN verification system for elevated
            access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Current Status:</span>
              <span
                className={`text-sm px-2 py-1 rounded ${
                  isElevated
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isElevated ? "Elevated Access Active" : "Standard Access"}
              </span>
            </div>

            {isElevated && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Time Remaining:</span>
                <span className="text-sm text-orange-600">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}

            <Button
              onClick={() => setShowSensitiveAction(!showSensitiveAction)}
              variant={showSensitiveAction ? "outline" : "default"}
            >
              {showSensitiveAction ? "Hide" : "Show"} Sensitive Action
            </Button>
          </div>
        </CardContent>
      </Card>

      {showSensitiveAction && (
        <ElevatedAccessGuard
          businessOwnerId={businessOwnerId}
          title="Admin Verification Required"
          description="This action requires admin privileges. Please enter your admin PIN to continue."
          onAccessGranted={() => console.log("Access granted")}
          onAccessDenied={() => console.log("Access denied")}
        >
          <SensitiveContent />
        </ElevatedAccessGuard>
      )}
    </div>
  );
}
