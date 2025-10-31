import { useEffect, useRef, useCallback } from 'react';
import { useOrderStore } from '@/stores/order-store';
import { 
  ReceptionAuditLogger, 
  PerformanceMonitor,
  createAuditLogger,
  OrderAuditContext,
  StaffActionContext,
  PaymentAuditContext 
} from '@/lib/audit-logger';

interface UseAuditLoggingProps {
  businessId: string;
  staffId?: string;
  staffName?: string;
  staffRole?: string;
  sessionId?: string;
}

/**
 * Hook for integrating audit logging with reception dashboard activities
 */
export function useAuditLogging({
  businessId,
  staffId,
  staffName,
  staffRole,
  sessionId,
}: UseAuditLoggingProps) {
  const auditLoggerRef = useRef<ReceptionAuditLogger>();
  const performanceMonitorRef = useRef<PerformanceMonitor>();
  const previousOrderStateRef = useRef<any>(null);
  const previousTicketsRef = useRef<any[]>([]);
  const tabSwitchStartTimeRef = useRef<number>(0);
  const currentTabRef = useRef<string>('create-order');

  // Initialize audit logger
  useEffect(() => {
    if (businessId) {
      auditLoggerRef.current = createAuditLogger(businessId, staffId, sessionId);
      performanceMonitorRef.current = PerformanceMonitor.getInstance();
      performanceMonitorRef.current.setAuditLogger(auditLoggerRef.current);

      // Retry any pending local audit logs
      auditLoggerRef.current.retryLocalAuditLogs();
    }
  }, [businessId, staffId, sessionId]);

  // Subscribe to order store changes for automatic logging
  const { currentOrder, openTickets } = useOrderStore();

  // Log order modifications
  useEffect(() => {
    if (!auditLoggerRef.current || !staffId) return;

    const currentState = currentOrder;
    const previousState = previousOrderStateRef.current;

    // Skip if no previous state (initial load)
    if (!previousState) {
      previousOrderStateRef.current = currentState;
      return;
    }

    // Skip if states are identical
    if (JSON.stringify(previousState) === JSON.stringify(currentState)) {
      return;
    }

    // Log order modification
    if (currentState && previousState) {
      const context: OrderAuditContext & StaffActionContext = {
        orderId: currentState.id,
        ticketId: currentState.ticketNumber,
        ticketNumber: currentState.ticketNumber,
        customerName: currentState.customer.name,
        totalAmount: currentState.calculations.total,
        itemCount: currentState.items.length,
        diningOption: currentState.diningOption,
        previousState,
        newState: currentState,
        staffId,
        staffName,
        staffRole,
        sessionId,
      };

      auditLoggerRef.current.logOrderModification(context);
    }

    // Update previous state reference
    previousOrderStateRef.current = currentState;
  }, [currentOrder, staffId, staffName, staffRole, sessionId]);

  // Log ticket state changes
  useEffect(() => {
    if (!auditLoggerRef.current || !staffId) return;

    const currentTickets = openTickets;
    const previousTickets = previousTicketsRef.current;

    // Skip if no previous tickets (initial load)
    if (previousTickets.length === 0) {
      previousTicketsRef.current = currentTickets;
      return;
    }

    // Check for status changes
    currentTickets.forEach(currentTicket => {
      const previousTicket = previousTickets.find(t => t.id === currentTicket.id);
      
      if (previousTicket && previousTicket.status !== currentTicket.status) {
        const context: StaffActionContext = {
          staffId,
          staffName,
          staffRole,
          sessionId,
        };

        auditLoggerRef.current?.logTicketStateTransition(
          currentTicket.id,
          previousTicket.status,
          currentTicket.status,
          context
        );
      }
    });

    // Update previous tickets reference
    previousTicketsRef.current = currentTickets;
  }, [openTickets, staffId, staffName, staffRole, sessionId]);

  // Audit logging functions
  const logOrderCreation = useCallback(async (orderContext: OrderAuditContext) => {
    if (!auditLoggerRef.current || !staffId) return;

    const context: OrderAuditContext & StaffActionContext = {
      ...orderContext,
      staffId,
      staffName,
      staffRole,
      sessionId,
    };

    await auditLoggerRef.current.logOrderCreation(context);
  }, [staffId, staffName, staffRole, sessionId]);

  const logTicketOperation = useCallback(async (
    operation: 'save' | 'load' | 'delete',
    ticketId: string,
    orderContext: OrderAuditContext
  ) => {
    if (!auditLoggerRef.current || !staffId) return;

    const context: OrderAuditContext & StaffActionContext = {
      ...orderContext,
      staffId,
      staffName,
      staffRole,
      sessionId,
    };

    await auditLoggerRef.current.logTicketOperation(operation, ticketId, context);
  }, [staffId, staffName, staffRole, sessionId]);

  const logPaymentProcessing = useCallback(async (
    ticketId: string,
    paymentContext: PaymentAuditContext
  ) => {
    if (!auditLoggerRef.current || !staffId) return;

    const staffContext: StaffActionContext = {
      staffId,
      staffName,
      staffRole,
      sessionId,
    };

    await auditLoggerRef.current.logPaymentProcessing(ticketId, paymentContext, staffContext);
  }, [staffId, staffName, staffRole, sessionId]);

  const logTabNavigation = useCallback((fromTab: string, toTab: string) => {
    if (!auditLoggerRef.current || !staffId) return;

    const actionDuration = tabSwitchStartTimeRef.current 
      ? Date.now() - tabSwitchStartTimeRef.current 
      : undefined;

    const context: StaffActionContext = {
      staffId,
      staffName,
      staffRole,
      sessionId,
      actionDuration,
    };

    auditLoggerRef.current.logStaffNavigation(fromTab, toTab, context);
    
    // Update current tab and reset timer
    currentTabRef.current = toTab;
    tabSwitchStartTimeRef.current = Date.now();
  }, [staffId, staffName, staffRole, sessionId]);

  const logSystemError = useCallback(async (
    errorType: string,
    errorMessage: string,
    recoveryAction?: string
  ) => {
    if (!auditLoggerRef.current || !staffId) return;

    const context: StaffActionContext = {
      staffId,
      staffName,
      staffRole,
      sessionId,
    };

    await auditLoggerRef.current.logSystemError(errorType, errorMessage, context, recoveryAction);
  }, [staffId, staffName, staffRole, sessionId]);

  const measurePerformance = useCallback(async <T>(
    operationType: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    if (!performanceMonitorRef.current) {
      return await operation();
    }

    return await performanceMonitorRef.current.measureOperation(operationType, operation);
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    return auditLoggerRef.current?.getPerformanceMetrics() || [];
  }, []);

  const clearPerformanceMetrics = useCallback(() => {
    auditLoggerRef.current?.clearPerformanceMetrics();
  }, []);

  // Track tab switch start time
  const startTabSwitch = useCallback(() => {
    tabSwitchStartTimeRef.current = Date.now();
  }, []);

  return {
    // Logging functions
    logOrderCreation,
    logTicketOperation,
    logPaymentProcessing,
    logTabNavigation,
    logSystemError,
    
    // Performance monitoring
    measurePerformance,
    getPerformanceMetrics,
    clearPerformanceMetrics,
    
    // Utility functions
    startTabSwitch,
    
    // Direct access to logger (for advanced use cases)
    auditLogger: auditLoggerRef.current,
  };
}

