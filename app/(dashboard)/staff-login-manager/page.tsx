"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  QrCode,
  Share2,
  Clock,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { QRCode } from "@rtdui/qr-code";
import { useRealtimeShiftStatus } from "@/lib/hybrid-auth-realtime";
import { createClient } from "@/lib/supabase/client";

/**
 * Staff Login Manager Page
 * Admin page for managing shifts and sharing staff login links
 */
export default function StaffLoginManagerPage() {
  const [businessId, setBusinessId] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [staffLoginUrl, setStaffLoginUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get business info from session/auth
  useEffect(() => {
    const getCurrentBusiness = async () => {
      try {
        const supabase = createClient();
        
        // Get current user session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError("No authenticated user found. Please login first.");
          return;
        }

        // Get business owner record
        const { data: businessOwner, error: businessError } = await supabase
          .from("business_owner")
          .select("*")
          .eq("id", user.id)
          .single();

        if (businessError || !businessOwner) {
          setError("Business owner not found. Please login as a business owner.");
          return;
        }

        // Get session token from Supabase auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          setError("No valid session found. Please login again.");
          return;
        }

        setBusinessId(businessOwner.id);
        setSessionToken(session.access_token);

        // Generate staff login URL with business ID in URL (will be extracted and set as cookie)
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/staff-login?adminToken=${session.access_token}&businessId=${businessOwner.id}`;
        setStaffLoginUrl(url);
      } catch (err) {
        console.error("Error getting business info:", err);
        setError("Failed to load business information. Please login again.");
      }
    };

    getCurrentBusiness();
  }, []);

  // Use realtime hook for shift status
  const {
    shiftStatus,
    loading: checkingShift,
    error: realtimeError,
  } = useRealtimeShiftStatus(businessId);

  const handleStartShift = async () => {
    if (!sessionToken) {
      setError("No valid session found. Please login again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/hybrid/shifts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken,
          shiftName: "Staff Shift",
          maxStaffSessions: 50,
          autoEndHours: 8,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to start shift");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!shiftStatus?.shift?.id || !sessionToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/hybrid/shifts/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shiftId: shiftStatus.shift.id,
          sessionToken,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to end shift");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleShareSMS = () => {
    const message = encodeURIComponent(`Staff Login Link: ${staffLoginUrl}`);
    window.open(`sms:?body=${message}`, "_blank");
  };

  const handleOpenInNewTab = () => {
    window.open(staffLoginUrl, "_blank");
  };

  if (!businessId || !sessionToken) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || "Loading session information..."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Login Manager</h1>
          <p className="text-gray-600">
            Manage shifts and share login links with your staff
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Shift Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {checkingShift ? (
                <Badge variant="outline">Checking...</Badge>
              ) : shiftStatus?.is_active ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="default" className="bg-green-500">
                    {shiftStatus.shift?.shift_name} Active
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {shiftStatus.active_staff_count}/
                    {shiftStatus.max_staff_allowed} staff logged in
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <Badge variant="secondary">No Active Shift</Badge>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {shiftStatus?.is_active ? (
                <Button
                  onClick={handleEndShift}
                  variant="destructive"
                  disabled={loading}
                >
                  <Square className="h-4 w-4 mr-2" />
                  End Shift
                </Button>
              ) : (
                <Button onClick={handleStartShift} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Shift
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Login Sharing - Only show when shift is active */}
      {shiftStatus?.is_active && (
        <Tabs defaultValue="qr-code" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="qr-code">QR Code</TabsTrigger>
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          <TabsContent value="qr-code">
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
                <Button onClick={handleOpenInNewTab} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Login Page
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="link">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share Login Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs font-mono break-all text-gray-700">
                    {staffLoginUrl}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button onClick={handleCopyUrl} variant="outline" size="sm">
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleShareWhatsApp}
                    variant="outline"
                    size="sm"
                    className="bg-green-50 hover:bg-green-100"
                  >
                    WhatsApp
                  </Button>

                  <Button
                    onClick={handleShareSMS}
                    variant="outline"
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100"
                  >
                    SMS
                  </Button>

                  <Button
                    onClick={handleOpenInNewTab}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructions">
            <Card>
              <CardHeader>
                <CardTitle>How to Share with Staff</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Start Your Shift</h4>
                      <p className="text-sm text-gray-600">
                        Make sure you have an active shift running before
                        sharing the link.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Share the QR Code or Link</h4>
                      <p className="text-sm text-gray-600">
                        Use WhatsApp, SMS, or show the QR code for staff to
                        scan.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Staff Login</h4>
                      <p className="text-sm text-gray-600">
                        Staff enter their Staff ID and PIN to access their
                        dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium">Monitor Sessions</h4>
                      <p className="text-sm text-gray-600">
                        Track active staff sessions and end the shift when done.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Security Notes:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Staff can only login while your shift is active</li>
                    <li>
                      • Each staff member needs their unique Staff ID and PIN
                    </li>
                    <li>
                      • All sessions end automatically when you end the shift
                    </li>
                    <li>
                      • Maximum {shiftStatus?.max_staff_allowed || 50} staff can
                      be logged in simultaneously
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Current Staff Sessions */}
      {shiftStatus?.is_active && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Staff Sessions ({shiftStatus.active_staff_count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shiftStatus.active_staff_count === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No staff currently logged in
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                {shiftStatus.active_staff_count} staff members are currently
                logged in and working.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
