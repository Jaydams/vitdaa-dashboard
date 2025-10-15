/**
 * Performance Monitoring Service for Staff Dashboard Optimization
 * Tracks API response times, database query performance, and system metrics
 */

interface PerformanceMetric {
  id: string;
  type: "api" | "database" | "cache" | "component";
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  operation: string;
  count: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  errorCount: number;
  p95Duration: number;
  p99Duration: number;
}

interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cacheStats: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
  };
  databaseStats: {
    activeConnections: number;
    averageQueryTime: number;
    slowQueries: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics
  private isEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_PERFORMANCE_MONITORING === "true";

  /**
   * Record a performance metric
   */
  recordMetric(
    type: PerformanceMetric["type"],
    operation: string,
    duration: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      operation,
      duration,
      timestamp: Date.now(),
      success,
      error,
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (duration > this.getSlowThreshold(type)) {
      console.warn(`Slow ${type} operation detected:`, {
        operation,
        duration: `${duration}ms`,
        metadata,
      });
    }
  }

  /**
   * Get slow operation threshold by type
   */
  private getSlowThreshold(type: PerformanceMetric["type"]): number {
    switch (type) {
      case "api":
        return 1000; // 1 second
      case "database":
        return 500; // 500ms
      case "cache":
        return 50; // 50ms
      case "component":
        return 100; // 100ms
      default:
        return 1000;
    }
  }

  /**
   * Measure and record an async operation
   */
  async measureAsync<T>(
    type: PerformanceMetric["type"],
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric(type, operation, duration, success, error, metadata);
    }
  }

  /**
   * Measure and record a synchronous operation
   */
  measureSync<T>(
    type: PerformanceMetric["type"],
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = fn();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric(type, operation, duration, success, error, metadata);
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(
    operation?: string,
    type?: PerformanceMetric["type"]
  ): PerformanceStats[] {
    let filteredMetrics = this.metrics;

    if (operation) {
      filteredMetrics = filteredMetrics.filter(
        (m) => m.operation === operation
      );
    }

    if (type) {
      filteredMetrics = filteredMetrics.filter((m) => m.type === type);
    }

    // Group by operation
    const grouped = filteredMetrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = [];
      }
      acc[metric.operation].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    return Object.entries(grouped).map(([op, metrics]) => {
      const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
      const successCount = metrics.filter((m) => m.success).length;

      return {
        operation: op,
        count: metrics.length,
        averageDuration:
          durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: durations[0] || 0,
        maxDuration: durations[durations.length - 1] || 0,
        successRate: (successCount / metrics.length) * 100,
        errorCount: metrics.length - successCount,
        p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
        p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
      };
    });
  }

  /**
   * Get recent metrics (last N minutes)
   */
  getRecentMetrics(minutes = 5): PerformanceMetric[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  /**
   * Get slow operations
   */
  getSlowOperations(minutes = 5): PerformanceMetric[] {
    const recentMetrics = this.getRecentMetrics(minutes);
    return recentMetrics.filter(
      (m) => m.duration > this.getSlowThreshold(m.type)
    );
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(minutes = 5): PerformanceMetric[] {
    const recentMetrics = this.getRecentMetrics(minutes);
    return recentMetrics.filter((m) => !m.success);
  }

  /**
   * Get system health score (0-100)
   */
  getHealthScore(): number {
    const recentMetrics = this.getRecentMetrics(5);

    if (recentMetrics.length === 0) return 100;

    const successRate =
      (recentMetrics.filter((m) => m.success).length / recentMetrics.length) *
      100;
    const slowOperations = recentMetrics.filter(
      (m) => m.duration > this.getSlowThreshold(m.type)
    );
    const slowRate = (slowOperations.length / recentMetrics.length) * 100;

    // Health score based on success rate and performance
    const healthScore = Math.max(0, successRate - slowRate * 0.5);
    return Math.round(healthScore);
  }

  /**
   * Generate performance report
   */
  generateReport(minutes = 60): {
    summary: {
      totalOperations: number;
      successRate: number;
      averageResponseTime: number;
      healthScore: number;
    };
    topSlowOperations: PerformanceStats[];
    errorSummary: {
      totalErrors: number;
      errorsByType: Record<string, number>;
      recentErrors: PerformanceMetric[];
    };
    systemMetrics: SystemMetrics | null;
  } {
    const recentMetrics = this.getRecentMetrics(minutes);
    const stats = this.getStats();
    const errors = this.getErrorMetrics(minutes);

    // Top 10 slowest operations
    const topSlowOperations = stats
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);

    // Error summary
    const errorsByType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalOperations: recentMetrics.length,
        successRate:
          recentMetrics.length > 0
            ? (recentMetrics.filter((m) => m.success).length /
                recentMetrics.length) *
              100
            : 100,
        averageResponseTime:
          recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
              recentMetrics.length
            : 0,
        healthScore: this.getHealthScore(),
      },
      topSlowOperations,
      errorSummary: {
        totalErrors: errors.length,
        errorsByType,
        recentErrors: errors.slice(-10), // Last 10 errors
      },
      systemMetrics: this.getSystemMetrics(),
    };
  }

  /**
   * Get system metrics (if available)
   */
  private getSystemMetrics(): SystemMetrics | null {
    if (typeof window === "undefined") {
      // Server-side metrics
      try {
        const memUsage = process.memoryUsage();
        return {
          memoryUsage: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal,
            percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
          },
          cacheStats: {
            hitRate: 0, // Would be populated by cache manager
            missRate: 0,
            totalRequests: 0,
          },
          databaseStats: {
            activeConnections: 0, // Would be populated by database monitor
            averageQueryTime: 0,
            slowQueries: 0,
          },
        };
      } catch {
        return null;
      }
    } else {
      // Client-side metrics
      try {
        const nav = navigator as any;
        const memory = nav.memory;

        if (memory) {
          return {
            memoryUsage: {
              used: memory.usedJSHeapSize,
              total: memory.totalJSHeapSize,
              percentage:
                (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
            },
            cacheStats: {
              hitRate: 0,
              missRate: 0,
              totalRequests: 0,
            },
            databaseStats: {
              activeConnections: 0,
              averageQueryTime: 0,
              slowQueries: 0,
            },
          };
        }
      } catch {
        // Memory API not available
      }
      return null;
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Set monitoring enabled/disabled
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get monitoring status
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * Get or create performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(
  type: PerformanceMetric["type"],
  operation?: string
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const operationName =
      operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      return await monitor.measureAsync(type, operationName, () =>
        method.apply(this, args)
      );
    };
  };
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor() {
  const monitor = getPerformanceMonitor();

  const measureAsync = async <T>(
    type: PerformanceMetric["type"],
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return await monitor.measureAsync(type, operation, fn, metadata);
  };

  const measureSync = <T>(
    type: PerformanceMetric["type"],
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T => {
    return monitor.measureSync(type, operation, fn, metadata);
  };

  const getStats = (operation?: string, type?: PerformanceMetric["type"]) => {
    return monitor.getStats(operation, type);
  };

  const getHealthScore = () => {
    return monitor.getHealthScore();
  };

  const generateReport = (minutes = 60) => {
    return monitor.generateReport(minutes);
  };

  return {
    measureAsync,
    measureSync,
    getStats,
    getHealthScore,
    generateReport,
    monitor,
  };
}

/**
 * Performance monitoring middleware for API routes
 */
export function performanceMiddleware(req: any, res: any, next: () => void) {
  const monitor = getPerformanceMonitor();
  const startTime = performance.now();
  const operation = `${req.method} ${req.url}`;

  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = performance.now() - startTime;
    const success = res.statusCode < 400;

    monitor.recordMetric(
      "api",
      operation,
      duration,
      success,
      success ? undefined : `HTTP ${res.statusCode}`,
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        userAgent: req.headers["user-agent"],
      }
    );

    return originalSend.call(this, data);
  };

  next();
}
