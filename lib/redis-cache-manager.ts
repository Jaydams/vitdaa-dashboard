/**
 * Redis Cache Manager for Staff Dashboard Performance Optimization
 * Implements caching for real-time data, dashboard states, and frequently accessed information
 */

import { createClient, RedisClientType } from "redis";

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix: string;
  defaultTTL: number;
}

interface DashboardCacheData {
  orders: any[];
  inventory: any[];
  staff_activity: any[];
  notifications: any[];
  last_updated: string;
}

interface StaffPerformanceCache {
  staff_id: string;
  metrics: {
    orders_processed: number;
    average_response_time: number;
    efficiency_score: number;
    error_rate: number;
  };
  activity_summary: any[];
  last_calculated: string;
}

export class RedisCacheManager {
  private client: RedisClientType | null = null;
  private config: CacheConfig;
  private isConnected = false;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || "0"),
      keyPrefix: process.env.REDIS_KEY_PREFIX || "vitdaa_pos:",
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || "300"), // 5 minutes
      ...config,
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
        },
        password: this.config.password,
        database: this.config.db,
      });

      this.client.on("error", (err) => {
        console.error("Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("Redis Client Connected");
        this.isConnected = true;
      });

      this.client.on("disconnect", () => {
        console.log("Redis Client Disconnected");
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Generic cache get method
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const data = await this.client!.get(this.getKey(key));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  }

  /**
   * Generic cache set method
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.config.defaultTTL;

      await this.client!.setEx(this.getKey(key), expiration, serializedValue);
      return true;
    } catch (error) {
      console.error("Redis SET error:", error);
      return false;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.del(this.getKey(key));
      return true;
    } catch (error) {
      console.error("Redis DELETE error:", error);
      return false;
    }
  }

  /**
   * Cache dashboard data for a specific business and staff role
   */
  async cacheDashboardData(
    businessId: string,
    staffRole: string,
    data: DashboardCacheData,
    ttl = 60 // 1 minute for real-time data
  ): Promise<boolean> {
    const key = `dashboard:${businessId}:${staffRole}`;
    return await this.set(key, data, ttl);
  }

  /**
   * Get cached dashboard data
   */
  async getDashboardData(
    businessId: string,
    staffRole: string
  ): Promise<DashboardCacheData | null> {
    const key = `dashboard:${businessId}:${staffRole}`;
    return await this.get<DashboardCacheData>(key);
  }

  /**
   * Cache staff performance metrics
   */
  async cacheStaffPerformance(
    staffId: string,
    performance: StaffPerformanceCache,
    ttl = 300 // 5 minutes
  ): Promise<boolean> {
    const key = `staff_performance:${staffId}`;
    return await this.set(key, performance, ttl);
  }

  /**
   * Get cached staff performance metrics
   */
  async getStaffPerformance(
    staffId: string
  ): Promise<StaffPerformanceCache | null> {
    const key = `staff_performance:${staffId}`;
    return await this.get<StaffPerformanceCache>(key);
  }

  /**
   * Cache inventory alerts for a business
   */
  async cacheInventoryAlerts(
    businessId: string,
    alerts: any[],
    ttl = 120 // 2 minutes
  ): Promise<boolean> {
    const key = `inventory_alerts:${businessId}`;
    return await this.set(key, alerts, ttl);
  }

  /**
   * Get cached inventory alerts
   */
  async getInventoryAlerts(businessId: string): Promise<any[] | null> {
    const key = `inventory_alerts:${businessId}`;
    return await this.get<any[]>(key);
  }

  /**
   * Cache order queue for kitchen/bar dashboards
   */
  async cacheOrderQueue(
    businessId: string,
    queueType: "kitchen" | "bar",
    orders: any[],
    ttl = 30 // 30 seconds for real-time order data
  ): Promise<boolean> {
    const key = `order_queue:${businessId}:${queueType}`;
    return await this.set(key, orders, ttl);
  }

  /**
   * Get cached order queue
   */
  async getOrderQueue(
    businessId: string,
    queueType: "kitchen" | "bar"
  ): Promise<any[] | null> {
    const key = `order_queue:${businessId}:${queueType}`;
    return await this.get<any[]>(key);
  }

  /**
   * Cache real-time notifications
   */
  async cacheNotifications(
    staffId: string,
    notifications: any[],
    ttl = 60 // 1 minute
  ): Promise<boolean> {
    const key = `notifications:${staffId}`;
    return await this.set(key, notifications, ttl);
  }

  /**
   * Get cached notifications
   */
  async getNotifications(staffId: string): Promise<any[] | null> {
    const key = `notifications:${staffId}`;
    return await this.get<any[]>(key);
  }

  /**
   * Cache session data for offline support
   */
  async cacheSessionData(
    sessionId: string,
    sessionData: any,
    ttl = 3600 // 1 hour
  ): Promise<boolean> {
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, ttl);
  }

  /**
   * Get cached session data
   */
  async getSessionData(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    return await this.get<any>(key);
  }

  /**
   * Invalidate cache patterns (useful for data updates)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.client!.keys(this.getKey(pattern));
      if (keys.length > 0) {
        return await this.client!.del(keys);
      }
      return 0;
    } catch (error) {
      console.error("Redis INVALIDATE error:", error);
      return 0;
    }
  }

  /**
   * Invalidate dashboard cache when data changes
   */
  async invalidateDashboardCache(
    businessId: string,
    staffRole?: string
  ): Promise<void> {
    if (staffRole) {
      await this.delete(`dashboard:${businessId}:${staffRole}`);
    } else {
      await this.invalidatePattern(`dashboard:${businessId}:*`);
    }
  }

  /**
   * Invalidate staff performance cache
   */
  async invalidateStaffPerformanceCache(staffId: string): Promise<void> {
    await this.delete(`staff_performance:${staffId}`);
  }

  /**
   * Batch cache operations for efficiency
   */
  async batchSet(
    operations: Array<{ key: string; value: any; ttl?: number }>
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const pipeline = this.client!.multi();

      for (const op of operations) {
        const serializedValue = JSON.stringify(op.value);
        const expiration = op.ttl || this.config.defaultTTL;
        pipeline.setEx(this.getKey(op.key), expiration, serializedValue);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error("Redis BATCH SET error:", error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.client!.info("memory");
      const keyspace = await this.client!.info("keyspace");

      return {
        memory_info: info,
        keyspace_info: keyspace,
        connected: this.isConnected,
        config: {
          host: this.config.host,
          port: this.config.port,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
        },
      };
    } catch (error) {
      console.error("Redis STATS error:", error);
      return null;
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    details: any;
  }> {
    try {
      if (!this.isAvailable()) {
        return {
          status: "unhealthy",
          details: { error: "Redis client not connected" },
        };
      }

      const start = Date.now();
      await this.client!.ping();
      const responseTime = Date.now() - start;

      return {
        status: "healthy",
        details: {
          connected: true,
          response_time_ms: responseTime,
          host: this.config.host,
          port: this.config.port,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }
}

// Singleton instance
let cacheManager: RedisCacheManager | null = null;

/**
 * Get or create Redis cache manager instance
 */
export function getCacheManager(): RedisCacheManager {
  if (!cacheManager) {
    cacheManager = new RedisCacheManager();
  }
  return cacheManager;
}

/**
 * Initialize Redis cache manager
 */
export async function initializeCacheManager(): Promise<RedisCacheManager> {
  const manager = getCacheManager();

  try {
    await manager.connect();
    console.log("Redis Cache Manager initialized successfully");
  } catch (error) {
    console.warn(
      "Redis Cache Manager initialization failed, continuing without cache:",
      error
    );
  }

  return manager;
}

/**
 * Graceful shutdown of cache manager
 */
export async function shutdownCacheManager(): Promise<void> {
  if (cacheManager) {
    await cacheManager.disconnect();
    cacheManager = null;
  }
}
