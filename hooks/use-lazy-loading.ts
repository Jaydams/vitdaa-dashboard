/**
 * Lazy Loading Hook for Staff Dashboard Components
 * Implements efficient data loading with pagination, caching, and performance optimization
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getQueryOptimizationService } from "@/lib/query-optimization-service";

interface LazyLoadingOptions {
  pageSize?: number;
  initialLoad?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autoLoad?: boolean;
  threshold?: number; // For intersection observer
}

interface LazyLoadingState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  totalCount: number;
  totalPages: number;
}

interface LazyLoadingActions {
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  loadPage: (page: number) => Promise<void>;
}

/**
 * Generic lazy loading hook for dashboard data
 */
export function useLazyLoading<T>(
  queryFunction: (
    page: number,
    pageSize: number
  ) => Promise<{
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }>,
  options: LazyLoadingOptions = {}
): [LazyLoadingState<T>, LazyLoadingActions] {
  const {
    pageSize = 20,
    initialLoad = true,
    cacheEnabled = true,
    autoLoad = false,
    threshold = 0.8,
  } = options;

  const [state, setState] = useState<LazyLoadingState<T>>({
    data: [],
    loading: false,
    error: null,
    hasMore: true,
    page: 0,
    totalCount: 0,
    totalPages: 0,
  });

  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadData = useCallback(
    async (page: number, append = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await queryFunction(page, pageSize);

        setState((prev) => ({
          ...prev,
          data: append ? [...prev.data, ...result.data] : result.data,
          loading: false,
          page: result.pagination.page,
          totalCount: result.pagination.totalCount,
          totalPages: result.pagination.totalPages,
          hasMore: result.pagination.page < result.pagination.totalPages,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "An error occurred",
        }));
      } finally {
        loadingRef.current = false;
      }
    },
    [queryFunction, pageSize]
  );

  const loadMore = useCallback(async () => {
    if (state.hasMore && !state.loading) {
      await loadData(state.page + 1, true);
    }
  }, [state.hasMore, state.loading, state.page, loadData]);

  const refresh = useCallback(async () => {
    await loadData(1, false);
  }, [loadData]);

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      hasMore: true,
      page: 0,
      totalCount: 0,
      totalPages: 0,
    });
  }, []);

  const loadPage = useCallback(
    async (page: number) => {
      await loadData(page, false);
    },
    [loadData]
  );

  // Initial load
  useEffect(() => {
    if (initialLoad) {
      loadData(1, false);
    }
  }, [initialLoad, loadData]);

  // Auto-load with intersection observer
  useEffect(() => {
    if (autoLoad && typeof window !== "undefined") {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (target.isIntersecting && state.hasMore && !state.loading) {
            loadMore();
          }
        },
        { threshold }
      );
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [autoLoad, threshold, state.hasMore, state.loading, loadMore]);

  return [
    state,
    {
      loadMore,
      refresh,
      reset,
      loadPage,
    },
  ];
}

/**
 * Specialized hook for orders lazy loading
 */
export function useOrdersLazyLoading(
  businessId: string,
  filters: {
    status?: string[];
    staffId?: string;
    dateRange?: { start: string; end: string };
  } = {},
  options: LazyLoadingOptions = {}
) {
  const queryService = getQueryOptimizationService();

  const queryFunction = useCallback(
    async (page: number, pageSize: number) => {
      return await queryService.getOrdersOptimized(
        { businessId, ...filters },
        { page, pageSize },
        { useCache: options.cacheEnabled, cacheTTL: options.cacheTTL }
      );
    },
    [businessId, filters, queryService, options.cacheEnabled, options.cacheTTL]
  );

  return useLazyLoading(queryFunction, options);
}

/**
 * Specialized hook for inventory lazy loading
 */
