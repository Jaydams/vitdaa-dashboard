"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Enhanced dashboard loading skeleton that matches the actual layout
export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Date Range Filter Skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-20" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Overview Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`sales-skeleton-${index}`}
            className="p-4 sm:p-6 rounded-lg flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 min-h-[120px] sm:min-h-[140px]"
          >
            <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-md" />
            <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
            <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
          </div>
        ))}
      </div>

      {/* Status Overview Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={`status-skeleton-${index}`}
            className="transition-all duration-200"
          >
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <Skeleton className="size-10 sm:size-12 rounded-full flex-shrink-0" />
              <div className="flex flex-col gap-y-1 flex-1 min-w-0">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Weekly Sales Chart Skeleton */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="h-64 sm:h-80 flex items-end justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 flex-1"
                  >
                    <Skeleton
                      className="w-full bg-blue-200 dark:bg-blue-800 rounded-t"
                      style={{ height: `${Math.random() * 60 + 20}%` }}
                    />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Sellers Chart Skeleton */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="h-64 sm:h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="relative">
                  <Skeleton className="h-48 w-48 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Skeleton className="h-4 w-16 mx-auto" />
                      <Skeleton className="h-3 w-12 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Skeleton (if present) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`metric-skeleton-${index}`}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-8 w-8 mx-auto mb-2 rounded-full" />
              <Skeleton className="h-4 w-24 mx-auto mb-1" />
              <Skeleton className="h-6 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Minimal loading skeleton for quick loads
export function DashboardMinimalSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Sales Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

// Skeleton for individual sections
export function SalesOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`sales-skeleton-${index}`}
          className="p-4 sm:p-6 rounded-lg flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 min-h-[120px] sm:min-h-[140px] animate-pulse"
        >
          <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-md" />
          <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
          <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
        </div>
      ))}
    </div>
  );
}

export function StatusOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`status-skeleton-${index}`} className="animate-pulse">
          <CardContent className="flex items-center gap-3 p-4 sm:p-6">
            <Skeleton className="size-10 sm:size-12 rounded-full flex-shrink-0" />
            <div className="flex flex-col gap-y-1 flex-1 min-w-0">
              <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
              <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={`chart-skeleton-${index}`} className="animate-pulse">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-64 sm:h-80 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
