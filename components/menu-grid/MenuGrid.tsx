"use client";

import React from "react";
import { MenuItem } from "@/data/menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MenuItemCard } from "./MenuItemCard";
import { MenuGridSkeleton } from "./MenuGridSkeleton";
import { MenuGridErrorBoundary } from "./MenuGridErrorBoundary";
import { useNetworkStatus, analyzeError } from "@/lib/error-handling";

interface MenuGridProps {
  menuItems: MenuItem[];
  onItemClick: (item: MenuItem) => void;
  onEditItem?: (item: MenuItem) => void;
  onDeleteItem?: (id: number) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  isOrderModalOpen?: boolean;
}

/**
 * Displays menu items in a responsive grid layout
 * Handles loading states, errors, and empty states
 */
export function MenuGrid({
  menuItems,
  onItemClick,
  onEditItem,
  onDeleteItem,
  loading = false,
  error,
  onRetry,
  className,
  isOrderModalOpen = false,
}: MenuGridProps) {
  const isOnline = useNetworkStatus();
  // Loading state with smooth transition
  if (loading) {
    return (
      <MenuGridSkeleton className={className} showStaggeredAnimation={true} />
    );
  }

  // Error state with enhanced error handling
  if (error) {
    const errorInfo = analyzeError(new Error(error));
    const isNetworkError = errorInfo.type === "network" || !isOnline;

    return (
      <Card className={cn("p-8", className)}>
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
          {/* Error Icon */}
          <div className="relative">
            <AlertCircle
              className={cn(
                "h-12 w-12",
                errorInfo.severity === "high"
                  ? "text-red-500"
                  : errorInfo.severity === "medium"
                  ? "text-orange-500"
                  : "text-yellow-500"
              )}
            />
            {isNetworkError && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isNetworkError
                ? "Connection Issue"
                : "Failed to load menu items"}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {isNetworkError && !isOnline
                ? "You appear to be offline. Please check your internet connection."
                : errorInfo.message}
            </p>
          </div>

          {/* Network Status */}
          {isNetworkError && (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                isOnline
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  Offline
                </>
              )}
            </div>
          )}

          {/* Retry Button */}
          {onRetry && errorInfo.retryable && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="mt-4"
              disabled={!isOnline && isNetworkError}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {isNetworkError && !isOnline
                ? "Waiting for connection..."
                : "Try Again"}
            </Button>
          )}

          {/* Additional Actions */}
          {errorInfo.severity === "high" && (
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Refresh Page
              </Button>
              <Button
                onClick={() => (window.location.href = "/dashboard/settings")}
                variant="outline"
                size="sm"
              >
                Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!menuItems || menuItems.length === 0) {
    return (
      <Card className={cn("p-8", className)}>
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No menu items found</h3>
            <p className="text-muted-foreground max-w-md">
              There are no menu items to display. Add some items to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid display with error boundary
  return (
    <MenuGridErrorBoundary
      onRetry={onRetry}
      onError={(error, errorInfo) => {
        console.error("Menu grid error:", error, errorInfo);
      }}
    >
      <div
        className={cn(
          // Enhanced responsive grid layout with better breakpoints
          "grid gap-3 sm:gap-4 lg:gap-6",
          // Mobile: 1 column on very small screens, 2 on larger mobile
          "grid-cols-1 xs:grid-cols-2",
          // Small tablets: 2-3 columns
          "sm:grid-cols-2 md:grid-cols-3",
          // Conditional layout based on order modal state
          isOrderModalOpen
            ? // When order modal is open: max 3 columns to prevent cramping
              "lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3"
            : // When order modal is closed: normal responsive layout
              "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6",
          // Ensure consistent row heights
          "auto-rows-fr",
          // Minimum card width to prevent too narrow cards
          "[&>*]:min-w-[200px] sm:[&>*]:min-w-[220px] lg:[&>*]:min-w-[240px]",
          // Add staggered animation for grid items
          "animate-in fade-in-50 duration-500",
          className
        )}
      >
        {menuItems.map((item, index) => (
          <MenuGridErrorBoundary
            key={item.id}
            fallback={
              <div
                className="animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="overflow-hidden h-full flex flex-col min-h-[280px] sm:min-h-[300px] lg:min-h-[320px] border-red-200 bg-red-50 dark:bg-red-900/20">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-3 h-full">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Failed to load item
                      </h4>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {item.name}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            }
          >
            <div
              className="animate-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <MenuItemCard
                item={item}
                onClick={onItemClick}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
              />
            </div>
          </MenuGridErrorBoundary>
        ))}
      </div>
    </MenuGridErrorBoundary>
  );
}
