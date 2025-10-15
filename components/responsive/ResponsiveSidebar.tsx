"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useResponsive } from "./ResponsiveDashboardProvider";
import { CollapsibleNavigation } from "./CollapsibleNavigation";
import { TouchIconButton } from "./TouchOptimizedControls";
import { Menu, X } from "lucide-react";

interface ResponsiveSidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveSidebar({
  children,
  className,
}: ResponsiveSidebarProps) {
  const { isMobile, isTablet, isTouchDevice } = useResponsive();
  const { state, openMobile, setOpenMobile } = useSidebar();

  return (
    <div
      className={cn(
        "responsive-sidebar",
        // Mobile: Full height overlay
        isMobile && [
          "fixed inset-y-0 left-0 z-50 w-80",
          "transform transition-transform duration-300 ease-in-out",
          openMobile ? "translate-x-0" : "-translate-x-full",
          "bg-sidebar border-r shadow-lg",
        ],
        // Tablet: Collapsible sidebar
        isTablet && [
          "relative h-full",
          state === "collapsed" ? "w-16" : "w-64",
          "transition-all duration-300 ease-in-out",
          "bg-sidebar border-r",
        ],
        // Desktop: Standard sidebar behavior
        !isMobile &&
          !isTablet && [
            "relative h-full",
            state === "collapsed" ? "w-16" : "w-64",
            "transition-all duration-300 ease-in-out",
            "bg-sidebar border-r",
          ],
        className
      )}
    >
      {/* Mobile overlay backdrop */}
      {isMobile && openMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpenMobile(false)}
        />
      )}

      {/* Sidebar content */}
      <div className={cn("relative h-full flex flex-col", isMobile && "z-50")}>
        {/* Mobile header with close button */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <TouchIconButton size="sm" onTap={() => setOpenMobile(false)}>
              <X className="h-4 w-4" />
            </TouchIconButton>
          </div>
        )}

        {/* Sidebar content */}
        <div
          className={cn(
            "flex-1 overflow-y-auto",
            // Enhanced padding for touch devices
            isTouchDevice ? "p-4" : "p-2",
            // Hide content when collapsed on desktop
            !isMobile && state === "collapsed" && "hidden"
          )}
        >
          {children}
        </div>

        {/* Collapsed state icons (desktop/tablet only) */}
        {!isMobile && state === "collapsed" && (
          <div className="flex flex-col items-center py-4 space-y-2">
            {/* Add collapsed navigation icons here */}
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile sidebar trigger button
export function MobileSidebarTrigger() {
  const { isMobile } = useResponsive();
  const { setOpenMobile } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <TouchIconButton
      size="md"
      onTap={() => setOpenMobile(true)}
      className="md:hidden"
    >
      <Menu className="h-5 w-5" />
    </TouchIconButton>
  );
}

// Enhanced sidebar content wrapper
interface SidebarContentWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarContentWrapper({
  children,
  className,
}: SidebarContentWrapperProps) {
  const { isMobile, isTouchDevice, currentBreakpoint } = useResponsive();
  const { state } = useSidebar();

  return (
    <div
      className={cn(
        "sidebar-content-wrapper",
        // Responsive spacing
        isTouchDevice ? "space-y-3" : "space-y-2",
        // Hide when collapsed on desktop
        !isMobile && state === "collapsed" && "hidden",
        className
      )}
      data-breakpoint={currentBreakpoint}
    >
      {children}
    </div>
  );
}

// Responsive sidebar section
interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export function SidebarSection({
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
  className,
}: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const { isTouchDevice } = useResponsive();

  return (
    <div className={cn("sidebar-section", className)}>
      {title && (
        <div
          className={cn(
            "flex items-center justify-between",
            isTouchDevice ? "py-3 px-2" : "py-2 px-1",
            collapsible && "cursor-pointer"
          )}
          onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        >
          <h3
            className={cn(
              "font-medium text-sidebar-foreground/70",
              isTouchDevice ? "text-sm" : "text-xs"
            )}
          >
            {title}
          </h3>
          {collapsible && (
            <TouchIconButton size="sm">
              {isExpanded ? (
                <X className="h-3 w-3" />
              ) : (
                <Menu className="h-3 w-3" />
              )}
            </TouchIconButton>
          )}
        </div>
      )}

      {(!collapsible || isExpanded) && (
        <div
          className={cn(
            "sidebar-section-content",
            isTouchDevice ? "space-y-2" : "space-y-1"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
