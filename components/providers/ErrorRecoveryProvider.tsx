"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ErrorRecoveryService,
  FallbackOption,
  RecoveryContext,
} from "@/lib/error-recovery-service";
import { OfflineManager, PendingAction } from "@/lib/offline-manager";
import {
  SessionManager,
  SessionState,
  SessionConflict,
} from "@/lib/session-manager";
import { SessionStateManager } from "@/lib/session-state-manager";
import { AutoReauthService } from "@/lib/auto-reauth-service";
import { toast } from "sonner";

interface ErrorRecoveryContextType {
  // Error Recovery
  recoverFromError: (
    error: Error | unknown,
    context: RecoveryContext,
    customFallbacks?: FallbackOption[]
  ) => Promise<any>;

  // Offline Management
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: PendingAction[];
  queueAction: (
    type: string,
    payload: any,
    priority?: "low" | "normal" | "high" | "critical"
  ) => string;
  forceSync: () => Promise<void>;

  // Session Management
  session: SessionState | null;
  timeUntilExpiry: number;
  isSessionValid: boolean;
  extendSession: (minutes?: number) => Promise<void>;
  saveWorkInProgress: (data: any) => void;

  // Enhanced Session Features
  isReauthenticating: boolean;
  saveComponentWork: (component: string, data: any, options?: any) => string;
  getComponentWork: (component: string) => any[];
  clearComponentWork: (component: string) => void;
  createStateSnapshot: () => any;
  restoreStateSnapshot: (snapshot: any) => Promise<void>;

  // Status
  hasIssues: boolean;
  issueCount: number;
}

const ErrorRecoveryContext = createContext<ErrorRecoveryContextType | null>(
  null
);

interface ErrorRecoveryProviderProps {
  children: React.ReactNode;
  enableAutoRecovery?: boolean;
  enableSessionManagement?: boolean;
  enableOfflineSupport?: boolean;
  onSessionConflict?: (conflict: SessionConflict) => void;
  onCriticalError?: (error: Error, context: RecoveryContext) => void;
}