/**
 * Higher-order component for automatic error logging
 */
export function withAuditLogging<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function AuditLoggedComponent(props: T & UseAuditLoggingProps) {
    const { logSystemError } = useAuditLogging(props);

    useEffect(() => {
      const handleError = (error: ErrorEvent) => {
        logSystemError(
          'javascript_error',
          `${error.message} at ${error.filename}:${error.lineno}:${error.colno}`,
          'error_boundary_caught'
        );
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        logSystemError(
          'unhandled_promise_rejection',
          event.reason?.toString() || 'Unknown promise rejection',
          'promise_rejection_caught'
        );
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, [logSystemError]);

    return <Component {...props} />;
  };
}

/**
 * Hook for tracking user session activity
 */
export function useSessionTracking(auditLogging: ReturnType<typeof useAuditLogging>) {
  const sessionStartRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  const activityCountRef = useRef<number>(0);

  // Track user activity
  useEffect(() => {
    const trackActivity = () => {
      lastActivityRef.current = Date.now();
      activityCountRef.current += 1;
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity);
      });
    };
  }, []);

  // Log session summary on unmount
  useEffect(() => {
    return () => {
      const sessionDuration = Date.now() - sessionStartRef.current;
      const inactiveTime = Date.now() - lastActivityRef.current;
      
      auditLogging.logSystemError(
        'session_end',
        `Session ended after ${sessionDuration}ms with ${activityCountRef.current} activities. Inactive for ${inactiveTime}ms`,
        'session_cleanup'
      );
    };
  }, [auditLogging]);

  return {
    getSessionDuration: () => Date.now() - sessionStartRef.current,
    getLastActivity: () => lastActivityRef.current,
    getActivityCount: () => activityCountRef.current,
  };
}