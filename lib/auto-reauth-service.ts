"use client";

import { SessionManager, SessionState } from "@/lib/session-manager";
import { SessionStateManager } from "@/lib/session-state-manager";
import { ErrorRecoveryService } from "@/lib/error-recovery-service";

export interface ReauthAttempt {
  id: string;
  timestamp: string;
  method: "refresh_token" | "stored_credentials" | "biometric" | "sso";
  success: boolean;
  error?: string;
  duration: number;
}

export interface ReauthConfig {
  enableAutoReauth: boolean;
  maxAttempts: number;
  attemptInterval: number; // milliseconds
  methods: ("refresh_token" | "stored_credentials" | "biometric" | "sso")[];
  preserveWorkOnFailure: boolean;
  notifyUser: boolean;
}

const DEFAULT_REAUTH_CONFIG: ReauthConfig = {
  enableAutoReauth: true,
  maxAttempts: 3,
  attemptInterval: 5000,
  methods: ["refresh_token", "stored_credentials"],
  preserveWorkOnFailure: true,
  notifyUser: true,
};

/**
 * Automatic re-authentication service for seamless session management
 */
export class AutoReauthService {
  private static instance: AutoReauthService;
  private sessionManager: SessionManager;
  private stateManager: SessionStateManager;
  private recoveryService: ErrorRecoveryService;
  private config: ReauthConfig;
  private reauthAttempts: ReauthAttempt[] = [];
  private isReauthenticating = false;
  private reauthListeners: Set<(attempt: ReauthAttempt) => void> = new Set();
  private statusListeners: Set<
    (status: {
      isReauthenticating: boolean;
      lastAttempt?: ReauthAttempt;
    }) => void
  > = new Set();

  private constructor(config: Partial<ReauthConfig> = {}) {
    this.config = { ...DEFAULT_REAUTH_CONFIG, ...config };
    this.sessionManager = SessionManager.getInstance();
    this.stateManager = SessionStateManager.getInstance();
    this.recoveryService = ErrorRecoveryService.getInstance();

    this.setupSessionMonitoring();
  }

  static getInstance(config?: Partial<ReauthConfig>): AutoReauthService {
    if (!AutoReauthService.instance) {
      AutoReauthService.instance = new AutoReauthService(config);
    }
    return AutoReauthService.instance;
  }

  /**
   * Attempt automatic re-authentication
   */
  async attemptReauth(session: SessionState): Promise<boolean> {
    if (this.isReauthenticating || !this.config.enableAutoReauth) {
      return false;
    }

    this.isReauthenticating = true;
    this.notifyStatusListeners();

    let success = false;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      for (const method of this.config.methods) {
        const attemptResult = await this.executeReauthMethod(
          method,
          session,
          attempt
        );

        this.reauthAttempts.push(attemptResult);
        this.notifyReauthListeners(attemptResult);

        if (attemptResult.success) {
          success = true;
          break;
        }

        lastError = attemptResult.error;

        // Wait before next attempt
        if (attempt < this.config.maxAttempts) {
          await this.delay(this.config.attemptInterval);
        }
      }

      if (success) break;
    }

    this.isReauthenticating = false;
    this.notifyStatusListeners();

    // Handle failure
    if (!success) {
      await this.handleReauthFailure(session, lastError);
    }