export function ErrorRecoveryProvider({
  children,
  enableAutoRecovery = true,
  enableSessionManagement = true,
  enableOfflineSupport = true,
  onSessionConflict,
  onCriticalError,
}: ErrorRecoveryProviderProps) {
  // Error Recovery Service
  const [recoveryService] = useState(() => ErrorRecoveryService.getInstance());

  // Offline Manager
  const [offlineManager] = useState(() => OfflineManager.getInstance());
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  // Session Manager
  const [sessionManager] = useState(() => SessionManager.getInstance());
  const [session, setSession] = useState<SessionState | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(0);

  // Enhanced Session Services
  const [stateManager] = useState(() => SessionStateManager.getInstance());
  const [autoReauthService] = useState(() => AutoReauthService.getInstance());
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  // Initialize services
  useEffect(() => {
    if (enableOfflineSupport) {
      // Set initial offline state
      setIsOnline(offlineManager.isOnline());
      setIsSyncing(offlineManager.isSyncing());
      setPendingActions(offlineManager.getPendingActions());

      // Subscribe to offline manager changes
      const unsubscribeSync = offlineManager.addSyncListener(setIsSyncing);
      const unsubscribeQueue =
        offlineManager.addQueueListener(setPendingActions);
      const unsubscribeNetwork =
        offlineManager["networkMonitor"].addListener(setIsOnline);

      return () => {
        unsubscribeSync();
        unsubscribeQueue();
        unsubscribeNetwork();
      };
    }
  }, [enableOfflineSupport, offlineManager]);

  useEffect(() => {
    if (enableSessionManagement) {
      // Set initial session state
      setSession(sessionManager.getCurrentSession());
      setTimeUntilExpiry(sessionManager.getTimeUntilExpiry());

      // Subscribe to session changes
      const unsubscribeSession = sessionManager.addSessionListener(setSession);

      // Subscribe to session conflicts
      const unsubscribeConflict = sessionManager.addConflictListener(
        (conflict) => {
          if (onSessionConflict) {
            onSessionConflict(conflict);
          } else {
            // Default conflict handling
            toast.warning(
              "Session conflict detected. Resolving automatically..."
            );
          }
        }
      );

      // Update expiry time every minute
      const interval = setInterval(() => {
        setTimeUntilExpiry(sessionManager.getTimeUntilExpiry());
      }, 60000);

      return () => {
        unsubscribeSession();
        unsubscribeConflict();
        clearInterval(interval);
      };
    }
  }, [enableSessionManagement, sessionManager, onSessionConflict]);

  // Auto-reauth service monitoring
  useEffect(() => {
    if (enableSessionManagement) {
      // Set initial reauth state
      setIsReauthenticating(autoReauthService.getStatus().isReauthenticating);

      // Subscribe to reauth status changes
      const unsubscribeReauth = autoReauthService.addStatusListener(
        (status) => {
          setIsReauthenticating(status.isReauthenticating);

          if (status.lastAttempt) {
            if (status.lastAttempt.success) {
              toast.success("Session automatically renewed");
            } else if (!status.isReauthenticating) {
              toast.error("Failed to renew session automatically");
            }
          }
        }
      );

      return unsubscribeReauth;
    }
  }, [enableSessionManagement, autoReauthService]);

  // Auto-recovery setup
  useEffect(() => {
    if (enableAutoRecovery) {
      // Global error handler
      const handleGlobalError = (event: ErrorEvent) => {
        const context: RecoveryContext = {
          component: "Global",
          action: "unhandled_error",
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        };

        recoveryService
          .recoverFromError(event.error, context)
          .then((result) => {
            if (!result.success && onCriticalError) {
              onCriticalError(event.error, context);
            }
          });
      };

      // Unhandled promise rejection handler
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const context: RecoveryContext = {
          component: "Global",
          action: "unhandled_promise_rejection",
          metadata: {
            reason: event.reason,
          },
        };

        const error =
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));

        recoveryService.recoverFromError(error, context).then((result) => {
          if (!result.success && onCriticalError) {
            onCriticalError(error, context);
          }
        });
      };

      window.addEventListener("error", handleGlobalError);
      window.addEventListener("unhandledrejection", handleUnhandledRejection);

      return () => {
        window.removeEventListener("error", handleGlobalError);
        window.removeEventListener(
          "unhandledrejection",
          handleUnhandledRejection
        );
      };
    }
  }, [enableAutoRecovery, recoveryService, onCriticalError]);

  // Session expiry warning
  useEffect(() => {
    if (enableSessionManagement && session && timeUntilExpiry > 0) {
      // Warn when 5 minutes left
      if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 4 * 60 * 1000) {
        toast.warning(
          "Your session will expire in 5 minutes. Click to extend.",
          {
            action: {
              label: "Extend Session",
              onClick: () => sessionManager.extendSession(),
            },
            duration: 10000,
          }
        );
      }

      // Warn when 1 minute left
      if (timeUntilExpiry <= 60 * 1000 && timeUntilExpiry > 30 * 1000) {
        toast.error("Your session will expire in 1 minute! Click to extend.", {
          action: {
            label: "Extend Now",
            onClick: () => sessionManager.extendSession(),
          },
          duration: 30000,
        });
      }
    }
  }, [timeUntilExpiry, session, enableSessionManagement, sessionManager]);

  // Context value
  const contextValue: ErrorRecoveryContextType = {
    // Error Recovery
    recoverFromError: recoveryService.recoverFromError.bind(recoveryService),

    // Offline Management
    isOnline,
    isSyncing,
    pendingActions,
    queueAction: (
      type: string,
      payload: any,
      priority?: "low" | "normal" | "high" | "critical"
    ) => {
      return offlineManager.queueAction({
        type,
        payload,
        priority: priority || "normal",
        maxRetries: 3,
      });
    },
    forceSync: offlineManager.forcSync.bind(offlineManager),

    // Session Management
    session,
    timeUntilExpiry,
    isSessionValid: sessionManager.isSessionValid(),
    extendSession: sessionManager.extendSession.bind(sessionManager),
    saveWorkInProgress: sessionManager.saveWorkInProgress.bind(sessionManager),

    // Enhanced Session Features
    isReauthenticating,
    saveComponentWork: stateManager.saveWorkInProgress.bind(stateManager),
    getComponentWork: stateManager.getWorkInProgress.bind(stateManager),
    clearComponentWork: stateManager.clearComponentWork.bind(stateManager),
    createStateSnapshot: stateManager.createSnapshot.bind(stateManager),
    restoreStateSnapshot: stateManager.restoreSnapshot.bind(stateManager),

    // Status
    hasIssues:
      !isOnline ||
      pendingActions.length > 0 ||
      !sessionManager.isSessionValid() ||
      isReauthenticating,
    issueCount:
      (!isOnline ? 1 : 0) +
      pendingActions.length +
      (!sessionManager.isSessionValid() ? 1 : 0) +
      (isReauthenticating ? 1 : 0),
  };

  return (
    <ErrorRecoveryContext.Provider value={contextValue}>
      {children}
    </ErrorRecoveryContext.Provider>
  );
}

