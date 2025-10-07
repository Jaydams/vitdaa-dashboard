"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadingStateProps {
  className?: string;
}

/**
 * Inline loading spinner for quick loading states
 */
export function MenuGridInlineLoader({ className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading menu items...</span>
      </div>
    </div>
  );
}

/**
 * Loading overlay for existing content
 */
export function MenuGridLoadingOverlay({
  visible,
  className,
}: {
  visible: boolean;
  className?: string;
}) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 bg-background/80 backdrop-blur-sm",
        "flex items-center justify-center z-10",
        "animate-in fade-in-0 duration-300",
        className
      )}
    >
      <div className="flex items-center space-x-3 bg-card p-4 rounded-lg shadow-lg border">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium">Updating menu...</span>
      </div>
    </div>
  );
}

/**
 * Transition component for smooth loading to loaded state
 */
export function MenuGridTransition({
  isLoading,
  children,
  skeleton,
  className,
}: {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {/* Skeleton state */}
      <div
        className={cn(
          "transition-all duration-500 ease-out",
          isLoading
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none absolute inset-0"
        )}
      >
        {skeleton}
      </div>

      {/* Loaded content */}
      <div
        className={cn(
          "transition-all duration-500 ease-out delay-200",
          !isLoading
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Progressive loading component for large datasets
 */
export function MenuGridProgressiveLoader({
  loadedCount,
  totalCount,
  onLoadMore,
  isLoading,
  className,
}: {
  loadedCount: number;
  totalCount: number;
  onLoadMore: () => void;
  isLoading: boolean;
  className?: string;
}) {
  const progress = (loadedCount / totalCount) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Loaded {loadedCount} of {totalCount} items
        </span>
        <span>{Math.round(progress)}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Load more button */}
      {loadedCount < totalCount && (
        <div className="flex justify-center">
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="outline"
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for individual menu item with enhanced animations
 */
export function MenuItemSkeleton({
  index = 0,
  showAnimation = true,
}: {
  index?: number;
  showAnimation?: boolean;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden h-full flex flex-col",
        "min-h-[280px] sm:min-h-[300px] lg:min-h-[320px]",
        // Enhanced shimmer effect
        "relative bg-gradient-to-r from-muted via-muted/50 to-muted",
        "before:absolute before:inset-0 before:z-10",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        showAnimation && "before:animate-[shimmer_2s_infinite]",
        // Staggered animation
        showAnimation &&
          "animate-in slide-in-from-bottom-4 duration-700 ease-out"
      )}
      style={{
        animationDelay: showAnimation ? `${index * 75}ms` : "0ms",
      }}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Image skeleton */}
        <div className="w-full h-40 sm:h-44 md:h-48 lg:h-52 relative overflow-hidden">
          <Skeleton className="w-full h-full" />
          {/* Status badge skeleton */}
          <div className="absolute top-2 right-2">
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-5 space-y-3">
          {/* Title */}
          <Skeleton className="h-5 w-3/4" />

          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Price and action */}
          <div className="flex justify-between items-end pt-2 mt-auto">
            <div className="space-y-1">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading state for empty grid
 */
export function MenuGridEmptyLoader({ className }: LoadingStateProps) {
  return (
    <div className={cn("py-12", className)}>
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center animate-pulse">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Loading menu items</h3>
          <p className="text-muted-foreground">
            Please wait while we fetch the latest menu items...
          </p>
        </div>
      </div>
    </div>
  );
}
