"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Smartphone,
  Monitor,
  Clock,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { SessionConflict } from "@/lib/session-manager";
import { toast } from "sonner";

interface SessionConflictDialogProps {
  conflict: SessionConflict | null;
  isOpen: boolean;
  onResolve: (resolution: "takeover" | "merge" | "cancel") => void;
  onClose: () => void;
}

export function SessionConflictDialog({
  conflict,
  isOpen,
  onResolve,
  onClose,
}: SessionConflictDialogProps) {
  const [isResolving, setIsResolving] = useState(false);

  if (!conflict) return null;

  const handleResolve = async (resolution: "takeover" | "merge" | "cancel") => {
    setIsResolving(true);
    try {
      await onResolve(resolution);
      toast.success(`Session conflict resolved: ${resolution}`);
      onClose();
    } catch (error) {
      toast.error("Failed to resolve session conflict");
    } finally {
      setIsResolving(false);
    }
  };

  const getConflictIcon = () => {
    switch (conflict.conflictType) {
      case "device_switch":
        return <Smartphone className="h-5 w-5 text-blue-600" />;
      case "concurrent_login":
        return <Monitor className="h-5 w-5 text-orange-600" />;
      case "expired_session":
        return <Clock className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getConflictTitle = () => {
    switch (conflict.conflictType) {
      case "device_switch":
        return "Device Switch Detected";
      case "concurrent_login":
        return "Concurrent Login Detected";
      case "expired_session":
        return "Session Expired";
      default:
        return "Session Conflict";
    }
  };

  const getConflictDescription = () => {
    switch (conflict.conflictType) {
      case "device_switch":
        return "You're trying to log in from a different device. Choose how to handle your existing session.";
      case "concurrent_login":
        return "You're already logged in from another location. Choose how to proceed.";
      case "expired_session":
        return "Your previous session has expired. Choose how to handle any unsaved work.";
      default:
        return "A session conflict has been detected. Please choose how to resolve it.";
    }
  };

  const formatDeviceInfo = (deviceId: string) => {
    if (deviceId.includes("mobile")) return "Mobile Device";
    if (deviceId.includes("tablet")) return "Tablet";
    return "Desktop/Laptop";
  };

  const formatSessionTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getConflictIcon()}
            {getConflictTitle()}
          </DialogTitle>
          <DialogDescription>{getConflictDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Session Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Current Session
                </h4>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  Active
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Device</p>
                  <p className="font-medium">
                    {formatDeviceInfo(conflict.currentSession.deviceId)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Role</p>
                  <p className="font-medium capitalize">
                    {conflict.currentSession.role}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Last Activity</p>
                  <p className="font-medium">
                    {formatSessionTime(conflict.currentSession.lastActivity)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Expires</p>
                  <p className="font-medium">
                    {formatSessionTime(conflict.currentSession.expiresAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conflicting Session Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Conflicting Session
                </h4>
                <Badge
                  variant="outline"
                  className="bg-orange-50 text-orange-700 border-orange-200"
                >
                  Conflict
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Device</p>
                  <p className="font-medium">
                    {formatDeviceInfo(conflict.conflictingSession.deviceId)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Role</p>
                  <p className="font-medium capitalize">
                    {conflict.conflictingSession.role}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Last Activity</p>
                  <p className="font-medium">
                    {formatSessionTime(
                      conflict.conflictingSession.lastActivity
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Expires</p>
                  <p className="font-medium">
                    {formatSessionTime(conflict.conflictingSession.expiresAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work in Progress Warning */}
          {(conflict.currentSession.workInProgress ||
            conflict.conflictingSession.workInProgress) && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">
                      Unsaved Work Detected
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      One or both sessions have unsaved work. Choose carefully
                      to avoid losing data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {/* Takeover Option */}
            <Button
              onClick={() => handleResolve("takeover")}
              disabled={isResolving}
              className="flex-1 justify-start h-auto p-3"
              variant="default"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium">Take Over</p>
                  <p className="text-xs opacity-90">
                    End the other session and continue here
                  </p>
                </div>
              </div>
            </Button>

            {/* Merge Option (if applicable) */}
            {conflict.conflictType !== "expired_session" && (
              <Button
                onClick={() => handleResolve("merge")}
                disabled={isResolving}
                className="flex-1 justify-start h-auto p-3"
                variant="outline"
              >
                <div className="flex items-start gap-3">
                  <Monitor className="h-5 w-5 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium">Merge Sessions</p>
                    <p className="text-xs text-gray-600">
                      Combine work from both sessions
                    </p>
                  </div>
                </div>
              </Button>
            )}

            {/* Cancel Option */}
            <Button
              onClick={() => handleResolve("cancel")}
              disabled={isResolving}
              className="flex-1 justify-start h-auto p-3"
              variant="outline"
            >
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium">Cancel</p>
                  <p className="text-xs text-gray-600">
                    Keep existing session active
                  </p>
                </div>
              </div>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing session conflicts
 */
export function useSessionConflictDialog() {
  const [conflict, setConflict] = useState<SessionConflict | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showConflict = (conflictData: SessionConflict) => {
    setConflict(conflictData);
    setIsOpen(true);
  };

  const hideConflict = () => {
    setIsOpen(false);
    setConflict(null);
  };

  return {
    conflict,
    isOpen,
    showConflict,
    hideConflict,
  };
}
