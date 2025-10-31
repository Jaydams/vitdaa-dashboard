"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, User, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StaffSession } from "@/types/auth";

interface MobileStaffInfoTriggerProps {
  staffSession: StaffSession;
}

export function MobileStaffInfoTrigger({
  staffSession,
}: MobileStaffInfoTriggerProps) {
  const [isStaffInfoOpen, setIsStaffInfoOpen] = useState(false);
  const staffInfoRef = useRef<HTMLDivElement>(null);

  // Helper functions
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  // Handle clicking outside staff info to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isStaffInfoOpen &&
        staffInfoRef.current &&
        !staffInfoRef.current.contains(event.target as Node)
      ) {
        setIsStaffInfoOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isStaffInfoOpen]);

  return (
    <>
      {/* Mobile Staff Info Trigger Button */}
      <Button
        variant="ghost"
        onClick={() => setIsStaffInfoOpen(true)}
        className="md:hidden flex items-center gap-2 p-2 h-auto"
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={(staffSession.staff as any)?.avatar_url || ""} />
          <AvatarFallback className="text-xs bg-primary text-white">
            {getInitials(
              staffSession.staff.first_name,
              staffSession.staff.last_name
            )}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className="h-3 w-3" />
      </Button>

      {/* Mobile Staff Info Overlay */}
      {isStaffInfoOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50">
          <div
            ref={staffInfoRef}
            className="fixed top-0 left-0 right-0 bg-background border-b shadow-lg"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Staff Information</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsStaffInfoOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={(staffSession.staff as any)?.avatar_url || ""}
                    />
                    <AvatarFallback className="bg-primary text-white">
                      {getInitials(
                        staffSession.staff.first_name,
                        staffSession.staff.last_name
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {staffSession.staff.first_name}{" "}
                      {staffSession.staff.last_name}
                    </div>
                    <Badge className="capitalize" variant="secondary">
                      {staffSession.staff.role}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>
                      ID: {staffSession.staff.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Session expires:{" "}
                    {formatTimeRemaining(staffSession.sessionRecord.expires_at)}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-muted-foreground">Permissions:</span>
                    <Badge variant="outline">
                      {staffSession.permissions.length} active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 text-xs">
                      Active Session
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="pt-4 border-t">
                  <form
                    action="/api/staff/signout"
                    method="post"
                    className="w-full"
                  >
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full flex items-center gap-2 text-destructive hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
