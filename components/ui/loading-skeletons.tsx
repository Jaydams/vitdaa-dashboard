import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Sales Overview Loading Skeleton
export function SalesOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`sales-skeleton-${index}`}
          className="p-4 sm:p-6 rounded-lg flex flex-col items-center justify-center space-y-3 bg-gray-100 dark:bg-gray-800 min-h-[120px] sm:min-h-[140px] animate-pulse"
        >
          <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-md" />
          <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
          <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
        </div>
      ))}
    </div>
  );
}

// Status Overview Loading Skeleton
export function StatusOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={`status-skeleton-${index}`}
          className="transition-all duration-200 animate-pulse"
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
  );
}

// Chart Loading Skeleton
export function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="h-64 sm:h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-8 mx-auto rounded-full" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dashboard Charts Loading Skeleton
export function DashboardChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <ChartSkeleton title="Weekly Sales" />
      <ChartSkeleton title="Best Sellers" />
    </div>
  );
}

// Full Dashboard Loading Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <SalesOverviewSkeleton />
      <StatusOverviewSkeleton />
      <DashboardChartsSkeleton />
    </div>
  );
}

// Inline Loading Spinner
export function LoadingSpinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
    />
  );
}

// Retry Button Component
export function RetryButton({
  onRetry,
  isRetrying = false,
  className = "",
}: {
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onRetry}
      disabled={isRetrying}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isRetrying ? (
        <>
          <LoadingSpinner size="sm" />
          Retrying...
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Try Again
        </>
      )}
    </button>
  );
}
