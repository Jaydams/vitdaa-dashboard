import React from "react";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export interface ActivityLogData {
  staff_id: string;
  staff_session_id?: string;
  business_id: string;
  activity_type: ActivityType;
  activity_details?: Record<string, any>;
  performance_metrics?: PerformanceMetrics;
  resource_id?: string;
  resource_type?: string;
  success?: boolean;
  error_message?: string;
}

export interface PerformanceMetrics {
  response_time?: number; // in milliseconds
  efficiency_score?: number;
  customer_satisfaction?: number;
  action_duration?: number;
}

export type ActivityType =
  | "order_created"
  | "order_updated"
  | "order_status_changed"
  | "payment_processed"
  | "inventory_requested"
  | "inventory_approved"
  | "inventory_denied"
  | "inventory_updated"
  | "table_assigned"
  | "customer_served"
  | "report_generated"
  | "refund_processed"
  | "dashboard_accessed"
  | "login"
  | "logout"
  | "error_occurred";

export interface ActivityCategory {
  category:
    | "order_management"
    | "inventory_management"
    | "payment_processing"
    | "customer_service"
    | "system_access"
    | "reporting";
  tags: string[];
  priority: "low" | "normal" | "high" | "critical";
}

export class ActivityLoggingMiddleware {
  private supabase: any;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Initialize the middleware with Supabase client
   */
  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * Log staff activity with performance metrics
   */
  async logActivity(data: ActivityLogData): Promise<void> {
    try {
      if (!this.supabase) {
        await this.initialize();
      }

      const responseTime = Date.now() - this.startTime;

      // Enhance activity details with categorization and tagging
      const category = this.categorizeActivity(data.activity_type);

      const enhancedActivityDetails = {
        ...data.activity_details,
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        success: data.success ?? true,
        error_message: data.error_message,
        category: category.category,
        tags: category.tags,
        priority: category.priority,
      };

      const enhancedPerformanceMetrics = {
        response_time: responseTime,
        ...data.performance_metrics,
      };

      const { error } = await this.supabase.from("staff_activity_logs").insert({
        staff_id: data.staff_id,
        staff_session_id: data.staff_session_id,
        business_id: data.business_id,
        activity_type: data.activity_type,
        activity_details: enhancedActivityDetails,
        performance_metrics: enhancedPerformanceMetrics,
        shift_date: new Date().toISOString().split("T")[0],
      });

      if (error) {
        console.error("Failed to log staff activity:", error);
        // Don't throw error to avoid disrupting main application flow
      }
    } catch (error) {
      console.error("Activity logging middleware error:", error);
      // Fail silently to avoid disrupting main application flow
    }
  }

  /**
   * Categorize activity and assign tags for better organization
   */
  private categorizeActivity(activityType: ActivityType): ActivityCategory {
    const categoryMap: Record<ActivityType, ActivityCategory> = {
      order_created: {
        category: "order_management",
        tags: ["order", "creation", "customer_service"],
        priority: "normal",
      },
      order_updated: {
        category: "order_management",
        tags: ["order", "modification", "customer_service"],
        priority: "normal",
      },
      order_status_changed: {
        category: "order_management",
        tags: ["order", "status", "workflow"],
        priority: "normal",
      },
      payment_processed: {
        category: "payment_processing",
        tags: ["payment", "transaction", "financial"],
        priority: "high",
      },
      inventory_requested: {
        category: "inventory_management",
        tags: ["inventory", "request", "stock"],
        priority: "normal",
      },
      inventory_approved: {
        category: "inventory_management",
        tags: ["inventory", "approval", "admin"],
        priority: "normal",
      },
      inventory_denied: {
        category: "inventory_management",
        tags: ["inventory", "denial", "admin"],
        priority: "normal",
      },
      inventory_updated: {
        category: "inventory_management",
        tags: ["inventory", "update", "stock"],
        priority: "normal",
      },
      table_assigned: {
        category: "customer_service",
        tags: ["table", "assignment", "seating"],
        priority: "normal",
      },
      customer_served: {
        category: "customer_service",
        tags: ["customer", "service", "interaction"],
        priority: "normal",
      },
      report_generated: {
        category: "reporting",
        tags: ["report", "analytics", "data"],
        priority: "low",
      },
      refund_processed: {
        category: "payment_processing",
        tags: ["refund", "financial", "customer_service"],
        priority: "high",
      },
      dashboard_accessed: {
        category: "system_access",
        tags: ["dashboard", "access", "navigation"],
        priority: "low",
      },
      login: {
        category: "system_access",
        tags: ["authentication", "session", "security"],
        priority: "normal",
      },
      logout: {
        category: "system_access",
        tags: ["authentication", "session", "security"],
        priority: "normal",
      },
      error_occurred: {
        category: "system_access",
        tags: ["error", "system", "troubleshooting"],
        priority: "critical",
      },
    };

    return categoryMap[activityType];
  }

