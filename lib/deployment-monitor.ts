/**
 * Deployment Monitoring Service
 * Monitors system performance during deployment and rollout
 */

import { getPerformanceMonitor } from "./performance-monitor";
import { getCacheManager } from "./redis-cache-manager";
import { getFeatureFlagManager } from "./feature-flags";

interface DeploymentMetrics {
  version: string;
  deploymentTime: string;
  healthScore: number;
  errorRate: number;
  responseTime: number;
  featureFlagStatus: Record<string, boolean>;
  rollbackRequired: boolean;
}

export class DeploymentMonitor {
  private performanceMonitor = getPerformanceMonitor();
  private cacheManager = getCacheManager();
  private featureFlagManager = getFeatureFlagManager();

  private readonly HEALTH_THRESHOLD = 80;
  private readonly ERROR_RATE_THRESHOLD = 5;
  private readonly RESPONSE_TIME_THRESHOLD = 2000;

  /**
   * Monitor deployment health and performance
   */
  async monitorDeployment(): Promise<DeploymentMetrics> {
    const healthScore = this.performanceMonitor.getHealthScore();
    const report = this.performanceMonitor.generateReport(15); // Last 15 minutes
    const cacheHealth = await this.cacheManager.healthCheck();

    const metrics: DeploymentMetrics = {
      version: process.env.npm_package_version || "1.0.0",
      deploymentTime: new Date().toISOString(),
      healthScore,
      errorRate: this.calculateErrorRate(report),
      responseTime: report.summary.averageResponseTime,
      featureFlagStatus: this.getFeatureFlagStatus(),
      rollbackRequired: this.shouldRollback(healthScore, report),
    };

    // Log deployment metrics
    console.log("Deployment Metrics:", metrics);

    return metrics;
  }

  private calculateErrorRate(report: any): number {
    if (report.summary.totalOperations === 0) return 0;
    return (
      (report.errorSummary.totalErrors / report.summary.totalOperations) * 100
    );
  }

  private getFeatureFlagStatus(): Record<string, boolean> {
    const context = {
      environment: process.env.NODE_ENV || "development",
    };
    return this.featureFlagManager.getAllFlags(context);
  }

  private shouldRollback(healthScore: number, report: any): boolean {
    const errorRate = this.calculateErrorRate(report);

    return (
      healthScore < this.HEALTH_THRESHOLD ||
      errorRate > this.ERROR_RATE_THRESHOLD ||
      report.summary.averageResponseTime > this.RESPONSE_TIME_THRESHOLD
    );
  }
}

export const deploymentMonitor = new DeploymentMonitor();
