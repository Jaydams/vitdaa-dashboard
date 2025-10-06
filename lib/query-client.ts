import { QueryClient } from "@tanstack/react-query";

// Create a query client with optimized settings for dashboard data
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes for dashboard data
      staleTime: 5 * 60 * 1000,
      // Cache time: 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect to avoid excessive requests
      refetchOnReconnect: false,
      // Background refetch interval: 5 minutes
      refetchInterval: 5 * 60 * 1000,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    sales: (filter?: string) => ["dashboard", "sales", filter] as const,
    orderStatus: (filter?: string) =>
      ["dashboard", "order-status", filter] as const,
    weeklySales: (filter?: string) =>
      ["dashboard", "weekly-sales", filter] as const,
    bestSellers: (filter?: string) =>
      ["dashboard", "best-sellers", filter] as const,
    additional: (filter?: string) =>
      ["dashboard", "additional", filter] as const,
    comprehensive: (filter?: string) =>
      ["dashboard", "comprehensive", filter] as const,
  },
} as const;

// Helper function to serialize filter for cache keys
export function serializeFilter(filter: any): string {
  if (!filter) return "default";

  if (filter.type === "custom" && filter.startDate && filter.endDate) {
    return `${
      filter.type
    }-${filter.startDate.toISOString()}-${filter.endDate.toISOString()}`;
  }

  return filter.type || "default";
}
