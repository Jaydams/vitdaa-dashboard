"use client";

import { Clock, LogOut, Building, User, Shield } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StaffSession } from "@/types/auth";

interface ResponsiveStaffHeaderProps {
  staffSession: StaffSession;
  onSignOut: () => void;
}

export default function ResponsiveStaffHeader({
  staffSession,
  onSignOut,
}: ResponsiveStaffHeaderProps) {
  const { staff, permissions, sessionRecord, business } = staffSession;

  const getRoleColor = (role: string) => {
    switch (role) {
      case "reception":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "kitchen":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "bar":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "accountant":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "storekeeper":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "waiter":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

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
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
          {/* Staff Info Section - Responsive */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
            {/* Avatar - Responsive */}
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-4 border-white shadow-lg flex-shrink-0">
              <AvatarImage src={staff.avatar_url || ""} />
              <AvatarFallback className="text-sm sm:text-lg font-semibold bg-gradient-to-br from-primary to-primary/80 text-white">
                {getInitials(staff.first_name, staff.last_name)}
              </AvatarFallback>
            </Avatar>
            
            {/* Staff Details - Responsive */}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  Welcome, {staff.first_name} {staff.last_name}
                </h1>
                <Badge className={`${getRoleColor(staff.role)} capitalize font-medium w-fit`}>
                  {staff.role}
                </Badge>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium truncate">{business.business_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">ID: {staff.id.slice(-8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Session Info and Actions - Responsive */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 lg:gap-2 lg:text-right">
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Session expires:</span>
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatTimeRemaining(sessionRecord.expires_at)}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="gap-2 w-full sm:w-auto"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Logout</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <Separator className="mb-4" />
      
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="text-muted-foreground">
              <span className="font-medium">Permissions:</span> {permissions.length} active
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium">Access Level:</span> {staff.role}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
              Active Session
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
