"use client";

import { ErrorRecoveryService } from "@/lib/error-recovery-service";
import { OfflineManager } from "@/lib/offline-manager";

export interface SessionState {
  staffId: string;
  sessionId: string;
  role: string;
  businessId: string;
  expiresAt: string;
  lastActivity: string;
  deviceId: string;
  workInProgress?: any;
}

export interface SessionConflict {
  currentSession: SessionState;
  conflictingSession: SessionState;
  conflictType: "device_switch" | "concurrent_login" | "expired_session";
}

export interface SessionRecoveryOptions {
  preserveWorkInProgress: boolean;
  autoReauthenticate: boolean;
  conflictResolution: "takeover" | "merge" | "ask_user";
}

const DEFAULT_SESSION_OPTIONS: SessionRecoveryOptions = {
  preserveWorkInProgress: true,
  autoReauthenticate: true,
  conflictResolution: "ask_user",
};

/**
 * Enhanced session management with graceful expiration handling and conflict resolution
 */
export class SessionManager {
  private static instance: SessionManager;
  private currentSession: SessionState | null = null;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private workInProgressKey = "vitdaa_work_in_progress";
  private sessionKey = "vitdaa_session_state";
  private recoveryService: ErrorRecoveryService;
  private offlineManager: OfflineManager;
  private options: SessionRecoveryOptions;
  private sessionListeners: Set<(session: SessionState | null) => void> =
    new Set();
  private conflictListeners: Set<(conflict: SessionConflict) => void> =
    new Set();

  private constructor(options: Partial<SessionRecoveryOptions> = {}) {
    this.options = { ...DEFAULT_SESSION_OPTIONS, ...options };
    this.recoveryService = ErrorRecoveryService.getInstance();
    this.offlineManager = OfflineManager.getInstance();

    this.loadPersistedSession();
    this.startSessionMonitoring();
    this.setupBeforeUnloadHandler();
  }

