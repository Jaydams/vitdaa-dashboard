"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSalesMetrics,
  getOrderStatusMetrics,
  getWeeklySalesData,
  getBestSellersData,
  getAdditionalMetrics,
  getDashboardMetrics,
} from "@/actions/dashboard-actions";
import {
  DateFilter,
  SalesMetrics,
  OrderStatusMetrics,
  WeeklySalesData,
  BestSellersData,
  AdditionalMetrics,
} from "@/types/dashboard";

// Helper function to serialize filter for cache keys
function serializeFilter(filter?: DateFilter): string {
  if (!filter) return "default";

  if (filter.type === "custom" && filter.startDate && filter.endDate) {
    return `${
      filter.type
    }-${filter.startDate.toISOString()}-${filter.endDate.toISOString()}`;
  }

  return filter.type || "default";
}

// Query keys for consistent caching
export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  sales: (filter?: DateFilter) =>
    ["dashboard", "sales", serializeFilter(filter)] as const,
  orderStatus: (filter?: DateFilter) =>
    ["dashboard", "order-status", serializeFilter(filter)] as const,
  weeklySales: (filter?: DateFilter) =>
    ["dashboard", "weekly-sales", serializeFilter(filter)] as const,
  bestSellers: (filter?: DateFilter) =>
    ["dashboard", "best-sellers", serializeFilter(filter)] as const,
  additional: (filter?: DateFilter) =>
    ["dashboard", "additional", serializeFilter(filter)] as const,
  comprehensive: (filter?: DateFilter) =>
    ["dashboard", "comprehensive", serializeFilter(filter)] as const,
};

// Hook for sales metrics with enhanced error handling
export function useSalesMetrics(filter?: DateFilter) {
  return useQuery({
    queryKey: dashboardQueryKeys.sales(filter),
    queryFn: async () => {
      try {
        return await getSalesMetrics(filter);
      } catch (error) {
        console.error("Error fetching sales metrics:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes("Unauthorized")) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable background refetch for real-time updates
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for order status metrics with enhanced error handling
export function useOrderStatusMetrics(filter?: DateFilter) {
  return useQuery({
    queryKey: dashboardQueryKeys.orderStatus(filter),
    queryFn: async () => {
      try {
        return await getOrderStatusMetrics(filter);
      } catch (error) {
        console.error("Error fetching order status metrics:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes("Unauthorized")) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for weekly sales data with enhanced error handling
export function useWeeklySalesData(filter?: DateFilter) {
  return useQuery({
    queryKey: dashboardQueryKeys.weeklySales(filter),
    queryFn: async () => {
      try {
        return await getWeeklySalesData(filter);
      } catch (error) {
        console.error("Error fetching weekly sales data:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes("Unauthorized")) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for best sellers data with enhanced error handling
export function useBestSellersData(filter?: DateFilter) {
  return useQuery({
    queryKey: dashboardQueryKeys.bestSellers(filter),
    queryFn: async () => {
      try {
        return await getBestSellersData(filter);
      } catch (error) {
        console.error("Error fetching best sellers data:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes("Unauthorized")) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for additional metrics
export function useAdditionalMetrics(filter?: DateFilter) {
  return useQuery({
    queryKey: dashboardQueryKeys.additional(filter),
    queryFn: () => getAdditionalMetrics(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook for comprehensive dashboard metrics (all data in one request)
export function useDashboardMetrics(filter?: DateFilter) {
  return useQuery({
    queryKey: dashboardQueryKeys.comprehensive(filter),
    queryFn: () => getDashboardMetrics(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook for prefetching dashboard data
export function usePrefetchDashboardData() {
  const queryClient = useQueryClient();

  const prefetchSalesMetrics = (filter?: DateFilter) => {
    return queryClient.prefetchQuery({
      queryKey: dashboardQueryKeys.sales(filter),
      queryFn: () => getSalesMetrics(filter),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchOrderStatusMetrics = (filter?: DateFilter) => {
    return queryClient.prefetchQuery({
      queryKey: dashboardQueryKeys.orderStatus(filter),
      queryFn: () => getOrderStatusMetrics(filter),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchWeeklySalesData = (filter?: DateFilter) => {
    return queryClient.prefetchQuery({
      queryKey: dashboardQueryKeys.weeklySales(filter),
      queryFn: () => getWeeklySalesData(filter),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchBestSellersData = (filter?: DateFilter) => {
    return queryClient.prefetchQuery({
      queryKey: dashboardQueryKeys.bestSellers(filter),
      queryFn: () => getBestSellersData(filter),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchDashboardMetrics = (filter?: DateFilter) => {
    return queryClient.prefetchQuery({
      queryKey: dashboardQueryKeys.comprehensive(filter),
      queryFn: () => getDashboardMetrics(filter),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    prefetchSalesMetrics,
    prefetchOrderStatusMetrics,
    prefetchWeeklySalesData,
    prefetchBestSellersData,
    prefetchDashboardMetrics,
  };
}

// Hook for invalidating dashboard cache
export function useInvalidateDashboardData() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    return queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.all,
    });
  };

  const invalidateSalesMetrics = (filter?: DateFilter) => {
    return queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.sales(filter),
    });
  };

  const invalidateOrderStatusMetrics = (filter?: DateFilter) => {
    return queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.orderStatus(filter),
    });
  };

  const invalidateWeeklySalesData = (filter?: DateFilter) => {
    return queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.weeklySales(filter),
    });
  };

  const invalidateBestSellersData = (filter?: DateFilter) => {
    return queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.bestSellers(filter),
    });
  };

  return {
    invalidateAll,
    invalidateSalesMetrics,
    invalidateOrderStatusMetrics,
    invalidateWeeklySalesData,
    invalidateBestSellersData,
  };
}
