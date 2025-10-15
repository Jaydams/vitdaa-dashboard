"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// Enhanced breakpoint system for mobile-first design
export const BREAKPOINTS = {
  mobile: 320,
  mobileLg: 475,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
  ultraWide: 1920,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export interface ResponsiveContextValue {
  // Current breakpoint information
  currentBreakpoint: BreakpointKey;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // Screen dimensions
  screenWidth: number;
  screenHeight: number;

  // Orientation
  isLandscape: boolean;
  isPortrait: boolean;

  // Touch capabilities
  isTouchDevice: boolean;

  // Layout preferences
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Grid system helpers
  getGridCols: (mobile: number, tablet?: number, desktop?: number) => string;
  getSpacing: (mobile: string, tablet?: string, desktop?: string) => string;
}

const ResponsiveContext = createContext<ResponsiveContextValue | null>(null);

export function useResponsive() {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error(
      "useResponsive must be used within ResponsiveDashboardProvider"
    );
  }
  return context;
}

interface ResponsiveDashboardProviderProps {
  children: React.ReactNode;
}

export function ResponsiveDashboardProvider({
  children,
}: ResponsiveDashboardProviderProps) {
  const isMobileHook = useIsMobile();
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Initialize screen dimensions and touch detection
  useEffect(() => {
    const updateDimensions = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    const detectTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-ignore
          navigator.msMaxTouchPoints > 0
      );
    };

    updateDimensions();
    detectTouch();

    window.addEventListener("resize", updateDimensions);
    window.addEventListener("orientationchange", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
    };
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobileHook) {
      setSidebarCollapsed(true);
    }
  }, [isMobileHook]);

  // Determine current breakpoint
  const getCurrentBreakpoint = (): BreakpointKey => {
    if (screenWidth >= BREAKPOINTS.ultraWide) return "ultraWide";
    if (screenWidth >= BREAKPOINTS.wide) return "wide";
    if (screenWidth >= BREAKPOINTS.desktop) return "desktop";
    if (screenWidth >= BREAKPOINTS.tablet) return "tablet";
    if (screenWidth >= BREAKPOINTS.mobileLg) return "mobileLg";
    return "mobile";
  };

  const currentBreakpoint = getCurrentBreakpoint();
  const isMobile =
    currentBreakpoint === "mobile" || currentBreakpoint === "mobileLg";
  const isTablet = currentBreakpoint === "tablet";
  const isDesktop =
    currentBreakpoint === "desktop" ||
    currentBreakpoint === "wide" ||
    currentBreakpoint === "ultraWide";
  const isLandscape = screenWidth > screenHeight;
  const isPortrait = screenHeight >= screenWidth;

  // Grid system helpers
  const getGridCols = (
    mobile: number,
    tablet?: number,
    desktop?: number
  ): string => {
    const tabletCols = tablet ?? mobile;
    const desktopCols = desktop ?? tabletCols;

    return `grid-cols-${mobile} md:grid-cols-${tabletCols} lg:grid-cols-${desktopCols}`;
  };

  const getSpacing = (
    mobile: string,
    tablet?: string,
    desktop?: string
  ): string => {
    const tabletSpacing = tablet ?? mobile;
    const desktopSpacing = desktop ?? tabletSpacing;

    return `${mobile} md:${tabletSpacing} lg:${desktopSpacing}`;
  };

  const contextValue: ResponsiveContextValue = {
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    screenHeight,
    isLandscape,
    isPortrait,
    isTouchDevice,
    sidebarCollapsed,
    setSidebarCollapsed,
    getGridCols,
    getSpacing,
  };

  return (
    <ResponsiveContext.Provider value={contextValue}>
      {children}
    </ResponsiveContext.Provider>
  );
}
