"use client";

import {
  updateSessionActivity,
  updateScreenAccess,
  updateTaskCompletion,
  updateActiveTime,
  updateSessionIdleTime,
} from "./staff-activity-tracking";

interface ActivityTracker {
  sessionId: string;
  lastActivityTime: number;
  currentScreen: string;
  screenStartTime: number;
  idleThreshold: number; // minutes
  activityCheckInterval: number; // milliseconds
  isTracking: boolean;
  intervalId?: NodeJS.Timeout;
  idleTimeoutId?: NodeJS.Timeout;
}

class StaffActivityMiddleware {
  private tracker: ActivityTracker | null = null;
  private activityListeners: (() => void)[] = [];

  /**
   * Initialize activity tracking for a staff session
   * @param sessionId - The session ID to track
   * @param idleThreshold - Minutes of inactivity before marking as idle (default: 5)
   * @param activityCheckInterval - How often to check for activity in ms (default: 30000)
   */
  public initializeTracking(
    sessionId: string,
    idleThreshold: number = 5,
    activityCheckInterval: number = 30000
  ): void {
    if (this.tracker) {
      this.stopTracking();
    }

    this.tracker = {
      sessionId,
      lastActivityTime: Date.now(),
      currentScreen: window.location.pathname,
      screenStartTime: Date.now(),
      idleThreshold,
      activityCheckInterval,
      isTracking: true,
    };

    this.startTracking();
    this.setupEventListeners();
  }

  /**
   * Stop activity tracking
   */
  public stopTracking(): void {
    if (!this.tracker) return;

    this.tracker.isTracking = false;

    if (this.tracker.intervalId) {
      clearInterval(this.tracker.intervalId);
    }

    if (this.tracker.idleTimeoutId) {
      clearTimeout(this.tracker.idleTimeoutId);
    }

    this.removeEventListeners();
    this.recordScreenTime();
    this.tracker = null;
  }

  /**
   * Record a page visit
   * @param pageName - Name of the page visited
   */
  public recordPageVisit(pageName?: string): void {
    if (!this.tracker) return;

    const currentPage = pageName || window.location.pathname;

    // Record screen time for previous screen
    if (this.tracker.currentScreen !== currentPage) {
      this.recordScreenTime();
      this.tracker.currentScreen = currentPage;
      this.tracker.screenStartTime = Date.now();
    }

    this.updateActivity();
    updateSessionActivity(this.tracker.sessionId, "page_visit");
  }

  /**
   * Record an action performed by the staff member
   * @param actionName - Name of the action
   */
  public recordAction(actionName: string): void {
    if (!this.tracker) return;

    this.updateActivity();
    updateSessionActivity(this.tracker.sessionId, "action");
  }

  /**
   * Record a completed task
   * @param taskName - Name of the completed task
   * @param success - Whether the task was completed successfully
   * @param details - Additional task details
   */
  public recordTaskCompletion(
    taskName: string,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
    if (!this.tracker) return;

    this.updateActivity();
    updateTaskCompletion(this.tracker.sessionId, taskName, success, details);
  }

  /**
   * Record break time
   * @param minutes - Number of break minutes
   */
  public recordBreakTime(minutes: number): void {
    if (!this.tracker) return;

    // Implementation would depend on how breaks are tracked in your system
    // For now, we'll just update the activity time
    this.updateActivity();
  }

  /**
   * Get current tracking status
   */
  public getTrackingStatus(): {
    isTracking: boolean;
    sessionId: string | null;
    currentScreen: string | null;
    lastActivity: number | null;
  } {
    return {
      isTracking: this.tracker?.isTracking || false,
      sessionId: this.tracker?.sessionId || null,
      currentScreen: this.tracker?.currentScreen || null,
      lastActivity: this.tracker?.lastActivityTime || null,
    };
  }

  private startTracking(): void {
    if (!this.tracker) return;

    // Set up periodic activity checks
    this.tracker.intervalId = setInterval(() => {
      this.checkIdleStatus();
      this.updateActiveTime();
    }, this.tracker.activityCheckInterval);
  }

