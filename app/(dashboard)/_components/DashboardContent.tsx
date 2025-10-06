"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import SalesOverview from "./SalesOverview";
import StatusOverview from "./StatusOverview";
import DashboardCharts from "./dashboard-charts";
import {
  useSalesMetrics,
  useOrderStatusMetrics,
  useWeeklySalesData,
  useBestSellersData,
  dashboardQueryKeys,
} from "@/hooks/use-dashboard-data";
import { parseFilterFromUrl } from "@/lib/url-validation";
import { DashboardErrorBoundary } from "@/components/error-boundary/DashboardErrorBoundary";
import { RetryButton } from "@/components/ui/loading-skeletons";
import {
  ErrorRecovery,
  DataLoadErrorRecovery,
} from "@/components/ui/error-recovery";
import { TopLoadingIndicator } from "@/components/ui/loading-indicator";

// Memoized components for better performance
const MemoizedSalesOverview = React.memo(SalesOverview);
const MemoizedStatusOverview = React.memo(StatusOverview);
const MemoizedDashboardCharts = React.memo(DashboardCharts);

export function DashboardContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Parse current filter from URL with memoization
  const currentFilter = useMemo(() => {
    return parseFilterFromUrl(searchParams);
  }, [searchParams]);

  // Use React Query hooks for data fetching with caching
  const {
    data: salesData,
    isLoading: salesLoading,
    error: salesError,
    isRefetching: salesRefetching,
  } = useSalesMetrics(currentFilter);

  const {
    data: orderStatusData,
    isLoading: orderStatusLoading,
    error: orderStatusError,
    isRefetching: orderStatusRefetching,
  } = useOrderStatusMetrics(currentFilter);

  const {
    data: weeklySalesData,
    isLoading: weeklySalesLoading,
    error: weeklySalesError,
    isRefetching: weeklySalesRefetching,
  } = useWeeklySalesData(currentFilter);

  const {
    data: bestSellersData,
    isLoading: bestSellersLoading,
    error: bestSellersError,
    isRefetching: bestSellersRefetching,
  } = useBestSellersData(currentFilter);

  // Memoized fallback data to prevent unnecessary re-renders
  const salesDataWithFallback = useMemo(
    () =>
      salesData || {
        today: 0,
        yesterday: 0,
        thisMonth: 0,
        lastMonth: 0,
        allTime: 0,
      },
    [salesData]
  );

  const orderStatusDataWithFallback = useMemo(
    () =>
      orderStatusData || {
        total: 0,
        pending: 0,
        processing: 0,
        delivered: 0,
      },
    [orderStatusData]
  );

  const weeklySalesDataWithFallback = useMemo(
    () =>
      weeklySalesData || {
        labels: [],
        salesData: [],
        ordersData: [],
      },
    [weeklySalesData]
  );

  const bestSellersDataWithFallback = useMemo(
    () =>
      bestSellersData || {
        labels: [],
        data: [],
        colors: [],
      },
    [bestSellersData]
  );

  // Memoized loading and error states
  const isAnyLoading = useMemo(
    () =>
      salesLoading ||
      orderStatusLoading ||
      weeklySalesLoading ||
      bestSellersLoading,
    [salesLoading, orderStatusLoading, weeklySalesLoading, bestSellersLoading]
  );

  const isAnyRefetching = useMemo(
    () =>
      salesRefetching ||
      orderStatusRefetching ||
      weeklySalesRefetching ||
      bestSellersRefetching,
    [
      salesRefetching,
      orderStatusRefetching,
      weeklySalesRefetching,
      bestSellersRefetching,
    ]
  );

  const errorMessages = useMemo(
    () => ({
      sales: salesError ? "Failed to load sales data" : undefined,
      orderStatus: orderStatusError
        ? "Failed to load order status data"
        : undefined,
      charts:
        weeklySalesError || bestSellersError
          ? "Failed to load charts data"
          : undefined,
    }),
    [salesError, orderStatusError, weeklySalesError, bestSellersError]
  );

  // Retry functions for manual retry
  const retrySalesData = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.sales(currentFilter),
    });
  };

  const retryOrderStatusData = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.orderStatus(currentFilter),
    });
  };

  const retryChartsData = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.weeklySales(currentFilter),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.bestSellers(currentFilter),
    });
  };

  const retryAllData = () => {
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  };

  // Check if all data failed to load
  const hasAllDataFailed =
    salesError && orderStatusError && (weeklySalesError || bestSellersError);

  return (
    <DashboardErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Dashboard Error Boundary:", error, errorInfo);
        // You can add error reporting here (e.g., Sentry, LogRocket, etc.)
      }}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Global loading indicator for refetching */}
        <TopLoadingIndicator
          isRefreshing={isAnyRefetching && !isAnyLoading}
          message="Updating dashboard data..."
        />

        {/* Global error state with retry all option */}
        {hasAllDataFailed && !isAnyLoading && (
          <ErrorRecovery
            error="Unable to load dashboard data"
            title="Dashboard Unavailable"
            description="There seems to be a connectivity issue. Please try again."
            onRetry={retryAllData}
            variant="banner"
            size="md"
            autoRetry={true}
            autoRetryDelay={5000}
            className="mb-6"
          />
        )}

        {/* Sales Overview */}
        <section className="w-full">
          <DashboardErrorBoundary
            fallback={
              <DataLoadErrorRecovery
                error="Failed to load sales overview"
                onRetry={retrySalesData}
                variant="inline"
                size="sm"
              />
            }
          >
            <MemoizedSalesOverview
              data={salesDataWithFallback}
              isLoading={salesLoading}
              error={errorMessages.sales}
              filter={currentFilter}
            />
          </DashboardErrorBoundary>
        </section>

        {/* Status Overview */}
        <section className="w-full">
          <DashboardErrorBoundary
            fallback={
              <DataLoadErrorRecovery
                error="Failed to load status overview"
                onRetry={retryOrderStatusData}
                variant="inline"
                size="sm"
              />
            }
          >
            <MemoizedStatusOverview
              data={orderStatusDataWithFallback}
              isLoading={orderStatusLoading}
              error={errorMessages.orderStatus}
            />
          </DashboardErrorBoundary>
        </section>

        {/* Dashboard Charts */}
        <section className="w-full">
          <DashboardErrorBoundary
            fallback={
              <DataLoadErrorRecovery
                error="Failed to load charts"
                onRetry={retryChartsData}
                variant="inline"
                size="sm"
              />
            }
          >
            <MemoizedDashboardCharts
              weeklySalesData={weeklySalesDataWithFallback}
              bestSellersData={bestSellersDataWithFallback}
              isLoading={weeklySalesLoading || bestSellersLoading}
              error={errorMessages.charts}
            />
          </DashboardErrorBoundary>
        </section>
      </div>
    </DashboardErrorBoundary>
  );
}
