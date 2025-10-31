"use client";

import { useState, useEffect, useRef } from "react";
import { RotateCcw, Edit3, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Removed Tooltip to fix aria-hidden focus conflicts
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getStaffPin, changeStaffPin } from "@/actions/auth-actions";
import { StaffWithSession } from "@/data/staff";

interface StaffPinManagementProps {
  staff: StaffWithSession;
}

export default function StaffPinManagement({ staff }: StaffPinManagementProps) {
  const [isRetrievePinOpen, setIsRetrievePinOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Focus the PIN input when the dialog opens and prevent body scroll
  useEffect(() => {
    if (isChangePinOpen) {
      // Prevent body scroll
      document.body.style.overflow = "hidden";

      // Focus the input after modal renders
      const focusInput = () => {
        if (pinInputRef.current) {
          pinInputRef.current.focus();
          pinInputRef.current.select();
        }
      };

      // Try multiple times with different delays
      focusInput(); // Immediate
      const timer1 = setTimeout(focusInput, 100);
      const timer2 = setTimeout(focusInput, 300);
      const timer3 = setTimeout(focusInput, 500);

      return () => {
        // Restore body scroll
        document.body.style.overflow = "unset";
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isChangePinOpen]);

  const handleRetrievePin = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("staffId", staff.id);
      await getStaffPin(formData);
    } catch (error) {
      console.error("Error retrieving PIN:", error);
    } finally {
      setIsLoading(false);
      setIsRetrievePinOpen(false);
    }
  };

  const handleChangePin = async () => {
    if (!newPin || !/^\d{4,8}$/.test(newPin)) {
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("staffId", staff.id);
      formData.append("newPin", newPin);
      await changeStaffPin(formData);
    } catch (error) {
      console.error("Error changing PIN:", error);
    } finally {
      setIsLoading(false);
      setIsChangePinOpen(false);
      setNewPin("");
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* View Staff Info */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            title="View Staff Info"
          >
            <Info className="size-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader className="pb-6">
            <DialogTitle>Staff Information</DialogTitle>
            <DialogDescription>
              Detailed information for this staff member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Name
                </Label>
                <p className="text-sm mt-1">
                  {staff.first_name} {staff.last_name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Role
                </Label>
                <Badge variant="outline" className="mt-1">
                  {staff.role}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Email
                </Label>
                <p className="text-sm mt-1">{staff.email || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Phone
                </Label>
                <p className="text-sm mt-1">
                  {staff.phone_number || "Not provided"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Status
                </Label>
                <Badge
                  variant={staff.is_active ? "default" : "secondary"}
                  className="mt-1"
                >
                  {staff.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Created
                </Label>
                <p className="text-sm mt-1">
                  {staff.created_at
                    ? new Date(staff.created_at).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>

            {staff.last_login_at && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Last Login
                </Label>
                <p className="text-sm mt-1">
                  {new Date(staff.last_login_at).toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Permissions
              </Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {staff.permissions?.map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {permission}
                  </Badge>
                )) || (
                  <p className="text-sm text-muted-foreground">
                    No permissions assigned
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => setIsInfoOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retrieve/Reset PIN */}
      <Dialog open={isRetrievePinOpen} onOpenChange={setIsRetrievePinOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            title="Generate New PIN"
          >
            <RotateCcw className="size-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader className="pb-6">
            <DialogTitle>Generate New PIN</DialogTitle>
            <DialogDescription>
              Generate a new random PIN for{" "}
              <span className="font-medium">
                {staff.first_name} {staff.last_name}
              </span>
              . The new PIN will be displayed after generation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{staff.role}</Badge>
              <span className="text-sm text-muted-foreground">
                {staff.email}
              </span>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button
              variant="outline"
              onClick={() => setIsRetrievePinOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleRetrievePin} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate New PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change PIN to Custom */}
      <Button
        variant="ghost"
        size="icon"
        className="text-foreground"
        title="Set Custom PIN"
        onClick={() => setIsChangePinOpen(true)}
      >
        <Edit3 className="size-4" />
      </Button>

      {/* Full-Screen PIN Modal */}
      {isChangePinOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop with blur effect */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setIsChangePinOpen(false);
              setNewPin("");
            }}
          />

          {/* Modal Content - Centered and responsive */}
          <div
            className="relative bg-background border rounded-xl shadow-2xl w-full max-w-lg mx-auto p-8 transform transition-all duration-200 scale-100"
            style={{
              minHeight: "auto",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div className="flex flex-col space-y-1.5 text-center sm:text-left pb-6">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Set Custom PIN
              </h2>
              <p className="text-sm text-muted-foreground">
                Set a custom PIN for{" "}
                <span className="font-medium">
                  {staff.first_name} {staff.last_name}
                </span>
                . PIN must be 4-8 digits.
              </p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{staff.role}</Badge>
                <span className="text-sm text-muted-foreground">
                  {staff.email}
                </span>
              </div>

              <div className="space-y-3">
                <Label htmlFor="newPin">New PIN</Label>
                <div className="space-y-2">
                  <Input
                    ref={pinInputRef}
                    id="newPin"
                    type="text"
                    placeholder="Enter 4-8 digit PIN"
                    value={newPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                      setNewPin(value);
                    }}
                    onKeyDown={(e) => {
                      // Allow only numbers, backspace, delete, tab, escape, enter
                      if (
                        !/[0-9]/.test(e.key) &&
                        ![
                          "Backspace",
                          "Delete",
                          "Tab",
                          "Escape",
                          "Enter",
                          "ArrowLeft",
                          "ArrowRight",
                        ].includes(e.key)
                      ) {
                        e.preventDefault();
                      }
                      // Handle Enter key to submit
                      if (
                        e.key === "Enter" &&
                        newPin &&
                        /^\d{4,8}$/.test(newPin)
                      ) {
                        handleChangePin();
                      }
                      // Handle Escape to close
                      if (e.key === "Escape") {
                        setIsChangePinOpen(false);
                        setNewPin("");
                      }
                    }}
                    onFocus={(e) => {
                      e.target.select();
                    }}
                    maxLength={8}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="text-center text-lg tracking-widest h-12"
                    autoFocus
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {newPin.length}/8 digits
                  </div>
                </div>
                {newPin && !/^\d{4,8}$/.test(newPin) && (
                  <p className="text-sm text-destructive">
                    PIN must be 4-8 digits only
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsChangePinOpen(false);
                  setNewPin("");
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePin}
                disabled={isLoading || !newPin || !/^\d{4,8}$/.test(newPin)}
              >
                {isLoading ? "Setting..." : "Set PIN"}
              </Button>
            </div>

            {/* Close button */}
            <button
              type="button"
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => {
                setIsChangePinOpen(false);
                setNewPin("");
              }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