  private setupEventListeners(): void {
    // Mouse movement
    const handleMouseMove = () => this.updateActivity();
    document.addEventListener("mousemove", handleMouseMove);
    this.activityListeners.push(() =>
      document.removeEventListener("mousemove", handleMouseMove)
    );

    // Keyboard activity
    const handleKeyPress = () => this.updateActivity();
    document.addEventListener("keypress", handleKeyPress);
    this.activityListeners.push(() =>
      document.removeEventListener("keypress", handleKeyPress)
    );

    // Click events
    const handleClick = () => this.updateActivity();
    document.addEventListener("click", handleClick);
    this.activityListeners.push(() =>
      document.removeEventListener("click", handleClick)
    );

    // Scroll events
    const handleScroll = () => this.updateActivity();
    document.addEventListener("scroll", handleScroll);
    this.activityListeners.push(() =>
      document.removeEventListener("scroll", handleScroll)
    );

    // Page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.recordScreenTime();
      } else {
        this.updateActivity();
        if (this.tracker) {
          this.tracker.screenStartTime = Date.now();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    this.activityListeners.push(() =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    );

    // Before unload (page navigation/close)
    const handleBeforeUnload = () => {
      this.recordScreenTime();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    this.activityListeners.push(() =>
      window.removeEventListener("beforeunload", handleBeforeUnload)
    );
  }

  private removeEventListeners(): void {
    this.activityListeners.forEach((removeListener) => removeListener());
    this.activityListeners = [];
  }

  private updateActivity(): void {
    if (!this.tracker) return;

    this.tracker.lastActivityTime = Date.now();

    // Clear any existing idle timeout
    if (this.tracker.idleTimeoutId) {
      clearTimeout(this.tracker.idleTimeoutId);
    }

    // Set new idle timeout
    this.tracker.idleTimeoutId = setTimeout(() => {
      this.handleIdleTimeout();
    }, this.tracker.idleThreshold * 60 * 1000);
  }

  private checkIdleStatus(): void {
    if (!this.tracker) return;

    const now = Date.now();
    const timeSinceLastActivity = now - this.tracker.lastActivityTime;
    const idleThresholdMs = this.tracker.idleThreshold * 60 * 1000;

    if (timeSinceLastActivity >= idleThresholdMs) {
      const idleMinutes = Math.floor(timeSinceLastActivity / (60 * 1000));
      updateSessionIdleTime(this.tracker.sessionId, idleMinutes);
    }
  }

  private updateActiveTime(): void {
    if (!this.tracker) return;

    const now = Date.now();
    const timeSinceLastActivity = now - this.tracker.lastActivityTime;
    const idleThresholdMs = this.tracker.idleThreshold * 60 * 1000;

    // Only count as active time if within idle threshold
    if (timeSinceLastActivity < idleThresholdMs) {
      const activeMinutes = Math.floor(
        this.tracker.activityCheckInterval / (60 * 1000)
      );
      updateActiveTime(this.tracker.sessionId, activeMinutes);
    }
  }

  private handleIdleTimeout(): void {
    if (!this.tracker) return;

    const idleMinutes = this.tracker.idleThreshold;
    updateSessionIdleTime(this.tracker.sessionId, idleMinutes);
  }

  private recordScreenTime(): void {
    if (!this.tracker) return;

    const now = Date.now();
    const timeSpent = now - this.tracker.screenStartTime;
    const minutesSpent = Math.floor(timeSpent / (60 * 1000));

    if (minutesSpent > 0) {
      updateScreenAccess(
        this.tracker.sessionId,
        this.tracker.currentScreen,
        minutesSpent
      );
    }
  }
}

// Create a singleton instance
const activityMiddleware = new StaffActivityMiddleware();

export default activityMiddleware;

// Export convenience functions
export const initializeActivityTracking = (
  sessionId: string,
  idleThreshold?: number,
  activityCheckInterval?: number
) => {
  activityMiddleware.initializeTracking(
    sessionId,
    idleThreshold,
    activityCheckInterval
  );
};

export const stopActivityTracking = () => {
  activityMiddleware.stopTracking();
};

export const recordPageVisit = (pageName?: string) => {
  activityMiddleware.recordPageVisit(pageName);
};

export const recordAction = (actionName: string) => {
  activityMiddleware.recordAction(actionName);
};

export const recordTaskCompletion = (
  taskName: string,
  success: boolean,
  details?: Record<string, unknown>
) => {
  activityMiddleware.recordTaskCompletion(taskName, success, details);
};

export const recordBreakTime = (minutes: number) => {
  activityMiddleware.recordBreakTime(minutes);
};

export const getTrackingStatus = () => {
  return activityMiddleware.getTrackingStatus();
};
