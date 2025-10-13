import {
  ActivityLogData,
  ActivityType,
  logStaffActivity,
} from "./activity-logging-middleware";

export interface DashboardActivityContext {
  staff_id: string;
  staff_session_id?: string;
  business_id: string;
  dashboard_type: string;
}

export interface DashboardAction {
  action_name: string;
  resource_id?: string;
  resource_type?: string;
  action_data?: Record<string, any>;
  success?: boolean;
  error_message?: string;
}

/**
 * Service for logging dashboard activities with automatic categorization
 */
export class DashboardActivityService {
  private context: DashboardActivityContext;
  private startTime: number;

  constructor(context: DashboardActivityContext) {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Log a dashboard action with automatic activity type detection
   */
  async logAction(action: DashboardAction): Promise<void> {
    try {
      const activityType = this.mapActionToActivityType(action.action_name);

      const activityData: ActivityLogData = {
        staff_id: this.context.staff_id,
        staff_session_id: this.context.staff_session_id,
        business_id: this.context.business_id,
        activity_type: activityType,
        resource_id: action.resource_id,
        resource_type: action.resource_type,
        success: action.success ?? true,
        error_message: action.error_message,
        activity_details: {
          dashboard_type: this.context.dashboard_type,
          action_name: action.action_name,
          ...action.action_data,
          timestamp: new Date().toISOString(),
        },
        performance_metrics: {
          response_time: Date.now() - this.startTime,
        },
      };

      await logStaffActivity(activityData);

      // Reset timer for next action
      this.startTime = Date.now();
    } catch (error) {
      console.error("Failed to log dashboard action:", error);
    }
  }

  /**
   * Map dashboard action names to activity types
   */
  private mapActionToActivityType(actionName: string): ActivityType {
    const actionMap: Record<string, ActivityType> = {
      // Order management actions
      create_order: "order_created",
      update_order: "order_updated",
      change_order_status: "order_status_changed",
      assign_order: "order_updated",
      complete_order: "order_status_changed",
      cancel_order: "order_status_changed",

      // Payment actions
      process_payment: "payment_processed",
      refund_payment: "refund_processed",
      void_payment: "payment_processed",

      // Inventory actions
      request_inventory: "inventory_requested",
      approve_inventory_request: "inventory_approved",
      deny_inventory_request: "inventory_denied",
      update_inventory: "inventory_updated",
      adjust_stock: "inventory_updated",

      // Table management actions
      assign_table: "table_assigned",
      release_table: "table_assigned",
      update_table_status: "table_assigned",

      // Customer service actions
      serve_customer: "customer_served",
      take_order: "customer_served",
      deliver_order: "customer_served",

      // Reporting actions
      generate_report: "report_generated",
      export_data: "report_generated",
      view_analytics: "report_generated",

      // Dashboard access
      access_dashboard: "dashboard_accessed",
      navigate_dashboard: "dashboard_accessed",
      switch_dashboard: "dashboard_accessed",

      // System actions
      login: "login",
      logout: "logout",
      handle_error: "error_occurred",
    };

    return actionMap[actionName] || "dashboard_accessed";
  }

  /**
   * Log multiple actions in batch for better performance
   */
  async logBatchActions(actions: DashboardAction[]): Promise<void> {
    try {
      const activities: ActivityLogData[] = actions.map((action) => ({
        staff_id: this.context.staff_id,
        staff_session_id: this.context.staff_session_id,
        business_id: this.context.business_id,
        activity_type: this.mapActionToActivityType(action.action_name),
        resource_id: action.resource_id,
        resource_type: action.resource_type,
        success: action.success ?? true,
        error_message: action.error_message,
        activity_details: {
          dashboard_type: this.context.dashboard_type,
          action_name: action.action_name,
          ...action.action_data,
          timestamp: new Date().toISOString(),
        },
        performance_metrics: {
          response_time: Date.now() - this.startTime,
        },
      }));

      const { logBatchStaffActivities } = await import(
        "./activity-logging-middleware"
      );
      await logBatchStaffActivities(activities);
    } catch (error) {
      console.error("Failed to batch log dashboard actions:", error);
    }
  }

  /**
   * Create specialized loggers for different dashboard types
   */
  static createReceptionLogger(
    context: Omit<DashboardActivityContext, "dashboard_type">
  ) {
    return new DashboardActivityService({
      ...context,
      dashboard_type: "reception",
    });
  }

  static createKitchenLogger(
    context: Omit<DashboardActivityContext, "dashboard_type">
  ) {
    return new DashboardActivityService({
      ...context,
      dashboard_type: "kitchen",
    });
  }

  static createBarLogger(
    context: Omit<DashboardActivityContext, "dashboard_type">
  ) {
    return new DashboardActivityService({
      ...context,
      dashboard_type: "bar",
    });
  }

  static createAccountantLogger(
    context: Omit<DashboardActivityContext, "dashboard_type">
  ) {
    return new DashboardActivityService({
      ...context,
      dashboard_type: "accountant",
    });
  }

  static createAdminLogger(
    context: Omit<DashboardActivityContext, "dashboard_type">
  ) {
    return new DashboardActivityService({
      ...context,
      dashboard_type: "admin",
    });
  }
}

/**
 * Predefined action templates for common dashboard operations
 */
export const DashboardActionTemplates = {
  // Reception Dashboard Actions
  reception: {
    createOrder: (orderId: string, orderData: any): DashboardAction => ({
      action_name: "create_order",
      resource_id: orderId,
      resource_type: "order",
      action_data: {
        customer_name: orderData.customer_name,
        table_id: orderData.table_id,
        total_amount: orderData.total_amount,
        items_count: orderData.items?.length || 0,
      },
    }),

    assignTable: (tableId: string, customerId: string): DashboardAction => ({
      action_name: "assign_table",
      resource_id: tableId,
      resource_type: "table",
      action_data: {
        customer_id: customerId,
        assignment_time: new Date().toISOString(),
      },
    }),

    processPayment: (paymentId: string, paymentData: any): DashboardAction => ({
      action_name: "process_payment",
      resource_id: paymentId,
      resource_type: "payment",
      action_data: {
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        order_id: paymentData.order_id,
      },
    }),
  },

  // Kitchen Dashboard Actions
  kitchen: {
    requestInventory: (
      requestId: string,
      requestData: any
    ): DashboardAction => ({
      action_name: "request_inventory",
      resource_id: requestId,
      resource_type: "inventory_request",
      action_data: {
        items_count: requestData.items?.length || 0,
        total_estimated_cost: requestData.total_estimated_cost,
        urgency_level: requestData.urgency_level,
      },
    }),

    updateOrderStatus: (
      orderId: string,
      newStatus: string,
      oldStatus?: string
    ): DashboardAction => ({
      action_name: "change_order_status",
      resource_id: orderId,
      resource_type: "order",
      action_data: {
        new_status: newStatus,
        old_status: oldStatus,
        status_change_time: new Date().toISOString(),
      },
    }),

    updateInventory: (itemId: string, inventoryData: any): DashboardAction => ({
      action_name: "update_inventory",
      resource_id: itemId,
      resource_type: "inventory_item",
      action_data: {
        quantity_change: inventoryData.quantity_change,
        new_stock_level: inventoryData.new_stock_level,
        transaction_type: inventoryData.transaction_type,
      },
    }),
  },

  // Bar Dashboard Actions
  bar: {
    processBeverageOrder: (
      orderId: string,
      orderData: any
    ): DashboardAction => ({
      action_name: "change_order_status",
      resource_id: orderId,
      resource_type: "order",
      action_data: {
        order_type: "beverage",
        items_count: orderData.beverage_items?.length || 0,
        preparation_time: orderData.preparation_time,
      },
    }),

    updateBeverageInventory: (
      itemId: string,
      inventoryData: any
    ): DashboardAction => ({
      action_name: "update_inventory",
      resource_id: itemId,
      resource_type: "inventory_item",
      action_data: {
        item_type: "beverage",
        quantity_used: inventoryData.quantity_used,
        remaining_stock: inventoryData.remaining_stock,
      },
    }),
  },

  // Accountant Dashboard Actions
  accountant: {
    generateReport: (reportId: string, reportData: any): DashboardAction => ({
      action_name: "generate_report",
      resource_id: reportId,
      resource_type: "report",
      action_data: {
        report_type: reportData.report_type,
        date_range: reportData.date_range,
        filters_applied: reportData.filters,
      },
    }),

    processRefund: (refundId: string, refundData: any): DashboardAction => ({
      action_name: "refund_payment",
      resource_id: refundId,
      resource_type: "refund",
      action_data: {
        original_payment_id: refundData.payment_id,
        refund_amount: refundData.amount,
        refund_reason: refundData.reason,
      },
    }),
  },

  // Admin Dashboard Actions
  admin: {
    approveInventoryRequest: (
      requestId: string,
      requestData: any
    ): DashboardAction => ({
      action_name: "approve_inventory_request",
      resource_id: requestId,
      resource_type: "inventory_request",
      action_data: {
        approved_items_count: requestData.approved_items?.length || 0,
        total_approved_cost: requestData.total_approved_cost,
        modifications_made: requestData.modifications_made || false,
      },
    }),

    denyInventoryRequest: (
      requestId: string,
      reason: string
    ): DashboardAction => ({
      action_name: "deny_inventory_request",
      resource_id: requestId,
      resource_type: "inventory_request",
      action_data: {
        denial_reason: reason,
        denial_time: new Date().toISOString(),
      },
    }),
  },
};

/**
 * Utility function to create dashboard activity service with error handling
 */
export function createDashboardActivityService(
  context: DashboardActivityContext
): DashboardActivityService {
  try {
    return new DashboardActivityService(context);
  } catch (error) {
    console.error("Failed to create dashboard activity service:", error);
    // Return a no-op service to prevent breaking the application
    return {
      logAction: async () => {},
      logBatchActions: async () => {},
    } as any;
  }
}

/**
 * Global activity service instance for easy access
 */
let globalActivityService: DashboardActivityService | null = null;

export function initializeGlobalActivityService(
  context: DashboardActivityContext
) {
  globalActivityService = new DashboardActivityService(context);
}

export function getGlobalActivityService(): DashboardActivityService | null {
  return globalActivityService;
}

/**
 * Utility function for quick activity logging without creating service instance
 */
export async function quickLogDashboardAction(
  context: DashboardActivityContext,
  action: DashboardAction
): Promise<void> {
  const service = new DashboardActivityService(context);
  await service.logAction(action);
}
