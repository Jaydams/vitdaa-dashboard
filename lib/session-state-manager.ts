"use client";

import { SessionManager } from "@/lib/session-manager";

export interface WorkInProgressData {
  id: string;
  component: string;
  data: any;
  timestamp: string;
  priority: "low" | "normal" | "high" | "critical";
  autoSave: boolean;
}

export interface SessionStateSnapshot {
  sessionId: string;
  staffId: string;
  timestamp: string;
  workInProgress: WorkInProgressData[];
  formStates: Record<string, any>;
  navigationState: {
    currentPath: string;
    previousPath?: string;
    tabStates?: Record<string, any>;
  };
  uiState: {
    openModals: string[];
    expandedSections: string[];
    selectedItems: Record<string, any>;
    filters: Record<string, any>;
  };
  temporaryData: Record<string, any>;
}

/**
 * Enhanced session state management with automatic preservation
 */
export class SessionStateManager {
  private static instance: SessionStateManager;
  private sessionManager: SessionManager;
  private workInProgressMap: Map<string, WorkInProgressData> = new Map();
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private stateListeners: Set<(snapshot: SessionStateSnapshot) => void> =
    new Set();
  private storageKey = "vitdaa_session_state";
  private workStorageKey = "vitdaa_work_in_progress";

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.startAutoSave();
    this.setupEventListeners();
    this.loadPersistedState();
  }

  static getInstance(): SessionStateManager {
    if (!SessionStateManager.instance) {
      SessionStateManager.instance = new SessionStateManager();
    }
    return SessionStateManager.instance;
  }

  /**
   * Save work in progress with metadata
   */
  saveWorkInProgress(
    component: string,
    data: any,
    options: {
      priority?: "low" | "normal" | "high" | "critical";
      autoSave?: boolean;
      id?: string;
    } = {}
  ): string {
    const id = options.id || this.generateWorkId(component);
    const workData: WorkInProgressData = {
      id,
      component,
      data,
      timestamp: new Date().toISOString(),
      priority: options.priority || "normal",
      autoSave: options.autoSave !== false,
    };

    this.workInProgressMap.set(id, workData);
    this.persistWorkInProgress();
    this.notifyStateListeners();

    return id;
  }

  /**
   * Get work in progress by component or ID
   */
  getWorkInProgress(componentOrId: string): WorkInProgressData[] {
    const allWork = Array.from(this.workInProgressMap.values());

    // If it looks like an ID, find by ID
    if (componentOrId.includes("_")) {
      const work = this.workInProgressMap.get(componentOrId);
      return work ? [work] : [];
    }

    // Otherwise, find by component
    return allWork.filter((work) => work.component === componentOrId);
  }

  /**
   * Remove work in progress
   */
  removeWorkInProgress(id: string): boolean {
    const removed = this.workInProgressMap.delete(id);
    if (removed) {
      this.persistWorkInProgress();
      this.notifyStateListeners();
    }
    return removed;
  }

  /**
   * Clear all work for a component
   */
  clearComponentWork(component: string): void {
    const workIds = Array.from(this.workInProgressMap.keys()).filter(
      (id) => this.workInProgressMap.get(id)?.component === component
    );

    workIds.forEach((id) => this.workInProgressMap.delete(id));
    this.persistWorkInProgress();
    this.notifyStateListeners();
  }

  /**
   * Create a complete session state snapshot
   */
  createSnapshot(): SessionStateSnapshot | null {
    const session = this.sessionManager.getCurrentSession();
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      staffId: session.staffId,
      timestamp: new Date().toISOString(),
      workInProgress: Array.from(this.workInProgressMap.values()),
      formStates: this.collectFormStates(),
      navigationState: this.collectNavigationState(),
      uiState: this.collectUIState(),
      temporaryData: this.collectTemporaryData(),
    };
  }

  /**
   * Restore session state from snapshot
   */
  async restoreSnapshot(snapshot: SessionStateSnapshot): Promise<void> {
    const session = this.sessionManager.getCurrentSession();
    if (!session || session.staffId !== snapshot.staffId) {
      throw new Error("Cannot restore snapshot: session mismatch");
    }

    // Restore work in progress
    this.workInProgressMap.clear();
    snapshot.workInProgress.forEach((work) => {
      this.workInProgressMap.set(work.id, work);
    });

    // Restore form states
    await this.restoreFormStates(snapshot.formStates);

    // Restore navigation state
    await this.restoreNavigationState(snapshot.navigationState);

    // Restore UI state
    await this.restoreUIState(snapshot.uiState);

    // Restore temporary data
    await this.restoreTemporaryData(snapshot.temporaryData);

    this.persistWorkInProgress();
    this.notifyStateListeners();
  }

  /**
   * Handle device switch by preserving and transferring state
   */
  async handleDeviceSwitch(
    newDeviceId: string
  ): Promise<SessionStateSnapshot | null> {
    const snapshot = this.createSnapshot();
    if (!snapshot) return null;

    // Save snapshot for the new device
    const deviceKey = `${this.storageKey}_${newDeviceId}`;
    try {
      localStorage.setItem(deviceKey, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("Failed to save state for device switch:", error);
    }

    return snapshot;
  }

  /**
   * Restore state after device switch
   */
  async restoreFromDeviceSwitch(previousDeviceId: string): Promise<boolean> {
    const deviceKey = `${this.storageKey}_${previousDeviceId}`;

    try {
      const stored = localStorage.getItem(deviceKey);
      if (!stored) return false;

      const snapshot: SessionStateSnapshot = JSON.parse(stored);
      await this.restoreSnapshot(snapshot);

      // Clean up the device-specific storage
      localStorage.removeItem(deviceKey);

      return true;
    } catch (error) {
      console.warn("Failed to restore state from device switch:", error);
      return false;
    }
  }

  /**
   * Auto-save critical work periodically
   */
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      const criticalWork = Array.from(this.workInProgressMap.values()).filter(
        (work) => work.priority === "critical" && work.autoSave
      );

      if (criticalWork.length > 0) {
        this.persistWorkInProgress();
      }
    }, 30000); // Auto-save every 30 seconds
  }

  /**
   * Setup event listeners for automatic state capture
   */
  private setupEventListeners(): void {
    if (typeof window === "undefined") return;

    // Save state before page unload
    window.addEventListener("beforeunload", () => {
      const snapshot = this.createSnapshot();
      if (snapshot) {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
        } catch (error) {
          console.warn("Failed to save session state on unload:", error);
        }
      }
    });

    // Save state on visibility change (tab switch, minimize)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.persistWorkInProgress();
      }
    });

    // Auto-save on form changes
    document.addEventListener("input", (event) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        this.captureFormState(target);
      }
    });
  }

  /**
   * Capture form state automatically
   */
  private captureFormState(element: HTMLElement): void {
    const form = element.closest("form");
    if (!form) return;

    const formId =
      form.id || form.getAttribute("data-form-id") || "unnamed-form";
    const formData = new FormData(form);
    const formObject: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      formObject[key] = value;
    }

    this.saveWorkInProgress(`form_${formId}`, formObject, {
      priority: "normal",
      autoSave: true,
    });
  }

  /**
   * Collect current form states
   */
  private collectFormStates(): Record<string, any> {
    const forms = document.querySelectorAll("form");
    const formStates: Record<string, any> = {};

    forms.forEach((form, index) => {
      const formId = form.id || `form_${index}`;
      const formData = new FormData(form);
      const formObject: Record<string, any> = {};

      for (const [key, value] of formData.entries()) {
        formObject[key] = value;
      }

      if (Object.keys(formObject).length > 0) {
        formStates[formId] = formObject;
      }
    });

    return formStates;
  }

  /**
   * Collect navigation state
   */
  private collectNavigationState(): SessionStateSnapshot["navigationState"] {
    return {
      currentPath: window.location.pathname,
      previousPath: document.referrer
        ? new URL(document.referrer).pathname
        : undefined,
    };
  }

  /**
   * Collect UI state
   */
  private collectUIState(): SessionStateSnapshot["uiState"] {
    return {
      openModals: this.getOpenModals(),
      expandedSections: this.getExpandedSections(),
      selectedItems: this.getSelectedItems(),
      filters: this.getActiveFilters(),
    };
  }

  /**
   * Collect temporary data from sessionStorage
   */
  private collectTemporaryData(): Record<string, any> {
    const tempData: Record<string, any> = {};

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("temp_")) {
        try {
          tempData[key] = JSON.parse(sessionStorage.getItem(key) || "");
        } catch {
          tempData[key] = sessionStorage.getItem(key);
        }
      }
    }

    return tempData;
  }

  /**
   * Restore form states
   */
  private async restoreFormStates(
    formStates: Record<string, any>
  ): Promise<void> {
    Object.entries(formStates).forEach(([formId, formData]) => {
      const form =
        document.getElementById(formId) ||
        document.querySelector(`form[data-form-id="${formId}"]`);

      if (form) {
        Object.entries(formData).forEach(([fieldName, value]) => {
          const field = form.querySelector(
            `[name="${fieldName}"]`
          ) as HTMLInputElement;
          if (field) {
            field.value = String(value);
            // Trigger change event for React components
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
      }
    });
  }

  /**
   * Restore navigation state
   */
  private async restoreNavigationState(
    navigationState: SessionStateSnapshot["navigationState"]
  ): Promise<void> {
    // Navigation restoration would depend on your routing system
    // This is a placeholder for the implementation
    console.log("Restoring navigation state:", navigationState);
  }

  /**
   * Restore UI state
   */
  private async restoreUIState(
    uiState: SessionStateSnapshot["uiState"]
  ): Promise<void> {
    // Restore expanded sections
    uiState.expandedSections.forEach((sectionId) => {
      const section = document.querySelector(
        `[data-section-id="${sectionId}"]`
      );
      if (section) {
        section.setAttribute("data-expanded", "true");
      }
    });

    // Restore selected items
    Object.entries(uiState.selectedItems).forEach(([key, value]) => {
      sessionStorage.setItem(`selected_${key}`, JSON.stringify(value));
    });

    // Restore filters
    Object.entries(uiState.filters).forEach(([key, value]) => {
      sessionStorage.setItem(`filter_${key}`, JSON.stringify(value));
    });
  }

  /**
   * Restore temporary data
   */
  private async restoreTemporaryData(
    temporaryData: Record<string, any>
  ): Promise<void> {
    Object.entries(temporaryData).forEach(([key, value]) => {
      sessionStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value)
      );
    });
  }

  /**
   * Get currently open modals
   */
  private getOpenModals(): string[] {
    const modals = document.querySelectorAll(
      '[data-modal-id][data-state="open"]'
    );
    return Array.from(modals).map(
      (modal) => modal.getAttribute("data-modal-id") || ""
    );
  }

  /**
   * Get expanded sections
   */
  private getExpandedSections(): string[] {
    const sections = document.querySelectorAll(
      '[data-section-id][data-expanded="true"]'
    );
    return Array.from(sections).map(
      (section) => section.getAttribute("data-section-id") || ""
    );
  }

  /**
   * Get selected items
   */
  private getSelectedItems(): Record<string, any> {
    const selectedItems: Record<string, any> = {};

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("selected_")) {
        try {
          selectedItems[key] = JSON.parse(sessionStorage.getItem(key) || "");
        } catch {
          selectedItems[key] = sessionStorage.getItem(key);
        }
      }
    }

    return selectedItems;
  }

  /**
   * Get active filters
   */
  private getActiveFilters(): Record<string, any> {
    const filters: Record<string, any> = {};

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("filter_")) {
        try {
          filters[key] = JSON.parse(sessionStorage.getItem(key) || "");
        } catch {
          filters[key] = sessionStorage.getItem(key);
        }
      }
    }

    return filters;
  }

  /**
   * Generate unique work ID
   */
  private generateWorkId(component: string): string {
    return `${component}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Persist work in progress to storage
   */
  private persistWorkInProgress(): void {
    try {
      const workArray = Array.from(this.workInProgressMap.values());
      localStorage.setItem(this.workStorageKey, JSON.stringify(workArray));
    } catch (error) {
      console.warn("Failed to persist work in progress:", error);
    }
  }

  /**
   * Load persisted work in progress
   */
  private loadPersistedState(): void {
    try {
      // Load work in progress
      const workStored = localStorage.getItem(this.workStorageKey);
      if (workStored) {
        const workArray: WorkInProgressData[] = JSON.parse(workStored);
        this.workInProgressMap.clear();
        workArray.forEach((work) => {
          this.workInProgressMap.set(work.id, work);
        });
      }

      // Load session state snapshot
      const stateStored = localStorage.getItem(this.storageKey);
      if (stateStored) {
        const snapshot: SessionStateSnapshot = JSON.parse(stateStored);
        // Auto-restore if session matches
        const currentSession = this.sessionManager.getCurrentSession();
        if (currentSession && currentSession.staffId === snapshot.staffId) {
          this.restoreSnapshot(snapshot);
        }
      }
    } catch (error) {
      console.warn("Failed to load persisted session state:", error);
    }
  }

  /**
   * Add state change listener
   */
  addStateListener(
    listener: (snapshot: SessionStateSnapshot) => void
  ): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Notify state listeners
   */
  private notifyStateListeners(): void {
    const snapshot = this.createSnapshot();
    if (snapshot) {
      this.stateListeners.forEach((listener) => listener(snapshot));
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.stateListeners.clear();
    this.workInProgressMap.clear();
  }
}

/**
 * React hook for session state management
 */
export function useSessionState() {
  const [workInProgress, setWorkInProgress] = React.useState<
    WorkInProgressData[]
  >([]);
  const [snapshot, setSnapshot] = React.useState<SessionStateSnapshot | null>(
    null
  );

  React.useEffect(() => {
    const manager = SessionStateManager.getInstance();

    // Set initial state
    setSnapshot(manager.createSnapshot());
    setWorkInProgress(Array.from(manager["workInProgressMap"].values()));

    // Subscribe to changes
    const unsubscribe = manager.addStateListener((newSnapshot) => {
      setSnapshot(newSnapshot);
      setWorkInProgress(newSnapshot.workInProgress);
    });

    return unsubscribe;
  }, []);

  const manager = SessionStateManager.getInstance();

  return {
    workInProgress,
    snapshot,
    saveWork: manager.saveWorkInProgress.bind(manager),
    getWork: manager.getWorkInProgress.bind(manager),
    removeWork: manager.removeWorkInProgress.bind(manager),
    clearComponentWork: manager.clearComponentWork.bind(manager),
    createSnapshot: manager.createSnapshot.bind(manager),
    restoreSnapshot: manager.restoreSnapshot.bind(manager),
  };
}

// React import for the hook
import React from "react";