    return success;
  }

  /**
   * Execute specific re-authentication method
   */
  private async executeReauthMethod(
    method: ReauthConfig["methods"][0],
    session: SessionState,
    attempt: number
  ): Promise<ReauthAttempt> {
    const attemptId = `reauth_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const startTime = Date.now();

    const attemptResult: ReauthAttempt = {
      id: attemptId,
      timestamp: new Date().toISOString(),
      method,
      success: false,
      duration: 0,
    };

    try {
      switch (method) {
        case "refresh_token":
          await this.refreshTokenAuth(session);
          break;
        case "stored_credentials":
          await this.storedCredentialsAuth(session);
          break;
        case "biometric":
          await this.biometricAuth(session);
          break;
        case "sso":
          await this.ssoAuth(session);
          break;
        default:
          throw new Error(`Unknown auth method: ${method}`);
      }

      attemptResult.success = true;
    } catch (error) {
      attemptResult.error =
        error instanceof Error ? error.message : String(error);
    }

    attemptResult.duration = Date.now() - startTime;
    return attemptResult;
  }

  /**
   * Refresh token authentication
   */
  private async refreshTokenAuth(session: SessionState): Promise<void> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("/api/staff/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
        sessionId: session.sessionId,
        staffId: session.staffId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Refresh token authentication failed");
    }

    const data = await response.json();

    // Update session with new tokens
    await this.updateSessionTokens(data);
  }

  /**
   * Stored credentials authentication
   */
  private async storedCredentialsAuth(session: SessionState): Promise<void> {
    const credentials = this.getStoredCredentials();
    if (!credentials) {
      throw new Error("No stored credentials available");
    }

    const response = await fetch("/api/staff/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...credentials,
        deviceId: session.deviceId,
        autoReauth: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Stored credentials authentication failed"
      );
    }

    const data = await response.json();

    // Initialize new session
    await this.sessionManager.initializeSession({
      staffId: data.staff.id,
      sessionId: data.sessionId,
      role: data.staff.role,
      businessId: data.staff.businessId,
      expiresAt: data.expiresAt,
    });
  }

  /**
   * Biometric authentication (placeholder for future implementation)
   */
  private async biometricAuth(session: SessionState): Promise<void> {
    if (!this.isBiometricAvailable()) {
      throw new Error("Biometric authentication not available");
    }

    // Placeholder for biometric authentication
    // This would integrate with WebAuthn API
    throw new Error("Biometric authentication not implemented");
  }

  /**
   * SSO authentication (placeholder for future implementation)
   */
  private async ssoAuth(session: SessionState): Promise<void> {
    // Placeholder for SSO authentication
    // This would integrate with SAML/OAuth providers
    throw new Error("SSO authentication not implemented");
  }

  /**
   * Handle re-authentication failure
   */
  private async handleReauthFailure(
    session: SessionState,
    error?: string
  ): Promise<void> {
    if (this.config.preserveWorkOnFailure) {
      // Save current work before session ends
      const snapshot = this.stateManager.createSnapshot();
      if (snapshot) {
        try {
          localStorage.setItem(
            "reauth_failure_snapshot",
            JSON.stringify(snapshot)
          );
        } catch (storageError) {
          console.warn("Failed to save work on reauth failure:", storageError);
        }
      }
    }

    if (this.config.notifyUser) {
      // Use recovery service to handle the failure
      await this.recoveryService.recoverFromError(
        new Error(`Re-authentication failed: ${error || "Unknown error"}`),
        {
          component: "AutoReauthService",
          action: "reauth_failure",
          metadata: {
            sessionId: session.sessionId,
            staffId: session.staffId,
            attempts: this.reauthAttempts.length,
          },
        }
      );
    }

    // Clear session and redirect to login
    await this.sessionManager.clearSession();
    this.redirectToLogin();
  }

  /**
   * Setup session monitoring for automatic re-auth triggers
   */
  private setupSessionMonitoring(): void {
    this.sessionManager.addSessionListener((session) => {
      if (!session) return;

      // Check if session is about to expire
      const timeUntilExpiry =
        new Date(session.expiresAt).getTime() - Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeUntilExpiry <= fiveMinutes && timeUntilExpiry > 0) {
        // Attempt re-auth before expiration
        this.attemptReauth(session);
      }
    });
  }

  /**
   * Get stored refresh token
   */
  private getStoredRefreshToken(): string | null {
    try {
      return localStorage.getItem("refresh_token");
    } catch {
      return null;
    }
  }

  /**
   * Get stored credentials (encrypted)
   */
  private getStoredCredentials(): { email: string; password: string } | null {
    try {
      const stored = localStorage.getItem("stored_credentials");
      if (!stored) return null;

      // In a real implementation, this would be encrypted
      const credentials = JSON.parse(stored);
      return credentials;
    } catch {
      return null;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  private isBiometricAvailable(): boolean {
    return !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create
    );
  }

  /**
   * Update session with new tokens
   */
  private async updateSessionTokens(tokenData: any): Promise<void> {
    const currentSession = this.sessionManager.getCurrentSession();
    if (!currentSession) {
      throw new Error("No current session to update");
    }

    // Update session expiry
    currentSession.expiresAt = tokenData.expiresAt;

    // Store new tokens
    if (tokenData.accessToken) {
      localStorage.setItem("access_token", tokenData.accessToken);
    }
    if (tokenData.refreshToken) {
      localStorage.setItem("refresh_token", tokenData.refreshToken);
    }

    // Notify session manager of the update
    this.sessionManager["currentSession"] = currentSession;
    this.sessionManager["persistSession"]();
  }

  /**
   * Redirect to login page
   */
  private redirectToLogin(): void {
    if (typeof window !== "undefined") {
      // Save current URL for redirect after login
      sessionStorage.setItem("redirect_after_login", window.location.pathname);
      window.location.href = "/login?reason=session_expired";
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add re-auth attempt listener
   */
  addReauthListener(listener: (attempt: ReauthAttempt) => void): () => void {
    this.reauthListeners.add(listener);
    return () => this.reauthListeners.delete(listener);
  }

  /**
   * Add status listener
   */
  addStatusListener(
    listener: (status: {
      isReauthenticating: boolean;
      lastAttempt?: ReauthAttempt;
    }) => void
  ): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Get re-authentication history
   */
  getReauthHistory(): ReauthAttempt[] {
    return [...this.reauthAttempts];
  }

  /**
   * Get current status
   */
  getStatus(): { isReauthenticating: boolean; lastAttempt?: ReauthAttempt } {
    return {
      isReauthenticating: this.isReauthenticating,
      lastAttempt: this.reauthAttempts[this.reauthAttempts.length - 1],
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ReauthConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Notify re-auth listeners
   */
  private notifyReauthListeners(attempt: ReauthAttempt): void {
    this.reauthListeners.forEach((listener) => listener(attempt));
  }

  /**
   * Notify status listeners
   */
  private notifyStatusListeners(): void {
    const status = this.getStatus();
    this.statusListeners.forEach((listener) => listener(status));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.reauthListeners.clear();
    this.statusListeners.clear();
    this.reauthAttempts = [];
  }
}

/**
 * React hook for auto re-authentication
 */
export function useAutoReauth() {
  const [isReauthenticating, setIsReauthenticating] = React.useState(false);
  const [lastAttempt, setLastAttempt] = React.useState<
    ReauthAttempt | undefined
  >();
  const [reauthHistory, setReauthHistory] = React.useState<ReauthAttempt[]>([]);

  React.useEffect(() => {
    const service = AutoReauthService.getInstance();

    // Set initial state
    const status = service.getStatus();
    setIsReauthenticating(status.isReauthenticating);
    setLastAttempt(status.lastAttempt);
    setReauthHistory(service.getReauthHistory());

    // Subscribe to changes
    const unsubscribeStatus = service.addStatusListener((status) => {
      setIsReauthenticating(status.isReauthenticating);
      setLastAttempt(status.lastAttempt);
    });

    const unsubscribeReauth = service.addReauthListener((attempt) => {
      setReauthHistory((prev) => [...prev, attempt]);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeReauth();
    };
  }, []);

  const service = AutoReauthService.getInstance();

  return {
    isReauthenticating,
    lastAttempt,
    reauthHistory,
    attemptReauth: service.attemptReauth.bind(service),
    updateConfig: service.updateConfig.bind(service),
  };
}

// React import for the hook
import React from "react";
