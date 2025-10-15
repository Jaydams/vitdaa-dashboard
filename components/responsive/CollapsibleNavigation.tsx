"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResponsive } from "./ResponsiveDashboardProvider";
import { TouchButton, TouchIconButton } from "./TouchOptimizedControls";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavigationItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
  url?: string;
  submenu?: NavigationItem[];
  badge?: string | number;
}

interface CollapsibleNavigationProps {
  items: NavigationItem[];
  currentPath?: string;
  onNavigate?: (url: string) => void;
  className?: string;
}

export function CollapsibleNavigation({
  items,
  currentPath = "",
  onNavigate,
  className,
}: CollapsibleNavigationProps) {
  const { isMobile, isTouchDevice } = useResponsive();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    }
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const isActive = (item: NavigationItem): boolean => {
    if (item.url === currentPath) return true;
    if (item.submenu) {
      return item.submenu.some((subItem) => subItem.url === currentPath);
    }
    return false;
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item);

    return (
      <div key={item.id} className="navigation-item">
        <div
          className={cn(
            "flex items-center w-full rounded-lg transition-colors",
            // Enhanced spacing for touch devices
            isTouchDevice ? "min-h-[48px] px-4 py-3" : "min-h-[40px] px-3 py-2",
            // Indentation for nested items
            level > 0 && "ml-4 border-l border-border/50 pl-4",
            // Active state styling
            active && "bg-accent text-accent-foreground",
            // Hover state (only for non-touch devices)
            !isTouchDevice && "hover:bg-accent/50",
            // Touch interaction
            isTouchDevice &&
              "touch-manipulation select-none active:bg-accent/70"
          )}
        >
          {/* Main content */}
          <div
            className="flex items-center flex-1 gap-3 cursor-pointer"
            onClick={() => {
              if (item.url) {
                handleNavigate(item.url);
              } else if (hasSubmenu) {
                toggleExpanded(item.id);
              }
            }}
          >
            {/* Icon */}
            {item.icon && (
              <div
                className={cn(
                  "flex-shrink-0",
                  isTouchDevice ? "text-lg" : "text-base"
                )}
              >
                {item.icon}
              </div>
            )}

            {/* Title */}
            <span
              className={cn(
                "font-medium truncate",
                isTouchDevice ? "text-base" : "text-sm"
              )}
            >
              {item.title}
            </span>

            {/* Badge */}
            {item.badge && (
              <span
                className={cn(
                  "ml-auto px-2 py-1 text-xs font-medium rounded-full",
                  "bg-primary/10 text-primary"
                )}
              >
                {item.badge}
              </span>
            )}
          </div>

          {/* Expand/collapse button for submenus */}
          {hasSubmenu && (
            <TouchIconButton
              size="sm"
              onTap={() => toggleExpanded(item.id)}
              className="ml-2 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </TouchIconButton>
          )}
        </div>

        {/* Submenu */}
        {hasSubmenu && isExpanded && (
          <div
            className={cn(
              "mt-1 space-y-1",
              // Enhanced spacing for touch
              isTouchDevice ? "pb-2" : "pb-1"
            )}
          >
            {item.submenu!.map((subItem) =>
              renderNavigationItem(subItem, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const NavigationContent = () => (
    <nav className={cn("navigation-content space-y-1", className)}>
      {items.map((item) => renderNavigationItem(item))}
    </nav>
  );

  // Mobile navigation with sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <TouchIconButton size="md" className="md:hidden">
              <Menu className="h-5 w-5" />
            </TouchIconButton>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <TouchIconButton size="sm" onTap={() => setMobileMenuOpen(false)}>
                <X className="h-4 w-4" />
              </TouchIconButton>
            </div>
            <div className="p-4 overflow-y-auto">
              <NavigationContent />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop navigation
  return <NavigationContent />;
}

// Collapsible section component for organizing navigation
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  className,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { isTouchDevice } = useResponsive();

  return (
    <div className={cn("collapsible-section", className)}>
      <TouchButton
        variant="ghost"
        className={cn(
          "w-full justify-between font-medium",
          isTouchDevice ? "h-12 px-4" : "h-10 px-3"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </TouchButton>

      {isExpanded && (
        <div className={cn("mt-1 space-y-1", isTouchDevice ? "pb-3" : "pb-2")}>
          {children}
        </div>
      )}
    </div>
  );
}

// Breadcrumb navigation for mobile
interface BreadcrumbProps {
  items: Array<{
    title: string;
    url?: string;
  }>;
  onNavigate?: (url: string) => void;
  className?: string;
}

export function MobileBreadcrumb({
  items,
  onNavigate,
  className,
}: BreadcrumbProps) {
  const { isMobile } = useResponsive();

  if (!isMobile || items.length <= 1) {
    return null;
  }

  return (
    <nav
      className={cn(
        "mobile-breadcrumb flex items-center gap-2 p-4 border-b",
        className
      )}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {item.url && index < items.length - 1 ? (
            <TouchButton
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.(item.url!)}
              className="text-muted-foreground hover:text-foreground"
            >
              {item.title}
            </TouchButton>
          ) : (
            <span
              className={cn(
                "text-sm font-medium",
                index === items.length - 1
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.title}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
