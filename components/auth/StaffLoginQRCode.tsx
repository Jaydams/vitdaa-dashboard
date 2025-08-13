"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  QrCode,
  Copy,
  CheckCircle,
  Users,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { QRCode } from "@rtdui/qr-code";

interface StaffLoginQRCodeProps {
  businessId: string;
  adminSessionToken: string;
  shiftInfo?: {
    shift_name: string;
    active_staff_count: number;
    max_staff_sessions: number;
    started_at: string;
  };
}

/**
 * QR Code component for staff to scan and login
 * Generates a QR code with the staff login URL including admin session token
 */
export default function StaffLoginQRCode({
  businessId,
  adminSessionToken,
  shiftInfo,
}: StaffLoginQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [staffLoginUrl, setStaffLoginUrl] = useState("");

  useEffect(() => {
    // Create staff login URL with admin session token
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/staff/login?businessId=${businessId}&adminToken=${adminSessionToken}`;
    setStaffLoginUrl(url);
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

  const handleOpenInNewTab = () => {
    window.open(staffLoginUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Shift Status */}
      {shiftInfo && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>{shiftInfo.shift_name}</strong> is active
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span className="text-xs">
                  {shiftInfo.active_staff_count}/{shiftInfo.max_staff_sessions}{" "}
                  staff
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Staff Login QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <QRCode value={staffLoginUrl} size={200} />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Staff can scan this QR code to access the login page
            </p>
          </CardContent>
        </Card>

        {/* Login URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Staff Login Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-xs font-mono break-all text-gray-700">
                {staffLoginUrl}
              </p>
            </div>

            <div className="flex gap-2">
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

              <Button
                onClick={handleOpenInNewTab}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                📱 <strong>For mobile:</strong> Share this link via WhatsApp,
                SMS, or email
              </p>
              <p>
                🖥️ <strong>For tablets/computers:</strong> Staff can type the
                URL or scan the QR code
              </p>
              <p>
                ⏰ <strong>Valid:</strong> Only while the current shift is
                active
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 space-y-2">
            <h4 className="font-medium text-gray-900">How it works:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Staff scan the QR code or visit the link</li>
              <li>They enter their Staff ID and PIN</li>
              <li>System verifies they can login during active shift</li>
              <li>They're redirected to their role-based dashboard</li>
            </ol>
            <div className="mt-3 p-2 bg-blue-50 rounded text-blue-700">
              <strong>Security:</strong> Staff can only login while your shift
              is active. When you end the shift, all staff sessions are
              automatically terminated.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
