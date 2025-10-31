/**
 * Audit Logger for Reception Dashboard Activities
 *
 * This module provides comprehensive logging for all dashboard activities
 * including order creation, modification, ticket state transitions, and
 * staff actions with timestamps and context.
 */

export interface AuditLogEntry {
  id?: string;
  admin_id?: string;
  staff_id?: string;
  business_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: Date;
}

export interface OrderAuditContext {
  orderId?: string;
  ticketId?: string;
  ticketNumber?: string;
  customerName?: string;
  totalAmount?: number;
  itemCount?: number;
  diningOption?: string;
  previousState?: any;
  newState?: any;
}

export interface StaffActionContext {
  staffId: string;
  staffName?: string;
  staffRole?: string;
  sessionId?: string;
  tabName?: string;
  actionDuration?: number;
}

export interface PaymentAuditContext {
  paymentMethod?: string;
  paymentAmount?: number;
  paymentReference?: string;
  paymentStatus?: string;
  errorMessage?: string;
}

export interface PerformanceMetrics {
  operationType: string;
  duration: number;
  memoryUsage?: number;
  networkLatency?: number;
  errorCount?: number;
  timestamp: Date;
}

/**
 * Main audit logger class for reception dashboard activities
 */
export class ReceptionAuditLogger {
  private businessId: string;
  private staffId?: string;
  private sessionId?: string;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(businessId: string, staffId?: string, sessionId?: string) {
    this.businessId = businessId;
    this.staffId = staffId;
    this.sessionId = sessionId;
  }