  static getInstance(
    options?: Partial<SessionRecoveryOptions>
  ): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(options);
    }
    return SessionManager.instance;
  }

  /**
   * Initialize a new session
   */
  async initializeSession(
    sessionData: Omit<SessionState, "lastActivity" | "deviceId">
  ): Promise<void> {
    const deviceId = this.getOrCreateDeviceId();
    const session: SessionState = {
      ...sessionData,
      lastActivity: new Date().toISOString(),
      deviceId,
    };

    // Check for existing sessions
    const existingSession = await this.checkForExistingSession(session);
    if (existingSession) {
      await this.handleSessionConflict(session, existingSession);
      return;
    }

    this.currentSession = session;
    this.persistSession();
    this.notifySessionListeners();

    // Restore work in progress if available
    if (this.options.preserveWorkInProgress) {
      await this.restoreWorkInProgress();
    }
  }

  /**
   * Update session activity
   */
  updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = new Date().toISOString();
      this.persistSession();
    }
  }

  /**
   * Save work in progress
   */
  saveWorkInProgress(data: any): void {
    if (!this.currentSession) return;

    const workData = {
      sessionId: this.currentSession.sessionId,
      staffId: this.currentSession.staffId,
      timestamp: new Date().toISOString(),
      data,
    };

    try {
      localStorage.setItem(this.workInProgressKey, JSON.stringify(workData));
    } catch (error) {
      console.warn("Failed to save work in progress:", error);
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    if (!this.currentSession) return false;

    const now = new Date();
    const expiresAt = new Date(this.currentSession.expiresAt);

    return now < expiresAt;
  }

  /**
   * Get time until session expires
   */
  getTimeUntilExpiry(): number {
    if (!this.currentSession) return 0;

    const now = new Date().getTime();
    const expiresAt = new Date(this.currentSession.expiresAt).getTime();

    return Math.max(0, expiresAt - now);
  }

  /**
   * Extend session expiry
   */
  async extendSession(additionalMinutes: number = 30): Promise<void> {
    if (!this.currentSession) return;

    const newExpiryTime = new Date();
    newExpiryTime.setMinutes(newExpiryTime.getMinutes() + additionalMinutes);

    this.currentSession.expiresAt = newExpiryTime.toISOString();
    this.persistSession();

    // Notify server about session extension
    try {
      await this.notifyServerSessionExtension();
    } catch (error) {
      console.warn("Failed to notify server about session extension:", error);
    }
  }

  /**
   * Handle session expiration gracefully
   */
  async handleSessionExpiration(): Promise<void> {
    if (!this.currentSession) return;

    // Save current work before expiration
    if (this.options.preserveWorkInProgress) {
      const currentWork = this.getCurrentWorkInProgress();
      if (currentWork) {
        this.saveWorkInProgress(currentWork);
      }
    }

    // Attempt automatic re-authentication
    if (this.options.autoReauthenticate) {
      try {
        await this.attemptReauthentication();
        return;
      } catch (error) {
        console.warn("Automatic re-authentication failed:", error);
      }
    }

    // Clear session and redirect to login
    await this.clearSession();
    this.redirectToLogin();
  }

  /**
   * Clear current session
   */
  async clearSession(): Promise<void> {
    if (this.currentSession) {
      // Save work in progress before clearing
      if (this.options.preserveWorkInProgress) {
        const currentWork = this.getCurrentWorkInProgress();
        if (currentWork) {
          this.saveWorkInProgress(currentWork);
        }
      }

      // Notify server about session end
      try {
        await this.notifyServerSessionEnd();
      } catch (error) {
        console.warn("Failed to notify server about session end:", error);
      }
    }

    this.currentSession = null;
    this.clearPersistedSession();
    this.notifySessionListeners();
  }

  /**
   * Add session listener
   */
  addSessionListener(
    listener: (session: SessionState | null) => void
  ): () => void {
    this.sessionListeners.add(listener);
    return () => this.sessionListeners.delete(listener);
  }

  /**
   * Add conflict listener
   */
  addConflictListener(
    listener: (conflict: SessionConflict) => void
  ): () => void {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  /**
   * Handle session conflicts
   */
  private async handleSessionConflict(
    newSession: SessionState,
    existingSession: SessionState
  ): Promise<void> {
    const conflictType = this.determineConflictType(
      newSession,
      existingSession
    );
    const conflict: SessionConflict = {
      currentSession: newSession,
      conflictingSession: existingSession,
      conflictType,
    };

    // Notify conflict listeners
    this.conflictListeners.forEach((listener) => listener(conflict));

    switch (this.options.conflictResolution) {
      case "takeover":
        await this.takeoverSession(newSession);
        break;
      case "merge":
        await this.mergeSessions(newSession, existingSession);
        break;
      case "ask_user":
        // This would typically show a UI dialog
        // For now, we'll default to takeover
        await this.takeoverSession(newSession);
        break;
    }
  }

  /**
   * Determine conflict type
   */
  private determineConflictType(
    newSession: SessionState,
    existingSession: SessionState
  ): SessionConflict["conflictType"] {
    if (newSession.deviceId !== existingSession.deviceId) {
      return "device_switch";
    }

    const existingExpiry = new Date(existingSession.expiresAt);
    const now = new Date();

    if (now > existingExpiry) {
      return "expired_session";
    }

    return "concurrent_login";
  }

  /**
   * Takeover existing session
   */
  private async takeoverSession(newSession: SessionState): Promise<void> {
    // Preserve work in progress from existing session
    if (this.options.preserveWorkInProgress) {
      const existingWork = await this.getWorkInProgressFromSession(
        this.currentSession
      );
      if (existingWork) {
        newSession.workInProgress = existingWork;
      }
    }

    this.currentSession = newSession;
    this.persistSession();
    this.notifySessionListeners();
  }

  /**
   * Merge sessions
   */
  private async mergeSessions(
    newSession: SessionState,
    existingSession: SessionState
  ): Promise<void> {
    // Merge work in progress
    const existingWork = await this.getWorkInProgressFromSession(
      existingSession
    );
    const newWork = newSession.workInProgress;

    if (existingWork && newWork) {
      // Merge logic would depend on the specific data structure
      newSession.workInProgress = { ...existingWork, ...newWork };
    } else if (existingWork) {
      newSession.workInProgress = existingWork;
    }

    this.currentSession = newSession;
    this.persistSession();
    this.notifySessionListeners();
  }

  /**
   * Check for existing session
   */
  private async checkForExistingSession(
    newSession: SessionState
  ): Promise<SessionState | null> {
    try {
      const response = await fetch(
        `/api/staff/sessions/${newSession.staffId}/check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deviceId: newSession.deviceId,
            sessionId: newSession.sessionId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.existingSession || null;
      }
    } catch (error) {
      console.warn("Failed to check for existing session:", error);
    }

    return null;
  }

  /**
   * Attempt automatic re-authentication
   */
  private async attemptReauthentication(): Promise<void> {
    if (!this.currentSession) throw new Error("No session to re-authenticate");

    try {
      const response = await fetch("/api/staff/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.currentSession.sessionId,
          staffId: this.currentSession.staffId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.currentSession.expiresAt = data.expiresAt;
        this.currentSession.sessionId = data.sessionId;
        this.persistSession();
        this.notifySessionListeners();
      } else {
        throw new Error("Re-authentication failed");
      }
    } catch (error) {
      throw new Error(`Re-authentication failed: ${error}`);
    }
  }

  /**
   * Get or create device ID
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem("vitdaa_device_id");
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      localStorage.setItem("vitdaa_device_id", deviceId);
    }
    return deviceId;
  }

  /**
   * Load persisted session
   */
  private loadPersistedSession(): void {
    try {
      const stored = localStorage.getItem(this.sessionKey);
      if (stored) {
        const session: SessionState = JSON.parse(stored);
        if (this.isSessionDataValid(session)) {
          this.currentSession = session;
        } else {
          this.clearPersistedSession();
        }
      }
    } catch (error) {
      console.warn("Failed to load persisted session:", error);
      this.clearPersistedSession();
    }
  }

  /**
   * Persist session to storage
   */
  private persistSession(): void {
    if (!this.currentSession) return;

    try {
      localStorage.setItem(
        this.sessionKey,
        JSON.stringify(this.currentSession)
      );
    } catch (error) {
      console.warn("Failed to persist session:", error);
    }
  }

  /**
   * Clear persisted session
   */
  private clearPersistedSession(): void {
    localStorage.removeItem(this.sessionKey);
  }

  /**
   * Validate session data
   */
  private isSessionDataValid(session: SessionState): boolean {
    return !!(
      session.staffId &&
      session.sessionId &&
      session.role &&
      session.businessId &&
      session.expiresAt &&
      session.deviceId
    );
  }

  /**
   * Start session monitoring
   */
  private startSessionMonitoring(): void {
    // Check session every minute
    this.sessionCheckInterval = setInterval(() => {
      if (this.currentSession) {
        if (!this.isSessionValid()) {
          this.handleSessionExpiration();
        } else {
          // Update activity if user is active
          if (this.isUserActive()) {
            this.updateActivity();
          }
        }
      }
    }, 60000);
  }

  /**
   * Check if user is active
   */
  private isUserActive(): boolean {
    // Simple activity detection - could be enhanced
    const lastActivity = localStorage.getItem("last_user_activity");
    if (!lastActivity) return false;

    const timeSinceActivity = Date.now() - parseInt(lastActivity);
    return timeSinceActivity < 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Setup before unload handler
   */
  private setupBeforeUnloadHandler(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        if (this.currentSession && this.options.preserveWorkInProgress) {
          const currentWork = this.getCurrentWorkInProgress();
          if (currentWork) {
            this.saveWorkInProgress(currentWork);
          }
        }
      });

      // Track user activity
      const updateActivity = () => {
        localStorage.setItem("last_user_activity", Date.now().toString());
      };

      window.addEventListener("mousedown", updateActivity);
      window.addEventListener("keydown", updateActivity);
      window.addEventListener("scroll", updateActivity);
      window.addEventListener("touchstart", updateActivity);
    }
  }

  /**
   * Get current work in progress
   */
  private getCurrentWorkInProgress(): any {
    // This would collect current form data, unsaved changes, etc.
    // Implementation depends on the specific application structure
    const formData = this.collectFormData();
    const unsavedChanges = this.collectUnsavedChanges();

    if (!formData && !unsavedChanges) return null;

    return {
      formData,
      unsavedChanges,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Restore work in progress
   */
  private async restoreWorkInProgress(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.workInProgressKey);
      if (stored) {
        const workData = JSON.parse(stored);

        // Only restore if it's from the same session/staff
        if (
          workData.staffId === this.currentSession?.staffId &&
          workData.sessionId === this.currentSession?.sessionId
        ) {
          await this.applyWorkInProgress(workData.data);

          // Clean up after restoration
          localStorage.removeItem(this.workInProgressKey);
        }
      }
    } catch (error) {
      console.warn("Failed to restore work in progress:", error);
    }
  }

  /**
   * Collect form data from the page
   */
  private collectFormData(): any {
    const forms = document.querySelectorAll("form");
    const formData: any = {};

    forms.forEach((form, index) => {
      const data = new FormData(form);
      const formObject: any = {};

      for (const [key, value] of data.entries()) {
        formObject[key] = value;
      }

      if (Object.keys(formObject).length > 0) {
        formData[`form_${index}`] = formObject;
      }
    });

    return Object.keys(formData).length > 0 ? formData : null;
  }

  /**
   * Collect unsaved changes
   */
  private collectUnsavedChanges(): any {
    // This would collect data from various state management systems
    // For now, we'll check sessionStorage for temporary data
    const unsavedData: any = {};

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("unsaved_")) {
        try {
          unsavedData[key] = JSON.parse(sessionStorage.getItem(key) || "");
        } catch {
          unsavedData[key] = sessionStorage.getItem(key);
        }
      }
    }

    return Object.keys(unsavedData).length > 0 ? unsavedData : null;
  }

  /**
   * Apply work in progress
   */
  private async applyWorkInProgress(workData: any): Promise<void> {
    if (!workData) return;

    // Restore form data
    if (workData.formData) {
      // This would populate forms with saved data
      console.log("Restoring form data:", workData.formData);
    }

    // Restore unsaved changes
    if (workData.unsavedChanges) {
      Object.entries(workData.unsavedChanges).forEach(([key, value]) => {
        sessionStorage.setItem(
          key,
          typeof value === "string" ? value : JSON.stringify(value)
        );
      });
    }
  }

  /**
   * Get work in progress from session
   */
  private async getWorkInProgressFromSession(
    session: SessionState | null
  ): Promise<any> {
    if (!session) return null;
    return session.workInProgress || null;
  }

  /**
   * Notify server about session extension
   */
  private async notifyServerSessionExtension(): Promise<void> {
    if (!this.currentSession) return;

    await fetch("/api/staff/sessions/extend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: this.currentSession.sessionId,
        expiresAt: this.currentSession.expiresAt,
      }),
    });
  }

  /**
   * Notify server about session end
   */
  private async notifyServerSessionEnd(): Promise<void> {
    if (!this.currentSession) return;

    await fetch("/api/staff/sessions/end", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: this.currentSession.sessionId,
      }),
    });
  }

  /**
   * Redirect to login
   */
  private redirectToLogin(): void {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  /**
   * Notify session listeners
   */
  private notifySessionListeners(): void {
    this.sessionListeners.forEach((listener) => listener(this.currentSession));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    this.sessionListeners.clear();
    this.conflictListeners.clear();
  }
}

/**
 * React hook for session management
 */
export function useSessionManager() {
  const [session, setSession] = React.useState<SessionState | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = React.useState(0);

  React.useEffect(() => {
    const manager = SessionManager.getInstance();

    // Set initial session
    setSession(manager.getCurrentSession());
    setTimeUntilExpiry(manager.getTimeUntilExpiry());

    // Subscribe to session changes
    const unsubscribe = manager.addSessionListener(setSession);

    // Update expiry time every minute
    const interval = setInterval(() => {
      setTimeUntilExpiry(manager.getTimeUntilExpiry());
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const manager = SessionManager.getInstance();

  return {
    session,
    timeUntilExpiry,
    isValid: manager.isSessionValid(),
    extendSession: manager.extendSession.bind(manager),
    saveWorkInProgress: manager.saveWorkInProgress.bind(manager),
    clearSession: manager.clearSession.bind(manager),
  };
}

// React import for the hook
import React from "react";
