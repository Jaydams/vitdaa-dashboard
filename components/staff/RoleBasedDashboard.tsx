"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Shield, User, Building, Clock, LogOut } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StaffSession } from "@/types/auth";

// Import role-specific dashboard components
import ReceptionDashboard from "./ReceptionDashboard";
import KitchenDashboard from "./KitchenDashboard";
import BarDashboard from "./BarDashboard";
import AccountantDashboard from "./AccountantDashboard";

interface RoleBasedDashboardProps {
  staffSession: StaffSession;
}

// Import permission utilities
import { hasPermission } from "@/lib/permissions";

// Role-specific navigation items
const getRoleNavigation = (role: string, permissions: string[]) => {
  const baseNavItems = [
    {
      title: "Dashboard",
      url: "/staff/dashboard",
      icon: "dashboard",
      permission: null, // Always accessible
    },
  ];

  switch (role) {
    case "reception":
      return [
        ...baseNavItems,
        {
          title: "Orders",
          url: "/staff/orders",
          icon: "orders",
          permission: "orders:read",
        },
        {
          title: "Tables",
          url: "/staff/tables",
          icon: "tables",
          permission: "tables:read",
        },
        {
          title: "Customers",
          url: "/staff/customers",
          icon: "customers",
          permission: "customers:read",
        },
        {
          title: "Payments",
          url: "/staff/payments",
          icon: "payments",
          permission: "payments:process",
        },
      ];

    case "kitchen":
      return [
        ...baseNavItems,
        {
          title: "Kitchen Orders",
          url: "/staff/kitchen/orders",
          icon: "orders",
          permission: "orders:read",
        },
        {
          title: "Inventory",
          url: "/staff/kitchen/inventory",
          icon: "inventory",
          permission: "inventory:read",
        },
      ];

    case "bar":
      return [
        ...baseNavItems,
        {
          title: "Bar Orders",
          url: "/staff/bar/orders",
          icon: "orders",
          permission: "orders:read",
        },
        {
          title: "Bar Inventory",
          url: "/staff/bar/inventory",
          icon: "inventory",
          permission: "inventory:read",
        },
      ];

    case "accountant":
      return [
        ...baseNavItems,
        {
          title: "Reports",
          url: "/staff/reports",
          icon: "reports",
          permission: "reports:read",
        },
        {
          title: "Transactions",
          url: "/staff/transactions",
          icon: "transactions",
          permission: "transactions:read",
        },
        {
          title: "Payments",
          url: "/staff/payments",
          icon: "payments",
          permission: "payments:read",
        },
      ];

    default:
      return baseNavItems;
  }
};

export default function RoleBasedDashboard({
  staffSession,
}: RoleBasedDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { staff, permissions, sessionRecord, business } = staffSession;

  useEffect(() => {
    // Simulate loading and validation
    const validateSession = async () => {
      try {
        // Check if session is still valid
        const now = new Date();
        const expiresAt = new Date(sessionRecord.expires_at);

        if (now > expiresAt) {
          setError("Your session has expired. Please sign in again.");
          return;
        }

        // Validate permissions
        if (!permissions || permissions.length === 0) {
          setError(
            "No permissions assigned to your role. Please contact your manager."
          );
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Session validation error:", err);
        setError("Failed to validate session. Please try again.");
      }
    };

    validateSession();
  }, [sessionRecord, permissions]);

  // Get filtered navigation items based on permissions
  const navigationItems = getRoleNavigation(staff.role, permissions).filter(
    (item) => !item.permission || hasPermission(permissions, item.permission)
  );

  const handleSignOut = async () => {
    try {
      // Clear the session cookie
      document.cookie = "staff_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // Call the server action to terminate the session
      const response = await fetch("/api/staff/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Redirect to staff login page
        window.location.href = "/staff-login?message=signed-out";
      } else {
        // If server action fails, still redirect but clear cookie
        window.location.href = "/staff-login?message=signed-out";
      }
    } catch (error) {
      console.error("Signout error:", error);
      // Even if there's an error, clear cookie and redirect
      document.cookie = "staff_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = "/staff-login?message=signed-out";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
          </div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render role-specific dashboard
  const renderRoleDashboard = () => {
    switch (staff.role) {
      case "reception":
        return <ReceptionDashboard staffSession={staffSession} />;
      case "kitchen":
        return <KitchenDashboard staffSession={staffSession} />;
      case "bar":
        return <BarDashboard staffSession={staffSession} />;
      case "accountant":
        return <AccountantDashboard staffSession={staffSession} />;
      default:
        return (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Shield className="h-5 w-5" />
                Role Not Configured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your role "{staff.role}" dashboard is not yet configured. Please
                contact your manager.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

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
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Staff Session Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                <AvatarImage src={staff.avatar_url || ""} />
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary to-primary/80 text-white">
                  {getInitials(staff.first_name, staff.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Welcome, {staff.first_name} {staff.last_name}
                  </h1>
                  <Badge className={`${getRoleColor(staff.role)} capitalize font-medium`}>
                    {staff.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">{business.business_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Staff ID: {staff.id.slice(-8).toUpperCase()}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Session expires in:</span>
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatTimeRemaining(sessionRecord.expires_at)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <Separator className="mb-4" />
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Permissions:</span> {permissions.length} active
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Access Level:</span> {staff.role}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Active Session
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific Dashboard Content */}
      {renderRoleDashboard()}
    </div>
  );
}

// Permission Guard Component for protecting UI elements
interface PermissionGuardProps {
  permissions: string[];
  requiredPermission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  permissions,
  requiredPermission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  if (!hasPermission(permissions, requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Export permission utilities
export { hasPermission } from "@/lib/permissions";
