"use client";

import { StaffSession } from "@/types/auth";
import { MobileStaffInfoTrigger } from "./MobileStaffInfoTrigger";

interface StaffLayoutHeaderProps {
  business: {
    business_name: string;
  };
  staff: {
    first_name: string;
    last_name: string;
    role: string;
  };
  staffSession: StaffSession;
}

export function StaffLayoutHeader({
  business,
  staff,
  staffSession,
}: StaffLayoutHeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Business Name and Staff Info - Responsive */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold truncate">
                {business.business_name} - Staff Dashboard
              </h1>
            </div>
            <div className="sm:hidden">
              <h1 className="text-base font-semibold truncate">
                {business.business_name}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Staff Dashboard
              </p>
            </div>
          </div>

          {/* Staff Details and Actions - Responsive */}
          <div className="flex items-center gap-2 sm:gap-4 ml-4">
            {/* Mobile Staff Info Trigger */}
            <MobileStaffInfoTrigger staffSession={staffSession} />

            {/* Staff Info - Hidden on mobile, shown on tablet+ */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate">
                {staff.first_name} {staff.last_name}
              </span>
              <span className="hidden lg:inline">({staff.role})</span>
            </div>

            {/* Switch to Admin Button */}
            <form
              action="/api/staff/switch-to-admin"
              method="post"
              className="flex-shrink-0"
            >
              <button
                type="submit"
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                title="Switch back to admin mode"
              >
                <span className="hidden sm:inline">Switch to Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
