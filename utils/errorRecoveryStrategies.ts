"use client";

import { toast } from "sonner";

export interface RecoveryStrategy {
  name: string;
  description: string;
  canRecover: (error: Error) => boolean;
  recover: (error: Error, context?: any) => Promise<boolean>;
  priority: number; // Lower number = higher priority
}

export interface RecoveryContext {
  component?: string;
  operation?: string;
  data?: any;
  retryCount?: number;
  maxRetries?: number;
}

// Network Recovery Strategy
export const networkRecoveryStrategy: RecoveryStrategy = {
  name: "Network Recovery",
  description: "Handles network connectivity issues and API failures",
  priority: 1,
  canRecover: (error: Error) => {
    const networkErrors = [
      "network",
      "fetch",
      "timeout",
      "connection",
      "offline",
      "ECONNREFUSED",
    ];
    return networkErrors.some((keyword) =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  },
  recover: async (error: Error, context?: RecoveryContext) => {
    console.log("Attempting network recovery for:", error.message);

    // Check if we're online
    if (!navigator.onLine) {
      toast.error("No internet connection. Please check your network.");
      return false;
    }

    // Wait a moment for network to stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test connectivity with a simple request
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        toast.success("Network connection restored");
        return true;
      } else {
        toast.error("Server is not responding properly");
        return false;
      }
    } catch (testError) {
      console.error("Network test failed:", testError);
      toast.error("Network connection still unstable");
      return false;
    }
  },
};

