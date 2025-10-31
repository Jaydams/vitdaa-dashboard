"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuditLogging } from '@/hooks/useAuditLogging';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { PerformanceMetrics } from '@/lib/audit-logger';

interface MonitoringContextType {
  // Audit logging
  auditLogging: ReturnType<typeof useAuditLogging>;
  
  // Performance monitoring
  performanceMetrics: PerformanceMetrics[];
  systemHealth: {
    isHealthy: boolean;
    hasWarnings: boolean;
    hasCriticalIssues: boolean;
    alerts: string[];
  };
  
  // Control functions
  clearPerformanceMetrics: () => void;
  refreshMetrics: () => void;
  
  // Monitoring state
  isMonitoringEnabled: boolean;
  setMonitoringEnabled: (enabled: boolean) => void;
}

const MonitoringContext = createContext<MonitoringContextType | null>(null);

interface MonitoringProviderProps {
  children: React.ReactNode;
  businessId: string;
  staffId?: string;
  staffName?: string;
  staffRole?: string;
  sessionId?: string;
  enablePerformanceMonitoring?: boolean;
}

/**
 * Provider component that integrates audit logging and performance monitoring
 * for the reception dashboard
 */
export function MonitoringProvider({
  children,
  businessId,
  staffId,
  staffName,
  staffRole,
  sessionId,
  enablePerformanceMonitoring = true,
}: MonitoringProviderProps) {
  const [isMonitoringEnabled, setMonitoringEnabled] = useState(enablePerformanceMonitoring);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize audit logging
  const auditLogging = useAuditLogging({
    businessId,
    staffId,
    staffName,
    staffRole,
    sessionId,
  });

  // Initialize performance monitoring
  const {
    performanceMetrics,
    systemMetrics,
    alerts,
    measureOperation,
    measureSyncOperation,
    clearMetrics,
    isHealthy,
    hasWarnings,
    hasCriticalIssues,
  } = usePerformanceMonitoring(isMonitoringEnabled);

  // Log monitoring state changes
  useEffect(() => {
    if (auditLogging.logSystemError && staffId) {
      auditLogging.logSystemError(
        'monitoring_state_change',
        `Performance monitoring ${isMonitoringEnabled ? 'enabled' : 'disabled'}`,
        'monitoring_toggle'
      );
    }
  }, [isMonitoringEnabled, auditLogging, staffId]);

  // Log critical performance issues
  useEffect(() => {
    if (hasCriticalIssues && alerts.length > 0 && auditLogging.logSystemError && staffId) {
      alerts.forEach(alert => {
        if (alert.includes('Critical') || alert.includes('lost')) {
          auditLogging.logSystemError(
            'performance_critical_issue',
            alert,
            'automatic_detection'
          );
        }
      });
    }
  }, [hasCriticalIssues, alerts, auditLogging, staffId]);

  // Enhanced measurement functions that include audit logging
  const measureOperationWithLogging = async <T>(
    operationType: string,
    operation: () => Promise<T>,
    logDetails?: Record<string, any>
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await measureOperation(operationType, operation);
      
      // Log successful operation
      if (auditLogging.auditLogger && staffId) {
        await auditLogging.auditLogger.logSystemError(
          'performance_operation_success',
          `Operation ${operationType} completed in ${Date.now() - startTime}ms`,
          'performance_tracking'
        );
      }
      
      return result;
    } catch (error) {
      // Log failed operation
      if (auditLogging.logSystemError && staffId) {
        await auditLogging.logSystemError(
          'performance_operation_failure',
          `Operation ${operationType} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'performance_tracking'
        );
      }
      
      throw error;
    }
  };

  const measureSyncOperationWithLogging = <T>(
    operationType: string,
    operation: () => T,
    logDetails?: Record<string, any>
  ): T => {
    const startTime = Date.now();
    
    try {
      const result = measureSyncOperation(operationType, operation);
      
      // Log successful operation (async, don't block)
      if (auditLogging.auditLogger && staffId) {
        auditLogging.auditLogger.logSystemError(
          'performance_operation_success',
          `Sync operation ${operationType} completed in ${Date.now() - startTime}ms`,
          'performance_tracking'
        ).catch(console.error);
      }
      
      return result;
    } catch (error) {
      // Log failed operation (async, don't block)
      if (auditLogging.logSystemError && staffId) {
        auditLogging.logSystemError(
          'performance_operation_failure',
          `Sync operation ${operationType} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'performance_tracking'
        ).catch(console.error);
      }
      
      throw error;
    }
  };

  const clearPerformanceMetrics = () => {
    clearMetrics();
    
    // Log metrics clearing
    if (auditLogging.logSystemError && staffId) {
      auditLogging.logSystemError(
        'performance_metrics_cleared',
        'Performance metrics manually cleared by staff',
        'manual_action'
      );
    }
  };

  const refreshMetrics = () => {
    setRefreshTrigger(prev => prev + 1);
    
    // Log metrics refresh
    if (auditLogging.logSystemError && staffId) {
      auditLogging.logSystemError(
        'performance_metrics_refreshed',
        'Performance metrics manually refreshed by staff',
        'manual_action'
      );
    }
  };

  // Monitor system health and log significant changes
  useEffect(() => {
    if (!systemMetrics || !auditLogging.auditLogger || !staffId) return;

    const healthStatus = isHealthy ? 'healthy' : hasWarnings ? 'warning' : 'critical';
    
    // Log health status changes (debounced to avoid spam)
    const timeoutId = setTimeout(() => {
      auditLogging.auditLogger?.logSystemError(
        'system_health_status',
        `System health status: ${healthStatus}. Memory: ${systemMetrics.memory.percentage.toFixed(1)}%, Network: ${systemMetrics.network.isOnline ? 'online' : 'offline'}, FPS: ${systemMetrics.fps.toFixed(1)}`,
        'health_monitoring'
      );
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [systemMetrics, isHealthy, hasWarnings, hasCriticalIssues, auditLogging, staffId]);

  // Enhanced audit logging with performance context
  const enhancedAuditLogging = {
    ...auditLogging,
    measureOperation: measureOperationWithLogging,
    measureSyncOperation: measureSyncOperationWithLogging,
  };

  const contextValue: MonitoringContextType = {
    auditLogging: enhancedAuditLogging,
    performanceMetrics,
    systemHealth: {
      isHealthy,
      hasWarnings,
      hasCriticalIssues,
      alerts,
    },
    clearPerformanceMetrics,
    refreshMetrics,
    isMonitoringEnabled,
    setMonitoringEnabled,
  };

  return (
    <MonitoringContext.Provider value={contextValue}>
      {children}
    </MonitoringContext.Provider>
  );
}

/**
 * Hook to access monitoring context
 */
export function useMonitoring(): MonitoringContextType {
  const context = useContext(MonitoringContext);
  
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  
  return context;
}

/**
 * Higher-order component for automatic performance monitoring
 */
export function withPerformanceMonitoring<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function MonitoredComponent(props: T) {
    const { auditLogging } = useMonitoring();
    const renderStart = Date.now();

    useEffect(() => {
      const renderTime = Date.now() - renderStart;
      
      // Log component render performance
      auditLogging.auditLogger?.recordPerformanceMetric({
        operationType: `${componentName}_render`,
        duration: renderTime,
        errorCount: 0,
        timestamp: new Date(),
      });
    }, [auditLogging, renderStart]);

    return <Component {...props} />;
  };
}

/**
 * Hook for component-level performance monitoring
 */
export function useComponentMonitoring(componentName: string) {
  const { auditLogging } = useMonitoring();
  const renderCountRef = React.useRef(0);
  const mountTimeRef = React.useRef(Date.now());

  // Track renders
  useEffect(() => {
    renderCountRef.current++;
    
    auditLogging.auditLogger?.recordPerformanceMetric({
      operationType: `${componentName}_render_count`,
      duration: renderCountRef.current,
      errorCount: 0,
      timestamp: new Date(),
    });
  });

  // Track mount/unmount
  useEffect(() => {
    const mountTime = Date.now();
    
    return () => {
      const totalMountTime = Date.now() - mountTime;
      
      auditLogging.auditLogger?.recordPerformanceMetric({
        operationType: `${componentName}_mount_duration`,
        duration: totalMountTime,
        errorCount: 0,
        timestamp: new Date(),
      });
    };
  }, [componentName, auditLogging]);

  return {
    measureOperation: auditLogging.measureOperation,
    measureSyncOperation: auditLogging.measureSyncOperation,
    getRenderCount: () => renderCountRef.current,
    getMountTime: () => mountTimeRef.current,
  };
}