/**
 * Hook to use error recovery context
 */
export function useErrorRecoveryContext(): ErrorRecoveryContextType {
  const context = useContext(ErrorRecoveryContext);
  if (!context) {
    throw new Error(
      "useErrorRecoveryContext must be used within an ErrorRecoveryProvider"
    );
  }
  return context;
}

/**
 * HOC to wrap components with error recovery
 */
export function withErrorRecovery<P extends object>(
  Component: React.ComponentType<P>,
  recoveryOptions?: {
    componentName?: string;
    enableAutoRecovery?: boolean;
    customFallbacks?: FallbackOption[];
  }
) {
  const WrappedComponent = (props: P) => {
    const { recoverFromError } = useErrorRecoveryContext();

    // Error boundary for the component
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      const handleError = (error: Error) => {
        setError(error);
        setHasError(true);

        const context: RecoveryContext = {
          component:
            recoveryOptions?.componentName ||
            Component.displayName ||
            Component.name ||
            "Unknown",
          action: "component_error",
          metadata: { props },
        };

        if (recoveryOptions?.enableAutoRecovery !== false) {
          recoverFromError(
            error,
            context,
            recoveryOptions?.customFallbacks
          ).then((result) => {
            if (result.success) {
              setHasError(false);
              setError(null);
            }
          });
        }
      };

      // This is a simplified error boundary - in practice, you'd use React Error Boundaries
      const errorHandler = (event: ErrorEvent) => {
        if (event.error) {
          handleError(event.error);
        }
      };

      window.addEventListener("error", errorHandler);

      return () => {
        window.removeEventListener("error", errorHandler);
      };
    }, [recoverFromError, props]);

    if (hasError && error) {
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-md">
          <h3 className="text-red-800 font-medium">Component Error</h3>
          <p className="text-red-600 text-sm mt-1">
            An error occurred in{" "}
            {recoveryOptions?.componentName || "this component"}.
          </p>
          <button
            onClick={() => {
              setHasError(false);
              setError(null);
            }}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withErrorRecovery(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
}

/**
 * Hook for component-level error recovery
 */
export function useComponentErrorRecovery(componentName: string) {
  const { recoverFromError, saveWorkInProgress } = useErrorRecoveryContext();

  const handleError = React.useCallback(
    async (error: Error | unknown, action: string, metadata?: any) => {
      const context: RecoveryContext = {
        component: componentName,
        action,
        metadata,
      };

      return recoverFromError(error, context);
    },
    [recoverFromError, componentName]
  );

  const saveWork = React.useCallback(
    (data: any) => {
      saveWorkInProgress({
        component: componentName,
        data,
        timestamp: new Date().toISOString(),
      });
    },
    [saveWorkInProgress, componentName]
  );

  return {
    handleError,
    saveWork,
  };
}
