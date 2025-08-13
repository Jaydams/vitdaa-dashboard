"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  initializeActivityTracking,
  stopActivityTracking,
  recordPageVisit,
  recordAction,
  recordTaskCompletion,
  recordBreakTime,
  getTrackingStatus,
} from "@/lib/staff-activity-middleware";

interface UseActivityTrackingOptions {
  sessionId: string;
  enabled?: boolean;
  idleThreshold?: number; // minutes
  activityCheckInterval?: number; // milliseconds
  autoTrackPageVisits?: boolean;
}

interface ActivityTrackingHook {
  isTracking: boolean;
  recordPageVisit: (pageName?: string) => void;
  recordAction: (actionName: string) => void;
  recordTaskCompletion: (
    taskName: string,
    success: boolean,
    details?: Record<string, unknown>
  ) => void;
  recordBreakTime: (minutes: number) => void;
  startTracking: () => void;
  stopTracking: () => void;
  getStatus: () => {
    isTracking: boolean;
    sessionId: string | null;
    currentScreen: string | null;
    lastActivity: number | null;
  };
}

export function useActivityTracking({
  sessionId,
  enabled = true,
  idleThreshold = 5,
  activityCheckInterval = 30000,
  autoTrackPageVisits = true,
}: UseActivityTrackingOptions): ActivityTrackingHook {
  const isInitialized = useRef(false);
  const currentPath = useRef("");

  // Initialize tracking when component mounts or sessionId changes
  useEffect(() => {
    if (!enabled || !sessionId) return;

    if (!isInitialized.current) {
      initializeActivityTracking(
        sessionId,
        idleThreshold,
        activityCheckInterval
      );
      isInitialized.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (isInitialized.current) {
        stopActivityTracking();
        isInitialized.current = false;
      }
    };
  }, [sessionId, enabled, idleThreshold, activityCheckInterval]);

  // Auto-track page visits when pathname changes
  useEffect(() => {
    if (!enabled || !autoTrackPageVisits || typeof window === "undefined")
      return;

    const newPath = window.location.pathname;
    if (currentPath.current !== newPath) {
      currentPath.current = newPath;
      if (isInitialized.current) {
        recordPageVisit(newPath);
      }
    }
  }, [enabled, autoTrackPageVisits]);

  // Track page visits on route changes (for Next.js)
  useEffect(() => {
    if (!enabled || !autoTrackPageVisits || typeof window === "undefined")
      return;

    const handleRouteChange = () => {
      const newPath = window.location.pathname;
      if (currentPath.current !== newPath) {
        currentPath.current = newPath;
        if (isInitialized.current) {
          recordPageVisit(newPath);
        }
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", handleRouteChange);

    // For Next.js router events, you might want to add:
    // import { useRouter } from 'next/router';
    // const router = useRouter();
    // router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      // router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [enabled, autoTrackPageVisits]);

  const handleRecordPageVisit = useCallback(
    (pageName?: string) => {
      if (enabled && isInitialized.current) {
        recordPageVisit(pageName);
      }
    },
    [enabled]
  );

  const handleRecordAction = useCallback(
    (actionName: string) => {
      if (enabled && isInitialized.current) {
        recordAction(actionName);
      }
    },
    [enabled]
  );

  const handleRecordTaskCompletion = useCallback(
    (taskName: string, success: boolean, details?: Record<string, unknown>) => {
      if (enabled && isInitialized.current) {
        recordTaskCompletion(taskName, success, details);
      }
    },
    [enabled]
  );

  const handleRecordBreakTime = useCallback(
    (minutes: number) => {
      if (enabled && isInitialized.current) {
        recordBreakTime(minutes);
      }
    },
    [enabled]
  );

  const handleStartTracking = useCallback(() => {
    if (!isInitialized.current && sessionId) {
      initializeActivityTracking(
        sessionId,
        idleThreshold,
        activityCheckInterval
      );
      isInitialized.current = true;
    }
  }, [sessionId, idleThreshold, activityCheckInterval]);

  const handleStopTracking = useCallback(() => {
    if (isInitialized.current) {
      stopActivityTracking();
      isInitialized.current = false;
    }
  }, []);

  const handleGetStatus = useCallback(() => {
    return getTrackingStatus();
  }, []);

  return {
    isTracking: isInitialized.current && enabled,
    recordPageVisit: handleRecordPageVisit,
    recordAction: handleRecordAction,
    recordTaskCompletion: handleRecordTaskCompletion,
    recordBreakTime: handleRecordBreakTime,
    startTracking: handleStartTracking,
    stopTracking: handleStopTracking,
    getStatus: handleGetStatus,
  };
}

// Higher-order component for automatic activity tracking
export function withActivityTracking<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<UseActivityTrackingOptions, "sessionId"> & {
    getSessionId: (props: P) => string;
  }
) {
  return function ActivityTrackingWrapper(props: P) {
    const sessionId = options.getSessionId(props);
    const activityTracking = useActivityTracking({
      ...options,
      sessionId,
    });

    return <Component {...props} activityTracking={activityTracking} />;
  };
}

// Hook for tracking specific form interactions
export function useFormActivityTracking(
  sessionId: string,
  formName: string,
  enabled: boolean = true
) {
  const { recordAction, recordTaskCompletion } = useActivityTracking({
    sessionId,
    enabled,
  });

  const trackFieldFocus = useCallback(
    (fieldName: string) => {
      recordAction(`${formName}_field_focus_${fieldName}`);
    },
    [recordAction, formName]
  );

  const trackFieldChange = useCallback(
    (fieldName: string) => {
      recordAction(`${formName}_field_change_${fieldName}`);
    },
    [recordAction, formName]
  );

  const trackFormSubmit = useCallback(
    (success: boolean, errors?: string[]) => {
      recordTaskCompletion(`${formName}_submit`, success, {
        errors: errors || [],
      });
    },
    [recordTaskCompletion, formName]
  );

  const trackFormValidation = useCallback(
    (isValid: boolean, errorCount: number) => {
      recordAction(`${formName}_validation_${isValid ? "success" : "error"}`);
    },
    [recordAction, formName]
  );

  return {
    trackFieldFocus,
    trackFieldChange,
    trackFormSubmit,
    trackFormValidation,
  };
}

// Hook for tracking button clicks and interactions
export function useInteractionTracking(
  sessionId: string,
  enabled: boolean = true
) {
  const { recordAction } = useActivityTracking({
    sessionId,
    enabled,
  });

  const trackButtonClick = useCallback(
    (buttonName: string, context?: string) => {
      const actionName = context
        ? `button_click_${buttonName}_${context}`
        : `button_click_${buttonName}`;
      recordAction(actionName);
    },
    [recordAction]
  );

  const trackLinkClick = useCallback(
    (linkName: string, destination?: string) => {
      recordAction(
        `link_click_${linkName}${destination ? `_to_${destination}` : ""}`
      );
    },
    [recordAction]
  );

  const trackModalOpen = useCallback(
    (modalName: string) => {
      recordAction(`modal_open_${modalName}`);
    },
    [recordAction]
  );

  const trackModalClose = useCallback(
    (modalName: string) => {
      recordAction(`modal_close_${modalName}`);
    },
    [recordAction]
  );

  const trackTabChange = useCallback(
    (tabName: string) => {
      recordAction(`tab_change_${tabName}`);
    },
    [recordAction]
  );

  return {
    trackButtonClick,
    trackLinkClick,
    trackModalOpen,
    trackModalClose,
    trackTabChange,
  };
}