export function useInventoryLazyLoading(
  businessId: string,
  filters: {
    category?: string;
    lowStock?: boolean;
    search?: string;
  } = {},
  options: LazyLoadingOptions = {}
) {
  const queryService = getQueryOptimizationService();

  const queryFunction = useCallback(
    async (page: number, pageSize: number) => {
      const result = await queryService.getInventoryOptimized(businessId, {
        ...filters,
        pagination: { page, pageSize },
        useCache: options.cacheEnabled,
      });

      return {
        data: result.data,
        pagination: result.pagination || {
          page,
          pageSize,
          totalCount: result.data.length,
          totalPages: 1,
        },
      };
    },
    [businessId, filters, queryService, options.cacheEnabled]
  );

  return useLazyLoading(queryFunction, options);
}

/**
 * Specialized hook for staff activity lazy loading
 */
export function useStaffActivityLazyLoading(
  staffId: string,
  dateRange: { start: string; end: string },
  filters: {
    activityTypes?: string[];
  } = {},
  options: LazyLoadingOptions = {}
) {
  const queryService = getQueryOptimizationService();

  const queryFunction = useCallback(
    async (page: number, pageSize: number) => {
      const result = await queryService.getStaffActivityOptimized(
        staffId,
        dateRange,
        {
          ...filters,
          pagination: { page, pageSize },
          useCache: options.cacheEnabled,
        }
      );

      return {
        data: result.data,
        pagination: result.pagination || {
          page,
          pageSize,
          totalCount: result.data.length,
          totalPages: 1,
        },
      };
    },
    [staffId, dateRange, filters, queryService, options.cacheEnabled]
  );

  return useLazyLoading(queryFunction, options);
}

/**
 * Specialized hook for inventory requests lazy loading
 */
export function useInventoryRequestsLazyLoading(
  businessId: string,
  filters: {
    status?: string[];
    staffId?: string;
    urgencyLevel?: string[];
  } = {},
  options: LazyLoadingOptions = {}
) {
  const queryService = getQueryOptimizationService();

  const queryFunction = useCallback(
    async (page: number, pageSize: number) => {
      const result = await queryService.getInventoryRequestsOptimized(
        businessId,
        {
          ...filters,
          pagination: { page, pageSize },
          useCache: options.cacheEnabled,
        }
      );

      return {
        data: result.data,
        pagination: result.pagination || {
          page,
          pageSize,
          totalCount: result.data.length,
          totalPages: 1,
        },
      };
    },
    [businessId, filters, queryService, options.cacheEnabled]
  );

  return useLazyLoading(queryFunction, options);
}

/**
 * Hook for infinite scroll implementation
 */
export function useInfiniteScroll<T>(
  queryFunction: (
    page: number,
    pageSize: number
  ) => Promise<{
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }>,
  options: LazyLoadingOptions = {}
) {
  const [state, actions] = useLazyLoading(queryFunction, {
    ...options,
    autoLoad: true,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && state.hasMore && !state.loading) {
          actions.loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [state.hasMore, state.loading, actions]);

  return {
    ...state,
    ...actions,
    sentinelRef,
  };
}

/**
 * Hook for virtual scrolling (for very large datasets)
 */
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    handleScroll,
  };
}

/**
 * Hook for debounced search with lazy loading
 */
export function useDebouncedSearch<T>(
  searchFunction: (
    query: string,
    page: number,
    pageSize: number
  ) => Promise<{
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }>,
  debounceMs = 300,
  options: LazyLoadingOptions = {}
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  const queryFunction = useCallback(
    async (page: number, pageSize: number) => {
      if (!debouncedQuery.trim()) {
        return {
          data: [],
          pagination: { page: 1, pageSize, totalCount: 0, totalPages: 0 },
        };
      }
      return await searchFunction(debouncedQuery, page, pageSize);
    },
    [searchFunction, debouncedQuery]
  );

  const [state, actions] = useLazyLoading(queryFunction, {
    ...options,
    initialLoad: false,
  });

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      actions.refresh();
    } else {
      actions.reset();
    }
  }, [debouncedQuery, actions]);

  return {
    searchQuery,
    setSearchQuery,
    ...state,
    ...actions,
  };
}
