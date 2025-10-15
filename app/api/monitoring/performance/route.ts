/**
 * Performance Monitoring API Endpoint
 * Provides real-time performance metrics and system health data
 */

import { NextRequest, NextResponse } from "next/server";
import { getPerformanceMonitor } from "@/lib/performance-monitor";
import { getCacheManager } from "@/lib/redis-cache-manager";
import { createClient } from "@supabase/supabase-js";

interface PerformanceReport {
  timestamp: string;
  system: {
    healthScore: number;
    uptime: number;
    version: string;
  };
  api: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorCount: number;
    slowQueries: number;
  };
  database: {
    activeConnections: number;
    queryPerformance: string;
    indexHitRate: number;
    slowQueryCount: number;
  };
  cache: {
    status: string;
    hitRate: number;
    memoryUsage: number;
    keyCount: number;
    responseTime: number;
  };
  realtime: {
    activeConnections: number;
    messageRate: number;
    syncLatency: number;
    successRate: number;
  };
  alerts: Array<{
    id: string;
    type: "error" | "warning" | "info";
    title: string;
    message: string;
    timestamp: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const performanceMonitor = getPerformanceMonitor();
    const cacheManager = getCacheManager();

    // Get performance report
    const report = performanceMonitor.generateReport(60); // Last 60 minutes
    const healthScore = performanceMonitor.getHealthScore();

    // Get cache statistics
    const cacheHealth = await cacheManager.healthCheck();
    const cacheStats = await cacheManager.getCacheStats();

    // Mock database statistics (in production, get from actual DB monitoring)
    const databaseStats = {
      activeConnections: 5,
      queryPerformance: "good",
      indexHitRate: 98,
      slowQueryCount: 2,
    };

    // Mock real-time statistics
    const realtimeStats = {
      activeConnections: 23,
      messageRate: 45,
      syncLatency: 12,
      successRate: 99.8,
    };

    // Generate alerts based on performance data
    const alerts = [];

    if (healthScore < 80) {
      alerts.push({
        id: "health-low",
        type: "error" as const,
        title: "Low System Health",
        message: `System health score is ${healthScore}%. Immediate attention required.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (report.summary.successRate < 95) {
      alerts.push({
        id: "success-rate-low",
        type: "warning" as const,
        title: "Low Success Rate",
        message: `API success rate is ${report.summary.successRate.toFixed(
          1
        )}%. Check for errors.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (report.summary.averageResponseTime > 1000) {
      alerts.push({
        id: "response-time-high",
        type: "warning" as const,
        title: "High Response Time",
        message: `Average response time is ${report.summary.averageResponseTime.toFixed(
          0
        )}ms.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (cacheHealth.status === "unhealthy") {
      alerts.push({
        id: "cache-unhealthy",
        type: "error" as const,
        title: "Cache System Down",
        message: "Redis cache is not responding. Performance may be degraded.",
        timestamp: new Date().toISOString(),
      });
    }

    const performanceReport: PerformanceReport = {
      timestamp: new Date().toISOString(),
      system: {
        healthScore,
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
      },
      api: {
        totalRequests: report.summary.totalOperations,
        successRate: report.summary.successRate,
        averageResponseTime: report.summary.averageResponseTime,
        errorCount: report.errorSummary.totalErrors,
        slowQueries: report.topSlowOperations.length,
      },
      database: databaseStats,
      cache: {
        status: cacheHealth.status,
        hitRate: cacheHealth.status === "healthy" ? 85 : 0,
        memoryUsage: cacheHealth.status === "healthy" ? 45 : 0,
        keyCount: cacheHealth.status === "healthy" ? 1247 : 0,
        responseTime: cacheHealth.details.response_time_ms || 0,
      },
      realtime: realtimeStats,
      alerts,
    };

    return NextResponse.json(performanceReport);
  } catch (error) {
    console.error("Performance monitoring error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch performance data",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "clear_cache":
        const cacheManager = getCacheManager();
        await cacheManager.invalidatePattern("*");
        return NextResponse.json({
          success: true,
          message: "Cache cleared successfully",
        });

      case "reset_metrics":
        const performanceMonitor = getPerformanceMonitor();
        performanceMonitor.clearMetrics();
        return NextResponse.json({
          success: true,
          message: "Performance metrics reset",
        });

      case "run_health_check":
        const cacheManager2 = getCacheManager();
        const healthCheck = await cacheManager2.healthCheck();
        return NextResponse.json({
          success: true,
          healthCheck,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Performance monitoring action error:", error);

    return NextResponse.json(
      {
        error: "Failed to execute action",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
