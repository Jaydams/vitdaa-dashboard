"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSalesMetrics,
  useOrderStatusMetrics,
  useWeeklySalesData,
  useBestSellersData,
  dashboardQueryKeys,
} from "@/hooks/use-dashboard-data";
import { DashboardFilter } from "@/types/dashboard";

export interface DashboardState {
  // Data
  salesData: any;
  orderStatusData: any;
  weeklySalesData: any;
  bestSellersData: any;

  // Loading states
  isLoading: boolean;
  isRefetching: boolean;
  salesLoading: boolean;
  orderStatusLoading: boolean;
  weeklySalesLoading: boolean;
  bestSellersLoading: boolean;

  // Error states
  hasErrors: boolean;
  salesError: string | null;
  orderStatusError: string | null;
  weeklySalesError: string | null;
  bestSellersError: string | null;

  // Retry functions
  retrySalesData: () => void;
  retryOrderStatusData: () => void;
  retryWeeklySalesData: () => void;
  retryBestSellersData: () => void;
  retryAllData: () => void;

  // Utility functions
  refreshAllData: () => void;
  clearAllErrors: () => void;
}

export function useDashboardState(filter: DashboardFilter): DashboardState {
  const queryClient = useQueryClient();

  // Fetch all dashboard data
  const {
    data: salesData,
    isLoading: salesLoading,
    error: salesError,
    isRefetching: salesRefetching,
  } = useSalesMetrics(filter.dateFilter);

  const {
    data: orderStatusData,
    isLoading: orderStatusLoading,
    error: orderStatusError,
    isRefetching: orderStatusRefetching,
  } = useOrderStatusMetrics(filter.dateFilter);

  const {
    data: weeklySalesData,
    isLoading: weeklySalesLoading,
    error: weeklySalesError,
    isRefetching: weeklySalesRefetching,
  } = useWeeklySalesData(filter.dateFilter);

  const {
    data: bestSellersData,
    isLoading: bestSellersLoading,
    error: bestSellersError,
    isRefetching: bestSellersRefetching,
  } = useBestSellersData(filter.dateFilter);

  // Memoized computed states
  const computedState = useMemo(() => {
    const isLoading =
      salesLoading ||
      orderStatusLoading ||
      weeklySalesLoading ||
      bestSellersLoading;
    const isRefetching =
      salesRefetching ||
      orderStatusRefetching ||
      weeklySalesRefetching ||
      bestSellersRefetching;

    const hasErrors = !!(
      salesError ||
      orderStatusError ||
      weeklySalesError ||
      bestSellersError
    );

    const salesErrorMessage = salesError ? "Failed to load sales data" : null;
    const orderStatusErrorMessage = orderStatusError
      ? "Failed to load order status data"
      : null;
    const weeklySalesErrorMessage = weeklySalesError
      ? "Failed to load weekly sales data"
      : null;
    const bestSellersErrorMessage = bestSellersError
      ? "Failed to load best sellers data"
      : null;

    return {
      isLoading,
      isRefetching,
      hasErrors,
      salesError: salesErrorMessage,
      orderStatusError: orderStatusErrorMessage,
      weeklySalesError: weeklySalesErrorMessage,
      bestSellersError: bestSellersErrorMessage,
    };
  }, [
    salesLoading,
    orderStatusLoading,
    weeklySalesLoading,
    bestSellersLoading,
    salesRefetching,
    orderStatusRefetching,
    weeklySalesRefetching,
    bestSellersRefetching,
    salesError,
    orderStatusError,
    weeklySalesError,
    bestSellersError,
  ]);

  // Memoized data with fallbacks
  const dataWithFallbacks = useMemo(
    () => ({
      salesData: salesData || {
        today: 0,
        yesterday: 0,
        thisMonth: 0,
        lastMonth: 0,
        allTime: 0,
      },
      orderStatusData: orderStatusData || {
        total: 0,
        pending: 0,
        processing: 0,
        delivered: 0,
      },
      weeklySalesData: weeklySalesData || {
        labels: [],
        salesData: [],
        ordersData: [],
      },
      bestSellersData: bestSellersData || {
        labels: [],
        data: [],
        colors: [],
      },
    }),
    [salesData, orderStatusData, weeklySalesData, bestSellersData]
  );

  // Retry functions
  const retrySalesData = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.sales(filter.dateFilter),
    });
  };

  const retryOrderStatusData = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.orderStatus(filter.dateFilter),
    });
  };

  const retryWeeklySalesData = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.weeklySales(filter.dateFilter),
    });
  };

  const retryBestSellersData = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.bestSellers(filter.dateFilter),
    });
  };

  const retryAllData = () => {
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  };

  const refreshAllData = () => {
    queryClient.refetchQueries({ queryKey: dashboardQueryKeys.all });
  };

  const clearAllErrors = () => {
    // Reset error states by refetching
    queryClient.resetQueries({ queryKey: dashboardQueryKeys.all });
  };

  return {
    // Data
    ...dataWithFallbacks,

    // Loading states
    ...computedState,
    salesLoading,
    orderStatusLoading,
    weeklySalesLoading,
    bestSellersLoading,

    // Retry functions
    retrySalesData,
    retryOrderStatusData,
    retryWeeklySalesData,
    retryBestSellersData,
    retryAllData,

    // Utility functions
    refreshAllData,
    clearAllErrors,
  };
}

// Hook for managing dashboard loading states with enhanced error recovery
export function useDashboardLoadingState(filter: DashboardFilter) {
  const dashboardState = useDashboardState(filter);

  // Enhanced loading state with retry counts and auto-retry logic
  const enhancedState = useMemo(() => {
    const criticalErrors = [
      dashboardState.salesError,
      dashboardState.orderStatusError,
    ].filter(Boolean);

    const nonCriticalErrors = [
      dashboardState.weeklySalesError,
      dashboardState.bestSellersError,
    ].filter(Boolean);

    const hasCriticalErrors = criticalErrors.length > 0;
    const hasNonCriticalErrors = nonCriticalErrors.length > 0;
    const hasAllDataFailed =
      criticalErrors.length === 2 && nonCriticalErrors.length === 2;

    return {
      ...dashboardState,
      hasCriticalErrors,
      hasNonCriticalErrors,
      hasAllDataFailed,
      criticalErrors,
      nonCriticalErrors,
      canShowDashboard: !hasCriticalErrors,
      shouldShowPartialData: hasCriticalErrors && !hasAllDataFailed,
    };
  }, [dashboardState]);

  return enhancedState;
}
