"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Copy, Eye, EyeOff, Shield, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function StaffPinSuccessHandler() {
  const searchParams = useSearchParams();
  const [showPin, setShowPin] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const message = searchParams.get("message");
  const pin = searchParams.get("pin");
  const staffName = searchParams.get("name");
  const role = searchParams.get("role");

  useEffect(() => {
    if (
      success &&
      (success === "staff-created" ||
        success === "pin-retrieved" ||
        success === "pin-changed")
    ) {
      setIsVisible(true);

      // Auto-hide after 30 seconds for security
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 30000);

      return () => clearTimeout(timer);
    } else if (error === "admin-pin-required" && message) {
      // Show admin PIN required error with action
      const errorMessage = decodeURIComponent(message);
      toast.error(errorMessage, {
        duration: 10000,
        action: {
          label: "Go to Settings",
          onClick: () => (window.location.href = "/settings"),
        },
      });
    }
  }, [success, error, message]);

  const copyToClipboard = async () => {
    if (pin) {
      try {
        await navigator.clipboard.writeText(pin);
        toast.success("PIN copied to clipboard");
      } catch (error) {
        console.log("Failed to copy pin =>", error);
        toast.error("Failed to copy PIN");
      }
    }
  };

  const getSuccessMessage = () => {
    switch (success) {
      case "staff-created":
        return {
          title: "Staff Member Created Successfully",
          description:
            "The staff member has been created with the following PIN. Please share this PIN securely with the staff member.",
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "pin-retrieved":
        return {
          title: "New PIN Generated",
          description:
            "A new PIN has been generated for the staff member. Please share this PIN securely with them.",
          icon: Shield,
          color: "text-blue-600",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case "pin-changed":
        return {
          title: "PIN Changed Successfully",
          description: "The staff member's PIN has been updated successfully.",
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800",
        };
      default:
        return null;
    }
  };

  if (!isVisible || !success) {
    return null;
  }

  const messageInfo = getSuccessMessage();
  if (!messageInfo) {
    return null;
  }

  const IconComponent = messageInfo.icon;

  return (
    <Card className={`border-2 ${messageInfo.borderColor} ${messageInfo.bgColor} shadow-lg`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${messageInfo.bgColor}`}>
              <IconComponent className={`h-5 w-5 ${messageInfo.color}`} />
            </div>
            <div>
              <CardTitle className={`text-lg font-semibold ${messageInfo.color.replace('text-', 'text-').replace('-600', '-800 dark:text-').replace('-600', '-200')}`}>
                {messageInfo.title}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {messageInfo.description}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Staff Information */}
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {staffName?.charAt(0) || "S"}
            </span>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {staffName || "Staff Member"}
            </div>
            {role && (
              <Badge variant="secondary" className="text-xs mt-1">
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        {/* PIN Display (only for staff-created and pin-retrieved) */}
        {pin &&
          (success === "staff-created" || success === "pin-retrieved") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Security PIN:</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <code className="block px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-xl font-mono tracking-wider text-center font-bold">
                    {showPin ? pin : "••••"}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPin(!showPin)}
                    className="h-10 w-10"
                  >
                    {showPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="h-10 w-10"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Important:</strong> This PIN will only be shown once. Please save it securely and share it with the staff member.
                </p>
              </div>
            </div>
          )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setIsVisible(false)}
            className="flex-1"
          >
            Dismiss
          </Button>
          {pin && (
            <Button 
              variant="default" 
              onClick={copyToClipboard}
              className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy PIN
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
