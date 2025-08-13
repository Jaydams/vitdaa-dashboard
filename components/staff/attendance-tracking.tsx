"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface AttendanceStatus {
  staff: {
    id: string;
    name: string;
  };
  attendance: {
    is_clocked_in: boolean;
    clock_in_time?: string;
    clock_out_time?: string;
    status?: string;
    total_hours_worked?: number;
    overtime_hours?: number;
    current_session_duration_minutes: number;
    notes?: string;
  };
  shift?: {
    id: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    actual_start_time?: string;
    actual_end_time?: string;
    status: string;
    break_duration_minutes: number;
  };
}

interface AttendanceTrackingProps {
  staffId: string;
}

export function AttendanceTracking({ staffId }: AttendanceTrackingProps) {
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const response = await fetch(`/api/staff/${staffId}/attendance/status`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceStatus(data);
      } else {
        console.error("Failed to fetch attendance status");
      }
    } catch (error) {
      console.error("Error fetching attendance status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceStatus();
  }, [staffId]);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/staff/${staffId}/attendance/clock-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setNotes("");
        await fetchAttendanceStatus();
      } else {
        toast.error(data.error || "Failed to clock in");
      }
    } catch (error) {
      toast.error("Error clocking in");
      console.error("Error clocking in:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/staff/${staffId}/attendance/clock-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setNotes("");
        await fetchAttendanceStatus();
      } else {
        toast.error(data.error || "Failed to clock out");
      }
    } catch (error) {
      toast.error("Error clocking out");
      console.error("Error clocking out:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "present":
        return (
          <Badge variant="default" className="bg-green-500">
            Present
          </Badge>
        );
      case "late":
        return <Badge variant="destructive">Late</Badge>;
      case "early_departure":
        return <Badge variant="secondary">Early Departure</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attendanceStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Failed to load attendance status
          </p>
        </CardContent>
      </Card>
    );
  }

  const { staff, attendance, shift } = attendanceStatus;
  const isClockedIn = attendance.is_clocked_in;

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Staff Member</p>
              <p className="font-medium">{staff.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Time</p>
              <p className="font-medium">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {isClockedIn ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 font-medium">
                      Clocked In
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600 font-medium">
                      Clocked Out
                    </span>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Attendance Status</p>
              <div className="mt-1">
                {attendance.status ? getStatusBadge(attendance.status) : "N/A"}
              </div>
            </div>
          </div>

          {isClockedIn && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Active Session
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-600">Clock In Time</p>
                  <p className="font-medium">
                    {formatTime(attendance.clock_in_time)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600">Duration</p>
                  <p className="font-medium">
                    {formatDuration(
                      attendance.current_session_duration_minutes
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {attendance.total_hours_worked && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Hours Worked Today
                </p>
                <p className="font-medium">
                  {attendance.total_hours_worked.toFixed(2)}h
                </p>
              </div>
              {attendance.overtime_hours > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Overtime Hours
                  </p>
                  <p className="font-medium text-orange-600">
                    {attendance.overtime_hours.toFixed(2)}h
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Shift Card */}
      {shift && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Scheduled Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Start</p>
                <p className="font-medium">
                  {formatTime(shift.scheduled_start_time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled End</p>
                <p className="font-medium">
                  {formatTime(shift.scheduled_end_time)}
                </p>
              </div>
            </div>

            {(shift.actual_start_time || shift.actual_end_time) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Actual Start
                    </p>
                    <p className="font-medium">
                      {formatTime(shift.actual_start_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actual End</p>
                    <p className="font-medium">
                      {formatTime(shift.actual_end_time)}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shift Status</p>
                <Badge
                  variant={
                    shift.status === "completed" ? "default" : "secondary"
                  }
                >
                  {shift.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              {shift.break_duration_minutes > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Break Duration
                  </p>
                  <p className="font-medium">
                    {formatDuration(shift.break_duration_minutes)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clock In/Out Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Time Tracking Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this clock in/out..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            {!isClockedIn ? (
              <Button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? "Clocking In..." : "Clock In"}
              </Button>
            ) : (
              <Button
                onClick={handleClockOut}
                disabled={actionLoading}
                variant="destructive"
                className="flex-1"
              >
                {actionLoading ? "Clocking Out..." : "Clock Out"}
              </Button>
            )}
          </div>

          {attendance.notes && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Previous Notes
              </p>
              <p className="text-sm">{attendance.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
