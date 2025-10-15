/**
 * Feature Flags System for Staff Dashboard Deployment
 * Enables gradual rollout and monitoring of new features
 */

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userRoles?: string[];
    businessIds?: string[];
    environment?: string[];
  };
  metadata?: {
    createdAt: string;
    createdBy: string;
    lastModified: string;
    version: string;
  };
}

interface FeatureFlagContext {
  userId?: string;
  userRole?: string;
  businessId?: string;
  environment: string;
  sessionId?: string;
}

class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private cache: Map<string, boolean> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags() {
    const defaultFlags: FeatureFlag[] = [
      {
        key: "enhanced_staff_dashboards",
        name: "Enhanced Staff Dashboards",
        description:
          "Enable the new functional staff dashboards with real-time features",
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          environment: ["development", "staging", "production"],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: "system",
          lastModified: new Date().toISOString(),
          version: "1.0.0",
        },
      },
      {
        key: "redis_caching",
        name: "Redis Caching",
        description: "Enable Redis caching for improved performance",
        enabled: true,
        rolloutPercentage: 80,
        conditions: {
          environment: ["staging", "production"],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: "system",
          lastModified: new Date().toISOString(),
          version: "1.0.0",
        },
      },
      {
        key: "performance_monitoring",
        name: "Performance Monitoring",
        description:
          "Enable detailed performance monitoring and metrics collection",
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          userRoles: ["admin", "accountant"],
          environment: ["development", "staging", "production"],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: "system",
          lastModified: new Date().toISOString(),
          version: "1.0.0",
        },
      },
      {
        key: "realtime_sync",
        name: "Real-time Synchronization",
        description:
          "Enable real-time synchronization between staff dashboards",
        enabled: true,
        rolloutPercentage: 90,
        conditions: {
          environment: ["staging", "production"],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: "system",
          lastModified: new Date().toISOString(),
          version: "1.0.0",
        },
      },
      {
        key: "lazy_loading",
        name: "Lazy Loading",
        description:
          "Enable lazy loading for large datasets and improved performance",
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          environment: ["development", "staging", "production"],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: "system",
          lastModified: new Date().toISOString(),
          version: "1.0.0",
        },
      },
      {
        key: "mobile_optimization",
        name: "Mobile Optimization",
        description:
          "Enable mobile-specific optimizations and responsive features",
        enabled: true,
        rolloutPercentage: 95,
        conditions: {
          environment: ["staging", "production"],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: "system",
          lastModified: new Date().toISOString(),
          version: "1.0.0",
        },
      },
      {
        key: "advanced_analytics",
        name: "Advanced Analytics",
        description: "Enable advanced analytics and reporting features",
        enabled: false,
        rolloutPercentage: 25,
        conditions: {
          userRoles: ["admin", "accountant"],
          environment: ["staging"],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: "system",
          lastModified: new Date().toISOString(),
          version: "1.0.0",
        },
      },
    ];

    defaultFlags.forEach((flag) => {
      this.flags.set(flag.key, flag);
    });
  }

  /**
   * Check if a feature flag is enabled for the given context
   */
  isEnabled(flagKey: string, context: FeatureFlagContext): boolean {
    const cacheKey = `${flagKey}:${JSON.stringify(context)}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && Date.now() < expiry) {
        return this.cache.get(cacheKey)!;
      }
    }

    const result = this.evaluateFlag(flagKey, context);

    // Cache the result
    this.cache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

    return result;
  }

  private evaluateFlag(flagKey: string, context: FeatureFlagContext): boolean {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      console.warn(`Feature flag '${flagKey}' not found`);
      return false;
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check environment conditions
    if (
      flag.conditions?.environment &&
      !flag.conditions.environment.includes(context.environment)
    ) {
      return false;
    }

    // Check user role conditions
    if (
      flag.conditions?.userRoles &&
      context.userRole &&
      !flag.conditions.userRoles.includes(context.userRole)
    ) {
      return false;
    }

    // Check business ID conditions
    if (
      flag.conditions?.businessIds &&
      context.businessId &&
      !flag.conditions.businessIds.includes(context.businessId)
    ) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashString(
        `${flagKey}:${context.userId || context.sessionId || "anonymous"}`
      );
      const percentage = hash % 100;
      return percentage < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get all feature flags with their current status for the context
   */
  getAllFlags(context: FeatureFlagContext): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    this.flags.forEach((flag, key) => {
      result[key] = this.isEnabled(key, context);
    });

    return result;
  }

  /**
   * Get feature flag details
   */
  getFlagDetails(flagKey: string): FeatureFlag | null {
    return this.flags.get(flagKey) || null;
  }

  /**
   * Update a feature flag (admin only)
   */
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      return false;
    }

    const updatedFlag: FeatureFlag = {
      ...flag,
      ...updates,
      metadata: {
        ...flag.metadata,
        lastModified: new Date().toISOString(),
        version: this.incrementVersion(flag.metadata?.version || "1.0.0"),
      },
    };

    this.flags.set(flagKey, updatedFlag);
    this.clearCache();

    return true;
  }

  /**
   * Create a new feature flag
   */
  createFlag(flag: Omit<FeatureFlag, "metadata">): boolean {
    if (this.flags.has(flag.key)) {
      return false;
    }

    const newFlag: FeatureFlag = {
      ...flag,
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: "admin",
        lastModified: new Date().toISOString(),
        version: "1.0.0",
      },
    };

    this.flags.set(flag.key, newFlag);
    this.clearCache();

    return true;
  }

  /**
   * Delete a feature flag
   */
  deleteFlag(flagKey: string): boolean {
    const deleted = this.flags.delete(flagKey);
    if (deleted) {
      this.clearCache();
    }
    return deleted;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private incrementVersion(version: string): string {
    const parts = version.split(".");
    const patch = parseInt(parts[2] || "0") + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
}

// Singleton instance
let featureFlagManager: FeatureFlagManager | null = null;

/**
 * Get the feature flag manager instance
 */
export function getFeatureFlagManager(): FeatureFlagManager {
  if (!featureFlagManager) {
    featureFlagManager = new FeatureFlagManager();
  }
  return featureFlagManager;
}

/**
 * React hook for using feature flags
 */
export function useFeatureFlag(
  flagKey: string,
  context: FeatureFlagContext
): boolean {
  const manager = getFeatureFlagManager();
  return manager.isEnabled(flagKey, context);
}

/**
 * React hook for getting all feature flags
 */
export function useFeatureFlags(
  context: FeatureFlagContext
): Record<string, boolean> {
  const manager = getFeatureFlagManager();
  return manager.getAllFlags(context);
}

/**
 * Utility function to check feature flags in server components
 */
export function checkFeatureFlag(
  flagKey: string,
  context: FeatureFlagContext
): boolean {
  const manager = getFeatureFlagManager();
  return manager.isEnabled(flagKey, context);
}

/**
 * Environment-based feature flag context
 */
export function getEnvironmentContext(): Pick<
  FeatureFlagContext,
  "environment"
> {
  return {
    environment: process.env.NODE_ENV || "development",
  };
}
