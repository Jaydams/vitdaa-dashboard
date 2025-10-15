"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useResponsive } from "./ResponsiveDashboardProvider";

// Adaptive dashboard layout that changes based on screen size
interface AdaptiveDashboardLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AdaptiveDashboardLayout({
  children,
  sidebar,
  header,
  footer,
  className,
}: AdaptiveDashboardLayoutProps) {
  const { isMobile, isTablet, currentBreakpoint } = useResponsive();

  return (
    <div
      className={cn(
        "adaptive-dashboard-layout min-h-screen",
        // Mobile: Stack layout
        isMobile && "flex flex-col",
        // Tablet: Sidebar + main content
        isTablet && "flex flex-row",
        // Desktop: Full layout with sidebar
        !isMobile && !isTablet && "flex flex-row",
        className
      )}
      data-layout={currentBreakpoint}
    >
      {/* Sidebar - responsive positioning */}
      {sidebar && (
        <aside
          className={cn(
            "adaptive-sidebar",
            // Mobile: Hidden by default, shown via overlay
            isMobile && "hidden",
            // Tablet & Desktop: Always visible
            !isMobile && "flex-shrink-0"
          )}
        >
          {sidebar}
        </aside>
      )}

      {/* Main content area */}
      <div className="adaptive-main flex-1 flex flex-col min-w-0">
        {/* Header */}
        {header && (
          <header
            className={cn(
              "adaptive-header flex-shrink-0",
              // Mobile: Full width with padding
              isMobile && "px-4 py-3",
              // Tablet & Desktop: Standard padding
              !isMobile && "px-6 py-4"
            )}
          >
            {header}
          </header>
        )}

        {/* Main content */}
        <main
          className={cn(
            "adaptive-content flex-1 overflow-auto",
            // Mobile: Full width with padding
            isMobile && "px-4 pb-4",
            // Tablet: Medium padding
            isTablet && "px-6 pb-6",
            // Desktop: Standard padding
            !isMobile && !isTablet && "px-8 pb-8"
          )}
        >
          {children}
        </main>

        {/* Footer */}
        {footer && (
          <footer
            className={cn(
              "adaptive-footer flex-shrink-0",
              // Mobile: Full width with padding
              isMobile && "px-4 py-3",
              // Tablet & Desktop: Standard padding
              !isMobile && "px-6 py-4"
            )}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// Adaptive card grid that adjusts columns based on screen size
interface AdaptiveCardGridProps {
  children: React.ReactNode;
  minCardWidth?: number; // Minimum card width in pixels
  gap?: number; // Gap between cards in rem
  className?: string;
}

export function AdaptiveCardGrid({
  children,
  minCardWidth = 280,
  gap = 1.5,
  className,
}: AdaptiveCardGridProps) {
  const { screenWidth } = useResponsive();

  // Calculate optimal number of columns based on screen width
  const getColumns = () => {
    if (screenWidth === 0) return 1; // SSR fallback

    const availableWidth = screenWidth - 64; // Account for padding
    const cardWithGap = minCardWidth + gap * 16; // Convert rem to px
    const columns = Math.floor(availableWidth / cardWithGap);

    return Math.max(1, columns);
  };

  const columns = getColumns();

  return (
    <div
      className={cn("adaptive-card-grid grid", className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(${minCardWidth}px, 1fr))`,
        gap: `${gap}rem`,
      }}
    >
      {children}
    </div>
  );
}

// Adaptive stats grid for dashboard metrics
interface AdaptiveStatsGridProps {
  children: React.ReactNode;
  className?: string;
}

export function AdaptiveStatsGrid({
  children,
  className,
}: AdaptiveStatsGridProps) {
  const { isMobile, isTablet } = useResponsive();

  return (
    <div
      className={cn(
        "adaptive-stats-grid grid gap-4",
        // Mobile: 1 column
        isMobile && "grid-cols-1",
        // Tablet: 2 columns
        isTablet && "grid-cols-2",
        // Desktop: 4 columns
        !isMobile && !isTablet && "grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

// Adaptive content sections that stack on mobile
interface AdaptiveContentSectionsProps {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
  primaryWidth?: "1/2" | "2/3" | "3/4";
  className?: string;
}

export function AdaptiveContentSections({
  primary,
  secondary,
  tertiary,
  primaryWidth = "2/3",
  className,
}: AdaptiveContentSectionsProps) {
  const { isMobile } = useResponsive();

  const primaryWidthClass = {
    "1/2": "lg:w-1/2",
    "2/3": "lg:w-2/3",
    "3/4": "lg:w-3/4",
  }[primaryWidth];

  return (
    <div
      className={cn(
        "adaptive-content-sections",
        // Mobile: Stack vertically
        isMobile && "flex flex-col gap-6",
        // Desktop: Side by side
        !isMobile && "flex gap-6",
        className
      )}
    >
      {/* Primary content */}
      <div
        className={cn(
          "adaptive-primary flex-shrink-0",
          !isMobile && primaryWidthClass
        )}
      >
        {primary}
      </div>

      {/* Secondary content */}
      {secondary && (
        <div className="adaptive-secondary flex-1 min-w-0">{secondary}</div>
      )}

      {/* Tertiary content */}
      {tertiary && (
        <div className="adaptive-tertiary flex-shrink-0 w-full lg:w-80">
          {tertiary}
        </div>
      )}
    </div>
  );
}

// Adaptive table that becomes cards on mobile
interface AdaptiveTableProps {
  headers: string[];
  data: Array<Record<string, React.ReactNode>>;
  keyField: string;
  mobileCardRenderer?: (
    item: Record<string, React.ReactNode>
  ) => React.ReactNode;
  className?: string;
}

export function AdaptiveTable({
  headers,
  data,
  keyField,
  mobileCardRenderer,
  className,
}: AdaptiveTableProps) {
  const { isMobile } = useResponsive();

  if (isMobile && mobileCardRenderer) {
    return (
      <div className={cn("adaptive-table-mobile space-y-4", className)}>
        {data.map((item) => (
          <div
            key={String(item[keyField])}
            className="bg-card rounded-lg border p-4"
          >
            {mobileCardRenderer(item)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("adaptive-table-desktop overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {headers.map((header, index) => (
              <th
                key={index}
                className="text-left p-4 font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={String(item[keyField])} className="border-b">
              {headers.map((header, index) => (
                <td key={index} className="p-4">
                  {item[header.toLowerCase().replace(/\s+/g, "_")]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Adaptive modal that becomes full screen on mobile
interface AdaptiveModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

export function AdaptiveModal({
  children,
  isOpen,
  onClose,
  title,
  className,
}: AdaptiveModalProps) {
  const { isMobile } = useResponsive();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal content */}
      <div
        className={cn(
          "relative bg-background rounded-lg shadow-lg",
          // Mobile: Full screen
          isMobile && "w-full h-full rounded-none",
          // Desktop: Centered modal
          !isMobile && "w-full max-w-2xl max-h-[90vh] m-4",
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg"
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div className={cn("overflow-y-auto", isMobile ? "flex-1 p-4" : "p-6")}>
          {children}
        </div>
      </div>
    </div>
  );
}
