/**
 * Query Optimization Service for Staff Dashboard Performance
 * Implements lazy loading, caching, and optimized database queries
 */

import { createClient } from "@supabase/supabase-js";
import { getCacheManager } from "./redis-cache-manager";

interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

interface PaginationOptions {
  page: number;
  pageSize: number;
  totalCount?: boolean;
}

interface DashboardQueryFilters {
  businessId: string;
  staffId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string[];
  role?: string;
}

export class QueryOptimizationService {
  private supabase;
  private cacheManager;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.cacheManager = getCacheManager();
  }

  /**
   * Optimized order queries for dashboard performance
   */
  async getOrdersOptimized(
    filters: DashboardQueryFilters,
    pagination: PaginationOptions,
    options: QueryOptions = {}
  ) {
    const cacheKey = `orders:${JSON.stringify({ filters, pagination })}`;

    // Try cache first if enabled
    if (options.useCache !== false) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      let query = this.supabase
        .from("orders")
        .select(
          `
          id,
          invoice_no,
          customer_name,
          customer_phone,
          dining_option,
          status,
          total_amount,
          created_at,
          assigned_to_staff_id,
          priority_level,
          estimated_completion_time,
          order_items!inner(
            id,
            menu_item_name,
            quantity,
            item_status,
            is_kitchen_item,
            is_bar_item,
            preparation_time
          )
        `
        )
        .eq("business_id", filters.businessId);

      // Apply filters
      if (filters.staffId) {
        query = query.eq("assigned_to_staff_id", filters.staffId);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      if (filters.dateRange) {
        query = query
          .gte("created_at", filters.dateRange.start)
          .lte("created_at", filters.dateRange.end);
      }

      // Apply pagination
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      query = query
        .range(startIndex, startIndex + pagination.pageSize - 1)
        .order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const result = {
        data: data || [],
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.pageSize),
        },
      };

      // Cache the result
      if (options.useCache !== false) {
        await this.cacheManager.set(cacheKey, result, options.cacheTTL || 60);
      }

      return result;
    } catch (error) {
      console.error("Error fetching optimized orders:", error);
      throw error;
    }
  }

  /**
   * Optimized inventory queries with lazy loading
   */
  async getInventoryOptimized(
    businessId: string,
    options: {
      category?: string;
      lowStock?: boolean;
      search?: string;
      pagination?: PaginationOptions;
      useCache?: boolean;
    } = {}
  ) {
    const cacheKey = `inventory:${businessId}:${JSON.stringify(options)}`;

    if (options.useCache !== false) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      let query = this.supabase
        .from("inventory_items")
        .select(
          `
          id,
          name,
          description,
          current_stock,
          minimum_stock,
          maximum_stock,
          unit_cost,
          unit_of_measure,
          is_available,
          expiry_date,
          category_id,
          inventory_categories(name, category_type)
        `
        )
        .eq("business_id", businessId);

      // Apply filters
      if (options.category) {
        query = query.eq("category_id", options.category);
      }

      if (options.lowStock) {
        query = query.or(
          "current_stock.lte.minimum_stock,is_available.eq.false"
        );
      }

      if (options.search) {
        query = query.ilike("name", `%${options.search}%`);
      }

      // Apply pagination if provided
      if (options.pagination) {
        const startIndex =
          (options.pagination.page - 1) * options.pagination.pageSize;
        query = query
          .range(startIndex, startIndex + options.pagination.pageSize - 1)
          .order("name");
      } else {
        query = query.order("name").limit(100); // Default limit
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const result = {
        data: data || [],
        pagination: options.pagination
          ? {
              page: options.pagination.page,
              pageSize: options.pagination.pageSize,
              totalCount: count || 0,
              totalPages: Math.ceil((count || 0) / options.pagination.pageSize),
            }
          : null,
      };

      // Cache for 2 minutes (inventory changes frequently)
      if (options.useCache !== false) {
        await this.cacheManager.set(cacheKey, result, 120);
      }

      return result;
    } catch (error) {
      console.error("Error fetching optimized inventory:", error);
      throw error;
    }
  }

  /**
   * Optimized staff activity queries for performance tracking
   */
  async getStaffActivityOptimized(
    staffId: string,
    dateRange: { start: string; end: string },
    options: {
      activityTypes?: string[];
      pagination?: PaginationOptions;
      useCache?: boolean;
    } = {}
  ) {
    const cacheKey = `staff_activity:${staffId}:${JSON.stringify({
      dateRange,
      options,
    })}`;

    if (options.useCache !== false) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      let query = this.supabase
        .from("staff_activity_logs")
        .select(
          `
          id,
          activity_type,
          activity_details,
          performance_metrics,
          timestamp,
          shift_date
        `
        )
        .eq("staff_id", staffId)
        .gte("timestamp", dateRange.start)
        .lte("timestamp", dateRange.end);

      if (options.activityTypes && options.activityTypes.length > 0) {
        query = query.in("activity_type", options.activityTypes);
      }

      // Apply pagination
      if (options.pagination) {
        const startIndex =
          (options.pagination.page - 1) * options.pagination.pageSize;
        query = query.range(
          startIndex,
          startIndex + options.pagination.pageSize - 1
        );
      }

      query = query.order("timestamp", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const result = {
        data: data || [],
        pagination: options.pagination
          ? {
              page: options.pagination.page,
              pageSize: options.pagination.pageSize,
              totalCount: count || 0,
              totalPages: Math.ceil((count || 0) / options.pagination.pageSize),
            }
          : null,
      };

      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      console.error("Error fetching optimized staff activity:", error);
      throw error;
    }
  }

  /**
   * Optimized inventory requests queries
   */
  async getInventoryRequestsOptimized(
    businessId: string,
    options: {
      status?: string[];
      staffId?: string;
      urgencyLevel?: string[];
      pagination?: PaginationOptions;
      useCache?: boolean;
    } = {}
  ) {
    const cacheKey = `inventory_requests:${businessId}:${JSON.stringify(
      options
    )}`;

    if (options.useCache !== false) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      let query = this.supabase
        .from("inventory_requests")
        .select(
          `
          id,
          status,
          urgency_level,
          justification,
          total_estimated_cost,
          created_at,
          approved_at,
          staff!inventory_requests_requested_by_staff_id_fkey(
            id,
            first_name,
            last_name,
            role
          ),
          inventory_request_items(
            id,
            requested_quantity,
            approved_quantity,
            estimated_unit_cost,
            approved_unit_cost,
            inventory_items(
              id,
              name,
              unit_of_measure
            )
          )
        `
        )
        .eq("business_id", businessId);

      // Apply filters
      if (options.status && options.status.length > 0) {
        query = query.in("status", options.status);
      }

      if (options.staffId) {
        query = query.eq("requested_by_staff_id", options.staffId);
      }

      if (options.urgencyLevel && options.urgencyLevel.length > 0) {
        query = query.in("urgency_level", options.urgencyLevel);
      }

      // Apply pagination
      if (options.pagination) {
        const startIndex =
          (options.pagination.page - 1) * options.pagination.pageSize;
        query = query.range(
          startIndex,
          startIndex + options.pagination.pageSize - 1
        );
      }

      query = query.order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const result = {
        data: data || [],
        pagination: options.pagination
          ? {
              page: options.pagination.page,
              pageSize: options.pagination.pageSize,
              totalCount: count || 0,
              totalPages: Math.ceil((count || 0) / options.pagination.pageSize),
            }
          : null,
      };

      // Cache for 1 minute (requests change frequently)
      await this.cacheManager.set(cacheKey, result, 60);

      return result;
    } catch (error) {
      console.error("Error fetching optimized inventory requests:", error);
      throw error;
    }
  }

  /**
   * Optimized dashboard summary data
   */
  async getDashboardSummaryOptimized(
    businessId: string,
    staffRole: string,
    options: { useCache?: boolean } = {}
  ) {
    const cacheKey = `dashboard_summary:${businessId}:${staffRole}`;

    if (options.useCache !== false) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      // Parallel queries for better performance
      const [ordersToday, pendingOrders, inventoryAlerts, staffActivity] =
        await Promise.all([
          // Today's orders count
          this.supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .gte("created_at", `${today}T00:00:00.000Z`)
            .lte("created_at", `${today}T23:59:59.999Z`),

          // Pending orders count
          this.supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .in("status", ["pending", "processing"]),

          // Inventory alerts count
          this.supabase
            .from("inventory_alerts")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .eq("is_resolved", false),

          // Recent staff activity count
          this.supabase
            .from("staff_activity_logs")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .gte(
              "timestamp",
              new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            ),
        ]);

      const summary = {
        orders_today: ordersToday.count || 0,
        pending_orders: pendingOrders.count || 0,
        inventory_alerts: inventoryAlerts.count || 0,
        staff_activity_24h: staffActivity.count || 0,
        last_updated: new Date().toISOString(),
      };

      // Cache for 30 seconds (summary data changes frequently)
      await this.cacheManager.set(cacheKey, summary, 30);

      return summary;
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      throw error;
    }
  }

  /**
   * Lazy loading implementation for large datasets
   */
  async lazyLoadData<T>(
    tableName: string,
    selectQuery: string,
    filters: Record<string, any>,
    options: {
      batchSize?: number;
      orderBy?: string;
      orderDirection?: "asc" | "desc";
      onBatch?: (batch: T[], batchNumber: number) => void;
    } = {}
  ): Promise<T[]> {
    const batchSize = options.batchSize || 50;
    const results: T[] = [];
    let offset = 0;
    let hasMore = true;
    let batchNumber = 1;

    while (hasMore) {
      try {
        let query = this.supabase
          .from(tableName)
          .select(selectQuery)
          .range(offset, offset + batchSize - 1);

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        });

        // Apply ordering
        if (options.orderBy) {
          query = query.order(options.orderBy, {
            ascending: options.orderDirection === "asc",
          });
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        results.push(...(data as T[]));

        // Call batch callback if provided
        if (options.onBatch) {
          options.onBatch(data as T[], batchNumber);
        }

        // Check if we have more data
        hasMore = data.length === batchSize;
        offset += batchSize;
        batchNumber++;

        // Add small delay to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error(`Error in lazy loading batch ${batchNumber}:`, error);
        hasMore = false;
      }
    }

    return results;
  }

  /**
   * Invalidate related caches when data changes
   */
  async invalidateRelatedCaches(
    dataType: "orders" | "inventory" | "staff_activity" | "inventory_requests",
    businessId: string,
    additionalKeys: string[] = []
  ): Promise<void> {
    const patterns = [
      `${dataType}:${businessId}:*`,
      `dashboard_summary:${businessId}:*`,
      ...additionalKeys,
    ];

    await Promise.all(
      patterns.map((pattern) => this.cacheManager.invalidatePattern(pattern))
    );
  }

  /**
   * Preload critical dashboard data
   */
  async preloadDashboardData(
    businessId: string,
    staffRole: string
  ): Promise<void> {
    const preloadTasks = [
      // Preload dashboard summary
      this.getDashboardSummaryOptimized(businessId, staffRole),

      // Preload recent orders
      this.getOrdersOptimized(
        { businessId, status: ["pending", "processing"] },
        { page: 1, pageSize: 20 }
      ),

      // Preload inventory alerts
      this.getInventoryOptimized(businessId, {
        lowStock: true,
        pagination: { page: 1, pageSize: 10 },
      }),
    ];

    // Execute preload tasks in parallel
    await Promise.allSettled(preloadTasks);
  }
}

// Singleton instance
let queryOptimizationService: QueryOptimizationService | null = null;

/**
 * Get or create query optimization service instance
 */
export function getQueryOptimizationService(): QueryOptimizationService {
  if (!queryOptimizationService) {
    queryOptimizationService = new QueryOptimizationService();
  }
  return queryOptimizationService;
}
