"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MenuGridErrorBoundary } from "./MenuGridErrorBoundary";

interface MenuGridLayoutProps {
  children: React.ReactNode;
  orderPanel?: React.ReactNode;
  orderPanelVisible: boolean;
  onToggleOrderPanel: () => void;
  className?: string;
}

/**
 * Main layout component that manages the grid and order panel layout
 * Provides responsive layout with smooth transitions for panel show/hide
 * Enhanced with improved responsive breakpoints and mobile-first design
 */
export function MenuGridLayout({
  children,
  orderPanel,
  orderPanelVisible,
  onToggleOrderPanel,
  className,
}: MenuGridLayoutProps) {
  return (
    <MenuGridErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Menu grid layout error:", error, errorInfo);
      }}
    >
      <div
        className={cn(
          "relative min-h-screen transition-all duration-300 ease-in-out",
          // Mobile: Stack vertically, tablet and up: Side by side
          "flex flex-col md:flex-row",
          className
        )}
      >
        {/* Menu Grid Container */}
        <div
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            // Mobile: Full width always
            "w-full",
            // Tablet: Adjust based on panel visibility
            "md:w-full",
            // Desktop: Dynamic width based on panel state
            orderPanelVisible
              ? "lg:w-[58%] xl:w-[62%] 2xl:w-[65%]"
              : "lg:w-full",
            // Add padding for mobile when panel is visible (overlay mode)
            orderPanelVisible && "md:pr-0 lg:pr-4"
          )}
        >
          <div className="p-4 md:p-6">{children}</div>
        </div>

        {/* Order Panel Container */}
        {orderPanel && (
          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              // Mobile: Fixed overlay that slides in from right
              "fixed md:relative inset-y-0 right-0 z-50",
              // Width responsive to screen size
              "w-full sm:w-96 md:w-80 lg:w-96 xl:w-[400px]",
              // Desktop: Integrated panel with dynamic width
              orderPanelVisible
                ? "md:block lg:w-[42%] xl:w-[38%] 2xl:w-[35%] lg:min-w-[350px] lg:max-w-[450px]"
                : "md:hidden lg:w-0 lg:min-w-0 lg:max-w-0 lg:overflow-hidden",
              // Transform for mobile slide animation
              orderPanelVisible
                ? "translate-x-0"
                : "translate-x-full md:translate-x-0"
            )}
          >
            <div
              className={cn(
                "h-full transition-opacity duration-300 ease-in-out",
                orderPanelVisible ? "opacity-100" : "opacity-0 md:opacity-0"
              )}
            >
              {orderPanel}
            </div>
          </div>
        )}

        {/* Mobile Overlay Background */}
        {orderPanelVisible && (
          <div
            className={cn(
              "fixed inset-0 bg-black/50 z-40 md:hidden",
              "transition-all duration-300 ease-in-out",
              "animate-in fade-in-0 duration-300",
              "backdrop-blur-sm"
            )}
            onClick={onToggleOrderPanel}
          />
        )}
      </div>
    </MenuGridErrorBoundary>
  );
}