  /**
   * Log order creation activities
   */
  async logOrderCreation(
    context: OrderAuditContext & StaffActionContext
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      staff_id: context.staffId,
      business_id: this.businessId,
      action: "order_created",
      target_type: "order",
      target_id: context.orderId,
      details: {
        ticketId: context.ticketId,
        ticketNumber: context.ticketNumber,
        customerName: context.customerName,
        totalAmount: context.totalAmount,
        itemCount: context.itemCount,
        diningOption: context.diningOption,
        staffName: context.staffName,
        staffRole: context.staffRole,
        sessionId: context.sessionId || this.sessionId,
        timestamp: new Date().toISOString(),
      },
      reason: "New order created by reception staff",
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log order modification activities
   */
  async logOrderModification(
    context: OrderAuditContext & StaffActionContext
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      staff_id: context.staffId,
      business_id: this.businessId,
      action: "order_modified",
      target_type: "order",
      target_id: context.orderId,
      details: {
        ticketId: context.ticketId,
        ticketNumber: context.ticketNumber,
        customerName: context.customerName,
        previousState: context.previousState,
        newState: context.newState,
        staffName: context.staffName,
        staffRole: context.staffRole,
        sessionId: context.sessionId || this.sessionId,
        timestamp: new Date().toISOString(),
        changes: this.calculateChanges(context.previousState, context.newState),
      },
      reason: "Order modified by reception staff",
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log ticket state transitions
   */
  async logTicketStateTransition(
    ticketId: string,
    previousStatus: string,
    newStatus: string,
    context: StaffActionContext
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      staff_id: context.staffId,
      business_id: this.businessId,
      action: "ticket_status_changed",
      target_type: "ticket",
      target_id: ticketId,
      details: {
        previousStatus,
        newStatus,
        staffName: context.staffName,
        staffRole: context.staffRole,
        sessionId: context.sessionId || this.sessionId,
        timestamp: new Date().toISOString(),
        transitionType: this.getTransitionType(previousStatus, newStatus),
      },
      reason: `Ticket status changed from ${previousStatus} to ${newStatus}`,
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log staff navigation and tab switching activities
   */
  async logStaffNavigation(
    fromTab: string,
    toTab: string,
    context: StaffActionContext
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      staff_id: context.staffId,
      business_id: this.businessId,
      action: "tab_navigation",
      target_type: "dashboard",
      details: {
        fromTab,
        toTab,
        staffName: context.staffName,
        staffRole: context.staffRole,
        sessionId: context.sessionId || this.sessionId,
        timestamp: new Date().toISOString(),
        actionDuration: context.actionDuration,
      },
      reason: "Staff navigated between dashboard tabs",
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log payment processing activities
   */
  async logPaymentProcessing(
    ticketId: string,
    paymentContext: PaymentAuditContext,
    staffContext: StaffActionContext
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      staff_id: staffContext.staffId,
      business_id: this.businessId,
      action:
        paymentContext.paymentStatus === "completed"
          ? "payment_completed"
          : "payment_attempted",
      target_type: "payment",
      target_id: ticketId,
      details: {
        paymentMethod: paymentContext.paymentMethod,
        paymentAmount: paymentContext.paymentAmount,
        paymentReference: paymentContext.paymentReference,
        paymentStatus: paymentContext.paymentStatus,
        errorMessage: paymentContext.errorMessage,
        staffName: staffContext.staffName,
        staffRole: staffContext.staffRole,
        sessionId: staffContext.sessionId || this.sessionId,
        timestamp: new Date().toISOString(),
      },
      reason:
        paymentContext.paymentStatus === "completed"
          ? "Payment successfully processed"
          : "Payment processing attempted",
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log ticket save/load operations
   */
  async logTicketOperation(
    operation: "save" | "load" | "delete",
    ticketId: string,
    context: OrderAuditContext & StaffActionContext
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      staff_id: context.staffId,
      business_id: this.businessId,
      action: `ticket_${operation}`,
      target_type: "ticket",
      target_id: ticketId,
      details: {
        ticketNumber: context.ticketNumber,
        customerName: context.customerName,
        totalAmount: context.totalAmount,
        itemCount: context.itemCount,
        staffName: context.staffName,
        staffRole: context.staffRole,
        sessionId: context.sessionId || this.sessionId,
        timestamp: new Date().toISOString(),
      },
      reason: `Ticket ${operation} operation performed by reception staff`,
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log system errors and recovery actions
   */
  async logSystemError(
    errorType: string,
    errorMessage: string,
    context: StaffActionContext,
    recoveryAction?: string
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      staff_id: context.staffId,
      business_id: this.businessId,
      action: "system_error",
      target_type: "system",
      details: {
        errorType,
        errorMessage,
        recoveryAction,
        staffName: context.staffName,
        staffRole: context.staffRole,
        sessionId: context.sessionId || this.sessionId,
        timestamp: new Date().toISOString(),
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
      reason: "System error occurred during dashboard operation",
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Record performance metrics for monitoring
   */
  recordPerformanceMetric(metric: PerformanceMetrics): void {
    this.performanceMetrics.push(metric);

    // Keep only last 100 metrics to prevent memory issues
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  /**
   * Get performance metrics for analysis
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Write audit log entry to database
   */
  private async writeAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      const response = await fetch("/api/audit-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...entry,
          ip_address: await this.getClientIP(),
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      });

      if (!response.ok) {
        console.error(
          "Failed to write audit log:",
          response.status,
          response.statusText
        );
        // Store locally for retry if server is unavailable
        this.storeAuditLogLocally(entry);
      }
    } catch (error) {
      console.error("Error writing audit log:", error);
      // Store locally for retry if network is unavailable
      this.storeAuditLogLocally(entry);
    }
  }

  /**
   * Store audit log locally for retry when server is available
   */
  private storeAuditLogLocally(entry: AuditLogEntry): void {
    try {
      const localLogs = JSON.parse(
        localStorage.getItem("pending_audit_logs") || "[]"
      );
      localLogs.push({
        ...entry,
        id: `local-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        created_at: new Date().toISOString(),
      });

      // Keep only last 50 local logs to prevent storage issues
      if (localLogs.length > 50) {
        localLogs.splice(0, localLogs.length - 50);
      }

      localStorage.setItem("pending_audit_logs", JSON.stringify(localLogs));
    } catch (error) {
      console.error("Failed to store audit log locally:", error);
    }
  }

  /**
   * Retry sending locally stored audit logs
   */
  async retryLocalAuditLogs(): Promise<void> {
    try {
      const localLogs = JSON.parse(
        localStorage.getItem("pending_audit_logs") || "[]"
      );

      if (localLogs.length === 0) return;

      const successfulLogs: string[] = [];

      for (const log of localLogs) {
        try {
          const response = await fetch("/api/audit-logs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(log),
          });

          if (response.ok) {
            successfulLogs.push(log.id);
          }
        } catch (error) {
          console.error("Failed to retry audit log:", error);
          break; // Stop retrying if network is still unavailable
        }
      }

      // Remove successfully sent logs
      if (successfulLogs.length > 0) {
        const remainingLogs = localLogs.filter(
          (log) => !successfulLogs.includes(log.id)
        );
        localStorage.setItem(
          "pending_audit_logs",
          JSON.stringify(remainingLogs)
        );
      }
    } catch (error) {
      console.error("Error retrying local audit logs:", error);
    }
  }

  /**
   * Calculate changes between previous and new state
   */
  private calculateChanges(
    previousState: any,
    newState: any
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    if (!previousState || !newState) {
      return changes;
    }

    // Compare items
    if (previousState.items && newState.items) {
      const prevItemsCount = previousState.items.length;
      const newItemsCount = newState.items.length;

      if (prevItemsCount !== newItemsCount) {
        changes.itemCountChange = newItemsCount - prevItemsCount;
      }

      // Check for quantity changes
      const quantityChanges = [];
      for (const newItem of newState.items) {
        const prevItem = previousState.items.find(
          (item: any) => item.id === newItem.id
        );
        if (prevItem && prevItem.quantity !== newItem.quantity) {
          quantityChanges.push({
            itemName: newItem.menu_item_name,
            previousQuantity: prevItem.quantity,
            newQuantity: newItem.quantity,
          });
        }
      }

      if (quantityChanges.length > 0) {
        changes.quantityChanges = quantityChanges;
      }
    }

    // Compare totals
    if (previousState.calculations && newState.calculations) {
      const prevTotal = previousState.calculations.total;
      const newTotal = newState.calculations.total;

      if (prevTotal !== newTotal) {
        changes.totalChange = newTotal - prevTotal;
      }
    }

    // Compare customer info
    if (previousState.customer && newState.customer) {
      const customerChanges: Record<string, any> = {};

      ["name", "phone", "email", "address"].forEach((field) => {
        if (previousState.customer[field] !== newState.customer[field]) {
          customerChanges[field] = {
            previous: previousState.customer[field],
            new: newState.customer[field],
          };
        }
      });

      if (Object.keys(customerChanges).length > 0) {
        changes.customerChanges = customerChanges;
      }
    }

    return changes;
  }

  /**
   * Determine the type of status transition
   */
  private getTransitionType(previousStatus: string, newStatus: string): string {
    const progressionMap: Record<string, number> = {
      pending_payment: 1,
      preparing: 2,
      ready: 3,
      completed: 4,
    };

    const prevLevel = progressionMap[previousStatus] || 0;
    const newLevel = progressionMap[newStatus] || 0;

    if (newLevel > prevLevel) {
      return "progression";
    } else if (newLevel < prevLevel) {
      return "regression";
    } else {
      return "lateral";
    }
  }

  /**
   * Get client IP address (best effort)
   */
  private async getClientIP(): Promise<string | undefined> {
    try {
      // This would typically be handled by the server
      // For client-side, we can't reliably get the real IP
      return undefined;
    } catch {
      return undefined;
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private auditLogger?: ReceptionAuditLogger;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  setAuditLogger(logger: ReceptionAuditLogger): void {
    this.auditLogger = logger;
  }

  /**
   * Measure and log operation performance
   */
  async measureOperation<T>(
    operationType: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await operation();

      const endTime = performance.now();
      const duration = endTime - startTime;
      const endMemory = this.getMemoryUsage();

      const metric: PerformanceMetrics = {
        operationType,
        duration,
        memoryUsage: endMemory - startMemory,
        errorCount: 0,
        timestamp: new Date(),
      };

      this.auditLogger?.recordPerformanceMetric(metric);

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

      this.auditLogger?.recordPerformanceMetric(metric);

      throw error;
    }
  }

  /**
   * Get current memory usage (if available)
   */
  private getMemoryUsage(): number {
    if (typeof performance !== "undefined" && "memory" in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

/**
 * Factory function to create audit logger instance
 */
export function createAuditLogger(
  businessId: string,
  staffId?: string,
  sessionId?: string
): ReceptionAuditLogger {
  return new ReceptionAuditLogger(businessId, staffId, sessionId);
}

/**
 * Hook for easy audit logging in React components
 */
export function useAuditLogger(businessId: string, staffId?: string) {
  const logger = new ReceptionAuditLogger(businessId, staffId);

  // Set up performance monitor
  const performanceMonitor = PerformanceMonitor.getInstance();
  performanceMonitor.setAuditLogger(logger);

  return {
    logger,
    performanceMonitor,
  };
}