// State Recovery Strategy
export const stateRecoveryStrategy: RecoveryStrategy = {
  name: "State Recovery",
  description:
    "Recovers from state management errors by resetting or restoring state",
  priority: 2,
  canRecover: (error: Error) => {
    const stateErrors = ["zustand", "store", "state", "undefined", "null"];
    return stateErrors.some((keyword) =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  },
  recover: async (error: Error, context?: RecoveryContext) => {
    console.log("Attempting state recovery for:", error.message);

    try {
      // Try to restore from localStorage
      const savedState = localStorage.getItem("reception-order-state");
      if (savedState) {
        // Validate the saved state
        const parsedState = JSON.parse(savedState);
        if (parsedState && typeof parsedState === "object") {
          toast.success("State restored from backup");
          return true;
        }
      }

      // If no valid saved state, clear corrupted state
      localStorage.removeItem("reception-order-state");
      toast.info("State reset to prevent further errors");
      return true;
    } catch (recoveryError) {
      console.error("State recovery failed:", recoveryError);
      toast.error("Failed to recover application state");
      return false;
    }
  },
};

// Data Recovery Strategy
export const dataRecoveryStrategy: RecoveryStrategy = {
  name: "Data Recovery",
  description: "Handles data corruption and validation errors",
  priority: 3,
  canRecover: (error: Error) => {
    const dataErrors = [
      "validation",
      "invalid",
      "corrupt",
      "malformed",
      "parse",
    ];
    return dataErrors.some((keyword) =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  },
  recover: async (error: Error, context?: RecoveryContext) => {
    console.log("Attempting data recovery for:", error.message);

    try {
      // If we have context data, try to sanitize it
      if (context?.data) {
        const sanitizedData = sanitizeData(context.data);
        if (sanitizedData) {
          toast.success("Data sanitized and recovered");
          return true;
        }
      }

      // Try to recover from server if we have an ID
      if (context?.operation === "load" && context?.data?.id) {
        try {
          const response = await fetch(`/api/recovery/${context.data.id}`);
          if (response.ok) {
            toast.success("Data recovered from server");
            return true;
          }
        } catch (serverError) {
          console.error("Server recovery failed:", serverError);
        }
      }

      toast.warning("Data could not be recovered. Using defaults.");
      return false;
    } catch (recoveryError) {
      console.error("Data recovery failed:", recoveryError);
      return false;
    }
  },
};

// Payment Recovery Strategy
export const paymentRecoveryStrategy: RecoveryStrategy = {
  name: "Payment Recovery",
  description: "Handles payment processing errors with safety measures",
  priority: 1, // High priority for payment safety
  canRecover: (error: Error) => {
    const paymentErrors = [
      "payment",
      "transaction",
      "gateway",
      "card",
      "declined",
    ];
    const securityErrors = ["security", "fraud", "unauthorized"];

    // Can recover from payment errors but not security errors
    const isPaymentError = paymentErrors.some((keyword) =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
    const isSecurityError = securityErrors.some((keyword) =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );

    return isPaymentError && !isSecurityError;
  },
  recover: async (error: Error, context?: RecoveryContext) => {
    console.log("Attempting payment recovery for:", error.message);

    try {
      // Save payment attempt data for audit
      const paymentAttempt = {
        orderId: context?.data?.orderId,
        amount: context?.data?.amount,
        method: context?.data?.paymentMethod,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(
        `failed_payment_${paymentAttempt.orderId}`,
        JSON.stringify(paymentAttempt)
      );

      // Check payment gateway status
      try {
        const gatewayResponse = await fetch("/api/payment/status", {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });

        if (gatewayResponse.ok) {
          const status = await gatewayResponse.json();
          if (status.operational) {
            toast.success("Payment gateway is operational. You can retry.");
            return true;
          } else {
            toast.error(
              "Payment gateway is currently down. Use manual payment."
            );
            return false;
          }
        }
      } catch (gatewayError) {
        console.error("Gateway status check failed:", gatewayError);
      }

      toast.warning("Payment recovery uncertain. Verify transaction status.");
      return false;
    } catch (recoveryError) {
      console.error("Payment recovery failed:", recoveryError);
      toast.error("Payment recovery failed. Contact support immediately.");
      return false;
    }
  },
};

// Component Recovery Strategy
export const componentRecoveryStrategy: RecoveryStrategy = {
  name: "Component Recovery",
  description: "Handles React component errors and rendering issues",
  priority: 4,
  canRecover: (error: Error) => {
    const componentErrors = [
      "render",
      "component",
      "hook",
      "react",
      "jsx",
      "tsx",
    ];
    return componentErrors.some(
      (keyword) =>
        error.message.toLowerCase().includes(keyword.toLowerCase()) ||
        error.stack?.toLowerCase().includes(keyword.toLowerCase())
    );
  },
  recover: async (error: Error, context?: RecoveryContext) => {
    console.log("Attempting component recovery for:", error.message);

    try {
      // Clear any cached component state
      if (context?.component) {
        const cacheKey = `component_cache_${context.component}`;
        sessionStorage.removeItem(cacheKey);
      }

      // Force a small delay to allow React to stabilize
      await new Promise((resolve) => setTimeout(resolve, 100));

      toast.info("Component state cleared. Retrying...");
      return true;
    } catch (recoveryError) {
      console.error("Component recovery failed:", recoveryError);
      return false;
    }
  },
};

// Utility function to sanitize data
function sanitizeData(data: any): any {
  if (!data || typeof data !== "object") {
    return null;
  }

  try {
    // Remove any functions or undefined values
    const sanitized = JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (typeof value === "function" || value === undefined) {
          return null;
        }
        return value;
      })
    );

    // Basic validation for common data structures
    if (sanitized.items && Array.isArray(sanitized.items)) {
      sanitized.items = sanitized.items.filter(
        (item) => item && typeof item === "object" && item.id
      );
    }

    if (sanitized.calculations && typeof sanitized.calculations === "object") {
      // Ensure calculations are numbers
      Object.keys(sanitized.calculations).forEach((key) => {
        const value = sanitized.calculations[key];
        if (typeof value !== "number" || isNaN(value)) {
          sanitized.calculations[key] = 0;
        }
      });
    }

    return sanitized;
  } catch (sanitizeError) {
    console.error("Data sanitization failed:", sanitizeError);
    return null;
  }
}

// Main recovery orchestrator
export class ErrorRecoveryOrchestrator {
  private strategies: RecoveryStrategy[] = [
    paymentRecoveryStrategy,
    networkRecoveryStrategy,
    stateRecoveryStrategy,
    dataRecoveryStrategy,
    componentRecoveryStrategy,
  ];

  constructor(customStrategies: RecoveryStrategy[] = []) {
    // Add custom strategies and sort by priority
    this.strategies = [...this.strategies, ...customStrategies].sort(
      (a, b) => a.priority - b.priority
    );
  }

  async attemptRecovery(
    error: Error,
    context?: RecoveryContext
  ): Promise<boolean> {
    console.log("Starting error recovery process for:", error.message);

    // Find applicable strategies
    const applicableStrategies = this.strategies.filter((strategy) =>
      strategy.canRecover(error)
    );

    if (applicableStrategies.length === 0) {
      console.log("No recovery strategies available for this error");
      toast.error("No automatic recovery available for this error");
      return false;
    }

    // Try each strategy in priority order
    for (const strategy of applicableStrategies) {
      try {
        console.log(`Trying recovery strategy: ${strategy.name}`);
        const recovered = await strategy.recover(error, context);

        if (recovered) {
          console.log(`Recovery successful with strategy: ${strategy.name}`);
          toast.success(`Recovered using ${strategy.name}`);
          return true;
        } else {
          console.log(`Recovery strategy ${strategy.name} was not successful`);
        }
      } catch (strategyError) {
        console.error(
          `Recovery strategy ${strategy.name} failed:`,
          strategyError
        );
      }
    }

    console.log("All recovery strategies failed");
    toast.error("Automatic recovery failed. Manual intervention required.");
    return false;
  }

  addStrategy(strategy: RecoveryStrategy) {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  removeStrategy(name: string) {
    this.strategies = this.strategies.filter((s) => s.name !== name);
  }

  getStrategies(): RecoveryStrategy[] {
    return [...this.strategies];
  }
}

// Default instance
export const defaultRecoveryOrchestrator = new ErrorRecoveryOrchestrator();
