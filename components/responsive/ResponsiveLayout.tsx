"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useResponsive } from "./ResponsiveDashboardProvider";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveLayout({
  children,
  className,
}: ResponsiveLayoutProps) {
  const { isMobile, isTablet, currentBreakpoint } = useResponsive();

  return (
    <div
      className={cn(
        "responsive-layout",
        // Base mobile-first layout
        "flex flex-col min-h-screen",
        // Tablet adjustments
        "md:flex-row",
        // Desktop adjustments
        "lg:flex-row",
        // Breakpoint-specific classes
        {
          "mobile-layout": isMobile,
          "tablet-layout": isTablet,
          "desktop-layout": !isMobile && !isTablet,
        },
        className
      )}
      data-breakpoint={currentBreakpoint}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: "gap-4", tablet: "gap-6", desktop: "gap-6" },
  className,
}: ResponsiveGridProps) {
  const { getGridCols, getSpacing } = useResponsive();

  const gridCols = getGridCols(
    cols.mobile || 1,
    cols.tablet || cols.mobile || 1,
    cols.desktop || cols.tablet || cols.mobile || 1
  );

  const gridGap = getSpacing(
    gap.mobile || "gap-4",
    gap.tablet || gap.mobile || "gap-4",
    gap.desktop || gap.tablet || gap.mobile || "gap-4"
  );

  return (
    <div className={cn("grid", gridCols, gridGap, className)}>{children}</div>
  );
}

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  className?: string;
}

export function ResponsiveContainer({
  children,
  maxWidth = "full",
  padding = { mobile: "px-4", tablet: "px-6", desktop: "px-8" },
  className,
}: ResponsiveContainerProps) {
  const { getSpacing } = useResponsive();

  const containerPadding = getSpacing(
    padding.mobile || "px-4",
    padding.tablet || padding.mobile || "px-4",
    padding.desktop || padding.tablet || padding.mobile || "px-4"
  );

  const maxWidthClass = maxWidth === "full" ? "w-full" : `max-w-${maxWidth}`;

  return (
    <div
      className={cn(
        "responsive-container",
        "mx-auto w-full",
        maxWidthClass,
        containerPadding,
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveCardProps {
  children: React.ReactNode;
  padding?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  className?: string;
}

export function ResponsiveCard({
  children,
  padding = { mobile: "p-4", tablet: "p-6", desktop: "p-6" },
  className,
}: ResponsiveCardProps) {
  const { getSpacing } = useResponsive();

  const cardPadding = getSpacing(
    padding.mobile || "p-4",
    padding.tablet || padding.mobile || "p-4",
    padding.desktop || padding.tablet || padding.mobile || "p-4"
  );

  return (
    <div
      className={cn(
        "responsive-card",
        "bg-card text-card-foreground rounded-lg border shadow-sm",
        cardPadding,
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: {
    mobile?: "row" | "col";
    tablet?: "row" | "col";
    desktop?: "row" | "col";
  };
  spacing?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  className?: string;
}

export function ResponsiveStack({
  children,
  direction = { mobile: "col", tablet: "row", desktop: "row" },
  spacing = { mobile: "gap-4", tablet: "gap-6", desktop: "gap-6" },
  align = "start",
  justify = "start",
  className,
}: ResponsiveStackProps) {
  const { getSpacing } = useResponsive();

  const stackSpacing = getSpacing(
    spacing.mobile || "gap-4",
    spacing.tablet || spacing.mobile || "gap-4",
    spacing.desktop || spacing.tablet || spacing.mobile || "gap-4"
  );

  const directionClasses = cn(
    `flex-${direction.mobile || "col"}`,
    `md:flex-${direction.tablet || direction.mobile || "col"}`,
    `lg:flex-${
      direction.desktop || direction.tablet || direction.mobile || "col"
    }`
  );

  const alignClass = `items-${align}`;
  const justifyClass = `justify-${justify}`;

  return (
    <div
      className={cn(
        "responsive-stack flex",
        directionClasses,
        alignClass,
        justifyClass,
        stackSpacing,
        className
      )}
    >
      {children}
    </div>
  );
}