  /**
   * Create a middleware wrapper for API routes
   */
  static createApiMiddleware() {
    return {
      /**
       * Wrap an API handler with activity logging
       */
      withActivityLogging: <T extends any[]>(
        handler: (...args: T) => Promise<Response>,
        activityConfig: {
          activity_type: ActivityType;
          getActivityData: (
            request: NextRequest,
            ...args: T
          ) => Partial<ActivityLogData>;
        }
      ) => {
        return async (...args: T): Promise<Response> => {
          const middleware = new ActivityLoggingMiddleware();
          const request = args[0] as NextRequest;
          let response: Response;
          let success = true;
          let errorMessage: string | undefined;

          try {
            response = await handler(...args);
            success = response.ok;

            if (!success) {
              const responseText = await response.clone().text();
              try {
                const responseJson = JSON.parse(responseText);
                errorMessage = responseJson.error || responseJson.message;
              } catch {
                errorMessage = responseText || `HTTP ${response.status}`;
              }
            }
          } catch (error) {
            success = false;
            errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            throw error; // Re-throw to maintain original error handling
          } finally {
            // Log activity regardless of success/failure
            try {
              const activityData = activityConfig.getActivityData(
                request,
                ...args
              );

              // Ensure required fields are present
              if (activityData.staff_id && activityData.business_id) {
                await middleware.logActivity({
                  activity_type: activityConfig.activity_type,
                  success,
                  error_message: errorMessage,
                  ...activityData,
                } as ActivityLogData);
              }
            } catch (loggingError) {
              console.error("Failed to log activity:", loggingError);
            }
          }

          return response!;
        };
      },
    };
  }

  /**
   * Create a React component wrapper for dashboard actions
   */
  static createComponentMiddleware() {
    return {
      /**
       * Log dashboard component interactions
       */
      logComponentAction: async (data: ActivityLogData) => {
        const middleware = new ActivityLoggingMiddleware();
        await middleware.logActivity(data);
      },

      /**
       * Create a higher-order component for automatic activity logging
       */
      withActivityLogging: <P extends object>(
        Component: React.ComponentType<P>,
        activityConfig: {
          activity_type: ActivityType;
          getActivityData: (props: P) => Partial<ActivityLogData>;
        }
      ) => {
        return (props: P) => {
          const logActivity = async (
            additionalData?: Partial<ActivityLogData>
          ) => {
            try {
              const baseData = activityConfig.getActivityData(props);
              const middleware = new ActivityLoggingMiddleware();

              const combinedData = {
                activity_type: activityConfig.activity_type,
                ...baseData,
                ...additionalData,
              };

              // Ensure required fields are present
              if (combinedData.staff_id && combinedData.business_id) {
                await middleware.logActivity(combinedData as ActivityLogData);
              }
            } catch (error) {
              console.error("Component activity logging failed:", error);
            }
          };

          // Add logging function to props
          const enhancedProps = {
            ...props,
            logActivity,
          } as P & {
            logActivity: (data?: Partial<ActivityLogData>) => Promise<void>;
          };

          return React.createElement(Component, enhancedProps);
        };
      },
    };
  }

