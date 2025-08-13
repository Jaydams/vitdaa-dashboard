"use client";

import { useState } from "react";
import { Key, RotateCcw, Edit3, Info } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Info className="size-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Staff Info</p>
          </TooltipContent>
        </Tooltip>

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
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <RotateCcw className="size-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Generate New PIN</p>
          </TooltipContent>
        </Tooltip>

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
      <Dialog open={isChangePinOpen} onOpenChange={setIsChangePinOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Edit3 className="size-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Set Custom PIN</p>
          </TooltipContent>
        </Tooltip>

        <DialogContent className="max-w-md">
          <DialogHeader className="pb-6">
            <DialogTitle>Set Custom PIN</DialogTitle>
            <DialogDescription>
              Set a custom PIN for{" "}
              <span className="font-medium">
                {staff.first_name} {staff.last_name}
              </span>
              . PIN must be 4-8 digits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{staff.role}</Badge>
              <span className="text-sm text-muted-foreground">
                {staff.email}
              </span>
            </div>

            <div className="space-y-3">
              <Label htmlFor="newPin">New PIN</Label>
              <Input
                id="newPin"
                type="password"
                placeholder="Enter 4-8 digit PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                maxLength={8}
                pattern="[0-9]*"
                inputMode="numeric"
              />
              {newPin && !/^\d{4,8}$/.test(newPin) && (
                <p className="text-sm text-destructive">
                  PIN must be 4-8 digits only
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-6">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
