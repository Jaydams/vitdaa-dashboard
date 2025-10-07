"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MenuGridSkeletonProps {
  itemCount?: number;
  className?: string;
  showStaggeredAnimation?: boolean;
}

/**
 * Enhanced loading skeleton for the menu grid
 * Shows placeholder cards while menu items are loading with smooth animations
 */
export function MenuGridSkeleton({
  itemCount = 12,
  className,
  showStaggeredAnimation = true,
}: MenuGridSkeletonProps) {
  return (
    <div
      className={cn(
        // Enhanced grid layout matching MenuGrid
        "grid gap-3 sm:gap-4 lg:gap-6",
        "grid-cols-1 xs:grid-cols-2",
        "sm:grid-cols-2 md:grid-cols-3",
        "lg:grid-cols-3 xl:grid-cols-4",
        "2xl:grid-cols-5 3xl:grid-cols-6",
        "auto-rows-fr",
        "[&>*]:min-w-[200px] sm:[&>*]:min-w-[220px] lg:[&>*]:min-w-[240px]",
        // Add smooth fade-in animation
        "animate-in fade-in-0 duration-700 ease-out",
        className
      )}
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <MenuItemCardSkeleton
          key={`skeleton-${index}`}
          index={index}
          showStaggeredAnimation={showStaggeredAnimation}
        />
      ))}
    </div>
  );
}

/**
 * Individual menu item card skeleton with enhanced animations
 */
function MenuItemCardSkeleton({
  index,
  showStaggeredAnimation,
}: {
  index: number;
  showStaggeredAnimation: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-in slide-in-from-bottom-4 duration-700 ease-out",
        // Smooth transition from loading to loaded state
        "transition-all duration-500 ease-out"
      )}
      style={{
        animationDelay: showStaggeredAnimation ? `${index * 75}ms` : "0ms",
      }}
    >
      <Card
        className={cn(
          "overflow-hidden h-full flex flex-col",
          "min-h-[280px] sm:min-h-[300px] lg:min-h-[320px]",
          // Enhanced pulse animation with shimmer effect
          "relative bg-gradient-to-r from-muted via-muted/50 to-muted",
          "before:absolute before:inset-0",
          "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
          "before:translate-x-[-100%] before:animate-[shimmer_2s_infinite]",
          // Smooth border animation
          "border-2 border-muted/50 hover:border-muted transition-colors duration-500"
        )}
      >
        <CardContent className="p-0 flex flex-col h-full">
          {/* Enhanced image skeleton with shimmer */}
          <div
            className={cn(
              "w-full relative overflow-hidden",
              "h-40 sm:h-44 md:h-48 lg:h-52",
              "bg-gradient-to-br from-muted via-muted/80 to-muted/60"
            )}
          >
            <Skeleton
              className={cn(
                "w-full h-full",
                // Add subtle wave animation
                "animate-pulse"
              )}
            />

            {/* Status badge skeleton */}
            <div className="absolute top-2 right-2">
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>

          {/* Enhanced content skeleton */}
          <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-5 space-y-3">
            {/* Title skeleton with varied widths */}
            <Skeleton
              className={cn(
                "h-5 animate-pulse",
                // Randomize width for more realistic appearance
                index % 3 === 0 ? "w-3/4" : index % 3 === 1 ? "w-2/3" : "w-5/6"
              )}
            />

            {/* Description skeleton with multiple lines */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full animate-pulse" />
              <Skeleton
                className={cn(
                  "h-4 animate-pulse",
                  // Vary second line width
                  index % 2 === 0 ? "w-2/3" : "w-3/4"
                )}
              />
            </div>

            {/* Price and action skeleton */}
            <div className="flex justify-between items-end pt-2 mt-auto">
              <div className="space-y-1">
                {/* Price skeleton */}
                <Skeleton className="h-6 w-20 animate-pulse" />
                {/* Menu name skeleton */}
                <Skeleton className="h-3 w-16 animate-pulse" />
              </div>

              {/* Add button skeleton */}
              <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Compact skeleton for smaller grid items
 */
export function MenuGridCompactSkeleton({
  itemCount = 8,
  className,
}: {
  itemCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 sm:gap-3",
        "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
        "animate-in fade-in-0 duration-500",
        className
      )}
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <Card
          key={`compact-skeleton-${index}`}
          className={cn(
            "overflow-hidden h-32 sm:h-36",
            "animate-pulse bg-gradient-to-br from-muted to-muted/60"
          )}
        >
          <CardContent className="p-2 h-full flex flex-col">
            <Skeleton className="w-full h-16 sm:h-20 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