  /**
   * Batch log multiple activities for performance
   */
  async logBatchActivities(activities: ActivityLogData[]): Promise<void> {
    try {
      if (!this.supabase) {
        await this.initialize();
      }

      const enhancedActivities = activities.map((data) => {
        const category = this.categorizeActivity(data.activity_type);
        const responseTime = Date.now() - this.startTime;

        return {
          staff_id: data.staff_id,
          staff_session_id: data.staff_session_id,
          business_id: data.business_id,
          activity_type: data.activity_type,
          activity_details: {
            ...data.activity_details,
            resource_id: data.resource_id,
            resource_type: data.resource_type,
            success: data.success ?? true,
            error_message: data.error_message,
            category: category.category,
            tags: category.tags,
            priority: category.priority,
          },
          performance_metrics: {
            response_time: responseTime,
            ...data.performance_metrics,
          },
          shift_date: new Date().toISOString().split("T")[0],
        };
      });

      const { error } = await this.supabase
        .from("staff_activity_logs")
        .insert(enhancedActivities);

      if (error) {
        console.error("Failed to batch log staff activities:", error);
      }
    } catch (error) {
      console.error("Batch activity logging middleware error:", error);
    }
  }

  /**
   * Get performance metrics for a specific time period
   */
  async getPerformanceMetrics(
    staffId: string,
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      if (!this.supabase) {
        await this.initialize();
      }

      let query = this.supabase
        .from("staff_activity_logs")
        .select(
          "activity_type, performance_metrics, activity_details, timestamp"
        )
        .eq("staff_id", staffId)
        .eq("business_id", businessId);

      if (startDate) {
        query = query.gte("timestamp", startDate);
      }
      if (endDate) {
        query = query.lte("timestamp", endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Calculate aggregated metrics
      const metrics = this.calculateAggregatedMetrics(data || []);
      return metrics;
    } catch (error) {
      console.error("Failed to get performance metrics:", error);
      return null;
    }
  }

  /**
   * Calculate aggregated performance metrics
   */
  private calculateAggregatedMetrics(logs: any[]): any {
    if (logs.length === 0) {
      return {
        total_activities: 0,
        average_response_time: 0,
        success_rate: 0,
        efficiency_score: 0,
        activity_breakdown: {},
      };
    }

    const totalActivities = logs.length;
    const successfulActivities = logs.filter(
      (log) => log.activity_details?.success !== false
    ).length;

    const totalResponseTime = logs.reduce(
      (sum, log) => sum + (log.performance_metrics?.response_time || 0),
      0
    );

    const averageResponseTime = totalResponseTime / totalActivities;
    const successRate = (successfulActivities / totalActivities) * 100;

    // Calculate efficiency score based on response time and success rate
    const efficiencyScore = Math.min(
      100,
      successRate * 0.7 + (1000 / Math.max(averageResponseTime, 100)) * 30
    );

    // Activity breakdown by type
    const activityBreakdown = logs.reduce((acc: any, log) => {
      const type = log.activity_type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          total_response_time: 0,
          average_response_time: 0,
          success_count: 0,
          success_rate: 0,
        };
      }

      acc[type].count++;
      acc[type].total_response_time +=
        log.performance_metrics?.response_time || 0;
      acc[type].average_response_time =
        acc[type].total_response_time / acc[type].count;

      if (log.activity_details?.success !== false) {
        acc[type].success_count++;
      }
      acc[type].success_rate =
        (acc[type].success_count / acc[type].count) * 100;

      return acc;
    }, {});

    return {
      total_activities: totalActivities,
      average_response_time: Math.round(averageResponseTime),
      success_rate: Math.round(successRate * 100) / 100,
      efficiency_score: Math.round(efficiencyScore * 100) / 100,
      activity_breakdown: activityBreakdown,
    };
  }
}

// Export singleton instance for global use
export const activityLogger = new ActivityLoggingMiddleware();

// Export utility functions
export const logStaffActivity = async (data: ActivityLogData) => {
  await activityLogger.logActivity(data);
};

export const logBatchStaffActivities = async (
  activities: ActivityLogData[]
) => {
  await activityLogger.logBatchActivities(activities);
};
