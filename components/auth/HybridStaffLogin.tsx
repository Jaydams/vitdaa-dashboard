"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  KeyRound,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
} from "lucide-react";

interface HybridStaffLoginProps {
  businessId: string;
  businessName?: string;
  onLoginSuccess: (sessionData: any) => void;
  onError?: (error: string) => void;
}

interface ShiftStatus {
  is_active: boolean;
  shift?: {
    id: string;
    shift_name: string;
    started_at: string;
    max_staff_sessions: number;
  };
  active_staff_count: number;
  max_staff_allowed: number;
}

export default function HybridStaffLogin({
  businessId,
  businessName,
  onLoginSuccess,
  onError,
}: HybridStaffLoginProps) {
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [checkingShift, setCheckingShift] = useState(true);

  // Check shift status on component mount and periodically
  useEffect(() => {
    checkShiftStatus();
    const interval = setInterval(checkShiftStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [businessId]);

  const checkShiftStatus = async () => {
    try {
      const response = await fetch(
        `/api/auth/hybrid/shifts/status?businessId=${businessId}`
      );
      const data = await response.json();

      if (data.success) {
        setShiftStatus(data.shift_status);
      }
    } catch (err) {
      console.error("Error checking shift status:", err);
    } finally {
      setCheckingShift(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
    if (value.length <= 6) {
      setPin(value);
      if (error) setError(null);
    }
  };

  const handleStaffIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStaffId(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffId || !pin) {
      setError("Please enter both Staff ID and PIN");
      return;
    }

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    if (!shiftStatus?.is_active) {
      setError("No active shift. Please contact your manager.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/hybrid/staff/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId,
          pin,
          businessId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.success) {
        // Store session data in localStorage
        localStorage.setItem(
          "hybrid_staff_session",
          JSON.stringify({
            token: data.session.token,
            staff_id: data.session.staff_id,
            business_id: data.session.business_id,
            shift_id: data.session.shift_id,
            expires_at: data.session.expires_at,
          })
        );

        onLoginSuccess(data);
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit(e as any);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (checkingShift) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Checking shift status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Staff Login
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Enter your PIN to access the system
            </p>
          </div>
          {businessName && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <Users className="h-4 w-4" />
              <span>{businessName}</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Shift Status Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Shift Status
              </span>
              <Badge
                variant={shiftStatus?.is_active ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {shiftStatus?.is_active ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Inactive
                  </>
                )}
              </Badge>
            </div>

            {shiftStatus?.is_active && shiftStatus.shift && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-green-800">
                    {shiftStatus.shift.shift_name}
                  </span>
                  <div className="flex items-center gap-1 text-green-600">
                    <Clock className="h-3 w-3" />
                    <span>
                      Started {formatTime(shiftStatus.shift.started_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-green-700">
                  <span>
                    Staff Online: {shiftStatus.active_staff_count}/
                    {shiftStatus.max_staff_allowed}
                  </span>
                  <span>
                    {shiftStatus.max_staff_allowed -
                      shiftStatus.active_staff_count}{" "}
                    slots available
                  </span>
                </div>
              </div>
            )}

            {!shiftStatus?.is_active && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    No active shift. Contact your manager to start a shift.
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staffId" className="text-sm font-medium">
                Staff ID
              </Label>
              <Input
                id="staffId"
                type="text"
                value={staffId}
                onChange={handleStaffIdChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter your staff ID"
                disabled={loading || !shiftStatus?.is_active}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin" className="text-sm font-medium">
                PIN Code
              </Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={handlePinChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter your 4-6 digit PIN"
                maxLength={6}
                disabled={loading || !shiftStatus?.is_active}
                required
                className="text-center text-lg tracking-widest"
              />
              <div className="text-xs text-gray-500 text-center">
                {pin.length}/6 digits
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !shiftStatus?.is_active || pin.length < 4}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <div className="text-xs text-gray-500">
              Secure PIN-based authentication
            </div>
            <div className="text-xs text-gray-400">
              Your session is linked to the current shift
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
