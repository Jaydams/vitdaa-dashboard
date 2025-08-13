"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Copy,
  Share2,
  ExternalLink,
  CheckCircle,
  Users,
} from "lucide-react";
import { QRCode } from "@rtdui/qr-code";

interface StaffLoginShareCardProps {
  businessId: string;
  adminSessionToken: string;
  shiftStatus?: {
    is_active: boolean;
    shift?: {
      shift_name: string;
      started_at: string;
    };
    active_staff_count: number;
    max_staff_allowed: number;
  };
}

/**
 * Compact component to add to existing admin dashboards
 * Shows QR code and sharing options when shift is active
 */
export default function StaffLoginShareCard({
  businessId,
  adminSessionToken,
  shiftStatus,
}: StaffLoginShareCardProps) {
  const [staffLoginUrl, setStaffLoginUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (businessId && adminSessionToken) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/staff/login?businessId=${businessId}&adminToken=${adminSessionToken}`;
      setStaffLoginUrl(url);
    }
  }, [businessId, adminSessionToken]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(staffLoginUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`Staff Login Link: ${staffLoginUrl}`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  if (!shiftStatus?.is_active) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">
            <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start a shift to enable staff login</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Staff Login
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shift Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">
              {shiftStatus.shift?.shift_name || "Active"}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="h-3 w-3" />
            <span>
              {shiftStatus.active_staff_count}/{shiftStatus.max_staff_allowed}
            </span>
          </div>
        </div>

        {/* QR Code Toggle */}
        <div className="flex gap-2">
          <Button
            onClick={() => setShowQR(!showQR)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <QrCode className="h-4 w-4 mr-2" />
            {showQR ? "Hide QR" : "Show QR"}
          </Button>

          <Button
            onClick={handleCopyUrl}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        {/* QR Code */}
        {showQR && (
          <div className="flex flex-col items-center space-y-3 pt-2">
            <div className="bg-white p-3 rounded-lg border">
              <QRCode
                value={staffLoginUrl}
                size={150}
                level="M"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-gray-600 text-center">
              Staff scan to login
            </p>
          </div>
        )}

        {/* Quick Share Options */}
        <div className="flex gap-2">
          <Button
            onClick={handleShareWhatsApp}
            variant="outline"
            size="sm"
            className="flex-1 bg-green-50 hover:bg-green-100"
          >
            WhatsApp
          </Button>

          <Button
            onClick={() => window.open(staffLoginUrl, "_blank")}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Test
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Link expires when shift ends
        </div>
      </CardContent>
    </Card>
  );
}
