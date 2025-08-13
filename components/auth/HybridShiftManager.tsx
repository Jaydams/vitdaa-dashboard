"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Play,
  Square,
  Users,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  UserX,
} from "lucide-react";

interface HybridShiftManagerProps {
  adminSessionToken: string;
  businessId: string;
  businessName?: string;
  onShiftChange?: (shiftStatus: any) => void;
}

interface ShiftStatus {
  is_active: boolean;
  shift?: {
    id: string;
    shift_name: string;
    started_at: string;
    max_staff_sessions: number;
    auto_end_time?: string;
  };
  active_staff_count: number;
  max_staff_allowed: number;
}

interface ActiveSession {
  id: string;
  staff_name: string;
  staff_role: string;
  shift_name: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  ip_address?: string;
}

export default function HybridShiftManager({
  adminSessionToken,
  businessId,
  businessName,
  onShiftChange,
}: HybridShiftManagerProps) {
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  // Start shift form state
  const [shiftName, setShiftName] = useState("");
  const [maxStaff, setMaxStaff] = useState("50");
  const [autoEndHours, setAutoEndHours] = useState("");

  useEffect(() => {
    fetchShiftStatus();
    fetchActiveSessions();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchShiftStatus();
      fetchActiveSessions();
    }, 30000);

    return () => clearInterval(interval);
  }, [businessId, adminSessionToken]);

  const fetchShiftStatus = async () => {
    try {
      const response = await fetch(
        `/api/auth/hybrid/shifts/status?businessId=${businessId}`
      );
      const data = await response.json();

      if (data.success) {
        setShiftStatus(data.shift_status);
        onShiftChange?.(data.shift_status);
      }
    } catch (err) {
      console.error("Error fetching shift status:", err);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch(
        `/api/auth/hybrid/sessions/active?sessionToken=${adminSessionToken}&businessId=${businessId}`
      );
      const data = await response.json();

      if (data.success) {
        setActiveSessions(data.sessions.staff_sessions || []);
      }
    } catch (err) {
      console.error("Error fetching active sessions:", err);
    }
  };

  const handleStartShift = async () => {
    if (!shiftName.trim()) {
      setError("Shift name is required");
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
          sessionToken: adminSessionToken,
          shiftName: shiftName.trim(),
          maxStaffSessions: parseInt(maxStaff),
          autoEndHours: autoEndHours ? parseInt(autoEndHours) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start shift");
      }

      if (data.success) {
        setShowStartDialog(false);
        setShiftName("");
        setAutoEndHours("");
        await fetchShiftStatus();
        await fetchActiveSessions();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start shift";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/hybrid/shifts/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken: adminSessionToken,
          shiftId: shiftStatus?.shift?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to end shift");
      }

      if (data.success) {
        setShowEndDialog(false);
        await fetchShiftStatus();
        await fetchActiveSessions();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to end shift";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForceEndSession = async (sessionId: string) => {
    try {
      // This would require an additional API endpoint for force ending sessions
      console.log("Force ending session:", sessionId);
      // Refresh sessions after action
      await fetchActiveSessions();
    } catch (err) {
      console.error("Error force ending session:", err);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shift Management</h2>
          <p className="text-gray-600">
            Control staff access through shift management
          </p>
        </div>
        <Button
          onClick={() => {
            fetchShiftStatus();
            fetchActiveSessions();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Shift Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Shift Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant={shiftStatus?.is_active ? "default" : "secondary"}
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
              {shiftStatus?.is_active && shiftStatus.shift && (
                <span className="font-medium">
                  {shiftStatus.shift.shift_name}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {!shiftStatus?.is_active ? (
                <Dialog
                  open={showStartDialog}
                  onOpenChange={setShowStartDialog}
                >
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Start Shift
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start New Shift</DialogTitle>
                      <DialogDescription>
                        Configure and start a new shift to enable staff access.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="shiftName">Shift Name</Label>
                        <Input
                          id="shiftName"
                          value={shiftName}
                          onChange={(e) => setShiftName(e.target.value)}
                          placeholder="e.g., Morning Shift, Evening Service"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxStaff">Maximum Staff Sessions</Label>
                        <Select value={maxStaff} onValueChange={setMaxStaff}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 staff</SelectItem>
                            <SelectItem value="25">25 staff</SelectItem>
                            <SelectItem value="50">50 staff</SelectItem>
                            <SelectItem value="100">100 staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="autoEnd">
                          Auto-end after (hours, optional)
                        </Label>
                        <Input
                          id="autoEnd"
                          type="number"
                          value={autoEndHours}
                          onChange={(e) => setAutoEndHours(e.target.value)}
                          placeholder="8"
                          min="1"
                          max="24"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleStartShift}
                        disabled={loading || !shiftName.trim()}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Start Shift
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Square className="h-4 w-4" />
                      End Shift
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>End Current Shift</DialogTitle>
                      <DialogDescription>
                        This will end the current shift and automatically log
                        out all staff members. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowEndDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleEndShift}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Ending...
                          </>
                        ) : (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            End Shift
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {shiftStatus?.is_active && shiftStatus.shift && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {formatDuration(shiftStatus.shift.started_at)}
                </div>
                <div className="text-sm text-green-600">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {shiftStatus.active_staff_count}
                </div>
                <div className="text-sm text-green-600">Staff Online</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {shiftStatus.max_staff_allowed -
                    shiftStatus.active_staff_count}
                </div>
                <div className="text-sm text-green-600">Available Slots</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Staff Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Staff Sessions ({activeSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No staff currently logged in</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{session.staff_name}</div>
                        <div className="text-sm text-gray-600">
                          {session.staff_role}
                        </div>
                      </div>
                      <Badge variant="outline">{session.shift_name}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Logged in: {formatTime(session.created_at)} • Last active:{" "}
                      {formatTime(session.last_activity)} • Expires:{" "}
                      {formatTime(session.expires_at)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleForceEndSession(session.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
