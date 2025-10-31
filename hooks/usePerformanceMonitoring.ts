import { useState, useEffect, useCallback, useRef } from "react";
import { PerformanceMetrics } from "@/lib/audit-logger";

interface NetworkMetrics {
  latency: number;
  isOnline: boolean;
  lastCheck: Date;
}

interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
}

interface SystemMetrics {
  memory: MemoryMetrics;
  network: NetworkMetrics;
  fps: number;
  timestamp: Date;
}

interface PerformanceThresholds {
  memoryWarning: number; // percentage
  memoryCritical: number; // percentage
  latencyWarning: number; // milliseconds
  latencyCritical: number; // milliseconds
  fpsWarning: number; // frames per second
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  memoryWarning: 75,
  memoryCritical: 90,
  latencyWarning: 1000,
  latencyCritical: 2000,
  fpsWarning: 30,
};

/**
 * Hook for comprehensive performance monitoring
 */
export function usePerformanceMonitoring(
  enabled: boolean = true,
  thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS
) {
  const [performanceMetrics, setPerformanceMetrics] = useState<
    PerformanceMetrics[]
  >([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(
    null
  );
  const [alerts, setAlerts] = useState<string[]>([]);

  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsCounterRef = useRef<{ frames: number; lastTime: number }>({
    frames: 0,
    lastTime: 0,
  });
  const networkTestRef = useRef<AbortController | null>(null);

  // Collect system metrics
  const collectSystemMetrics = useCallback(async (): Promise<SystemMetrics> => {
    // Memory metrics
    const memory: MemoryMetrics = (() => {
      if (typeof performance !== "undefined" && "memory" in performance) {
        const memInfo = (performance as any).memory;
        return {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          percentage: (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100,
        };
      }
      return { used: 0, total: 0, percentage: 0 };
    })();

    // Network metrics
    const network: NetworkMetrics = await (async () => {
      const isOnline = navigator.onLine;
      let latency = -1;

      if (isOnline) {
        try {
          // Cancel previous test if still running
          if (networkTestRef.current) {
            networkTestRef.current.abort();
          }

          networkTestRef.current = new AbortController();
          const start = performance.now();

          await fetch("/api/health", {
            method: "HEAD",
            signal: networkTestRef.current.signal,
          });

          latency = performance.now() - start;
        } catch (error) {
          if (error instanceof Error && error.name !== "AbortError") {
            latency = -1;
          }
        }
      }

      return {
        latency,
        isOnline,
        lastCheck: new Date(),
      };
    })();

    // FPS calculation
    const fps = (() => {
      const now = performance.now();
      const { frames, lastTime } = fpsCounterRef.current;

      if (lastTime === 0) {
        fpsCounterRef.current = { frames: 1, lastTime: now };
        return 60; // Default assumption
      }

      const deltaTime = now - lastTime;
      if (deltaTime >= 1000) {
        // Calculate FPS every second
        const currentFps = (frames * 1000) / deltaTime;
        fpsCounterRef.current = { frames: 0, lastTime: now };
        return currentFps;
      }

      fpsCounterRef.current.frames++;
      return 60; // Return previous value if not enough time has passed
    })();

    return {
      memory,
      network,
      fps,
      timestamp: new Date(),
    };
  }, []);

  // Check performance thresholds and generate alerts
  const checkThresholds = useCallback(
    (metrics: SystemMetrics) => {
      const newAlerts: string[] = [];

      // Memory alerts
      if (metrics.memory.percentage > thresholds.memoryCritical) {
        newAlerts.push(
          `Critical memory usage: ${metrics.memory.percentage.toFixed(1)}%`
        );
      } else if (metrics.memory.percentage > thresholds.memoryWarning) {
        newAlerts.push(
          `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`
        );
      }

      // Network alerts
      if (!metrics.network.isOnline) {
        newAlerts.push("Network connection lost");
      } else if (metrics.network.latency > thresholds.latencyCritical) {
        newAlerts.push(
          `Critical network latency: ${metrics.network.latency.toFixed(0)}ms`
        );
      } else if (metrics.network.latency > thresholds.latencyWarning) {
        newAlerts.push(
          `High network latency: ${metrics.network.latency.toFixed(0)}ms`
        );
      }

      // FPS alerts
      if (metrics.fps < thresholds.fpsWarning) {
        newAlerts.push(`Low frame rate: ${metrics.fps.toFixed(1)} FPS`);
      }

      setAlerts(newAlerts);
    },
    [thresholds]
  );

  // Record a performance metric
  const recordMetric = useCallback((metric: PerformanceMetrics) => {
    setPerformanceMetrics((prev) => {
      const updated = [...prev, metric];
      // Keep only last 100 metrics to prevent memory issues
      return updated.slice(-100);
    });
  }, []);

  // Measure operation performance
  const measureOperation = useCallback(
    async <T>(
      operationType: string,
      operation: () => Promise<T>
    ): Promise<T> => {
      const startTime = performance.now();
      const startMemory = systemMetrics?.memory.used || 0;

      try {
        const result = await operation();

        const endTime = performance.now();
        const duration = endTime - startTime;
        const endMemory = systemMetrics?.memory.used || 0;

        const metric: PerformanceMetrics = {
          operationType,
          duration,
          memoryUsage: endMemory - startMemory,
          networkLatency: systemMetrics?.network.latency,
          errorCount: 0,
          timestamp: new Date(),
        };

        recordMetric(metric);
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        const metric: PerformanceMetrics = {
          operationType,
          duration,
          errorCount: 1,
          timestamp: new Date(),
        };

        recordMetric(metric);
        throw error;
      }
    },
    [systemMetrics, recordMetric]
  );

  // Measure synchronous operation performance
  const measureSyncOperation = useCallback(
    <T>(operationType: string, operation: () => T): T => {
      const startTime = performance.now();
      const startMemory = systemMetrics?.memory.used || 0;

      try {
        const result = operation();

        const endTime = performance.now();
        const duration = endTime - startTime;
        const endMemory = systemMetrics?.memory.used || 0;

        const metric: PerformanceMetrics = {
          operationType,
          duration,
          memoryUsage: endMemory - startMemory,
          networkLatency: systemMetrics?.network.latency,
          errorCount: 0,
          timestamp: new Date(),
        };

        recordMetric(metric);
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        const metric: PerformanceMetrics = {
          operationType,
          duration,
          errorCount: 1,
          timestamp: new Date(),
        };

        recordMetric(metric);
        throw error;
      }
    },
    [systemMetrics, recordMetric]
  );

  // Clear all metrics
  const clearMetrics = useCallback(() => {
    setPerformanceMetrics([]);
    setAlerts([]);
  }, []);

  // Get performance statistics
  const getPerformanceStats = useCallback(() => {
    if (performanceMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        errorRate: 0,
        operationTypes: {},
      };
    }

    const totalDuration = performanceMetrics.reduce(
      (sum, metric) => sum + metric.duration,
      0
    );
    const totalErrors = performanceMetrics.reduce(
      (sum, metric) => sum + (metric.errorCount || 0),
      0
    );
    const averageDuration = totalDuration / performanceMetrics.length;
    const errorRate = (totalErrors / performanceMetrics.length) * 100;

    const operationTypes = performanceMetrics.reduce((acc, metric) => {
      acc[metric.operationType] = (acc[metric.operationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOperations: performanceMetrics.length,
      averageDuration,
      errorRate,
      operationTypes,
    };
  }, [performanceMetrics]);

  // Start/stop monitoring
  useEffect(() => {
    if (!enabled) {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      return;
    }

    // Initial collection
    collectSystemMetrics().then((metrics) => {
      setSystemMetrics(metrics);
      checkThresholds(metrics);
    });

    // Set up periodic collection
    metricsIntervalRef.current = setInterval(async () => {
      try {
        const metrics = await collectSystemMetrics();
        setSystemMetrics(metrics);
        checkThresholds(metrics);
      } catch (error) {
        console.error("Error collecting system metrics:", error);
      }
    }, 5000); // Collect every 5 seconds

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      if (networkTestRef.current) {
        networkTestRef.current.abort();
      }
    };
  }, [enabled, collectSystemMetrics, checkThresholds]);

  // FPS counter using requestAnimationFrame
  useEffect(() => {
    if (!enabled) return;

    let animationId: number;

    const countFrame = () => {
      fpsCounterRef.current.frames++;
      animationId = requestAnimationFrame(countFrame);
    };

    animationId = requestAnimationFrame(countFrame);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enabled]);

  return {
    // Metrics data
    performanceMetrics,
    systemMetrics,
    alerts,

    // Performance measurement functions
    measureOperation,
    measureSyncOperation,
    recordMetric,

    // Utility functions
    clearMetrics,
    getPerformanceStats,

    // System health indicators
    isHealthy: alerts.length === 0,
    hasWarnings: alerts.some(
      (alert) => alert.includes("High") || alert.includes("Low")
    ),
    hasCriticalIssues: alerts.some(
      (alert) => alert.includes("Critical") || alert.includes("lost")
    ),
  };
}

/**
 * Hook for monitoring specific component performance
 */
export function useComponentPerformanceMonitoring(componentName: string) {
  const { measureOperation, measureSyncOperation, recordMetric } =
    usePerformanceMonitoring();
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(Date.now());

  // Track component renders
  useEffect(() => {
    renderCountRef.current++;

    const renderTime = Date.now() - mountTimeRef.current;

    recordMetric({
      operationType: `${componentName}_render`,
      duration: renderTime,
      errorCount: 0,
      timestamp: new Date(),
    });
  });

  // Track component mount/unmount
  useEffect(() => {
    mountTimeRef.current = Date.now();

    return () => {
      const totalMountTime = Date.now() - mountTimeRef.current;

      recordMetric({
        operationType: `${componentName}_lifecycle`,
        duration: totalMountTime,
        errorCount: 0,
        timestamp: new Date(),
      });
    };
  }, [componentName, recordMetric]);

  return {
    measureOperation: (operationType: string, operation: () => Promise<any>) =>
      measureOperation(`${componentName}_${operationType}`, operation),
    measureSyncOperation: (operationType: string, operation: () => any) =>
      measureSyncOperation(`${componentName}_${operationType}`, operation),
    getRenderCount: () => renderCountRef.current,
    getMountTime: () => mountTimeRef.current,
  };
}
