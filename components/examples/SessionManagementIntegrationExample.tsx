"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorRecoveryProvider } from "@/components/providers/ErrorRecoveryProvider";
import { SessionManagementDashboard } from "@/components/dashboard/SessionManagementDashboard";
import {
  SessionExpiryWarning,
  SessionExpiryNotification,
} from "@/components/ui/session-expiry-warning";
import {
  SessionConflictDialog,
  useSessionConflictDialog,
} from "@/components/ui/session-conflict-dialog";
import { useErrorRecoveryContext } from "@/components/providers/ErrorRecoveryProvider";
import { useSessionState } from "@/lib/session-state-manager";
import { useAutoReauth } from "@/lib/auto-reauth-service";
import { toast } from "sonner";

/**
 * Complete example of session management integration
 */
export function SessionManagementIntegrationExample() {
  return (
    <ErrorRecoveryProvider
      enableAutoRecovery={true}
      enableSessionManagement={true}
      enableOfflineSupport={true}
      onSessionConflict={(conflict) => {
        toast.warning(
          `Session conflict: ${conflict.conflictType}. Resolving automatically...`
        );
      }}
      onCriticalError={(error, context) => {
        console.error("Critical session error:", error, context);
        toast.error(
          "A critical session error occurred. Please contact support."
        );
      }}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header with session indicators */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Session Management Demo</h1>
            <div className="flex items-center gap-4">
              <SessionExpiryWarning showInHeader={true} />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Session expiry warning */}
            <SessionExpiryWarning warningThreshold={15} criticalThreshold={5} />

            {/* Session management dashboard */}
            <SessionManagementDashboard />

            {/* Example components using session features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WorkInProgressExample />
              <AutoReauthExample />
            </div>
          </div>
        </main>

        {/* Global session expiry notification */}
        <SessionExpiryNotification />
      </div>
    </ErrorRecoveryProvider>
  );
}

/**
 * Example component demonstrating work-in-progress preservation
 */
function WorkInProgressExample() {
  const { saveComponentWork, getComponentWork, clearComponentWork } =
    useErrorRecoveryContext();
  const [formData, setFormData] = React.useState({
    customerName: "",
    orderItems: [],
    notes: "",
  });

  // Auto-save work in progress
  React.useEffect(() => {
    if (formData.customerName || formData.notes) {
      saveComponentWork("OrderCreationForm", formData, {
        priority: "high",
        autoSave: true,
      });
    }
  }, [formData, saveComponentWork]);

  // Restore work on component mount
  React.useEffect(() => {
    const savedWork = getComponentWork("OrderCreationForm");
    if (savedWork.length > 0) {
      const latestWork = savedWork[savedWork.length - 1];
      setFormData(latestWork.data);
      toast.info("Restored unsaved work from previous session");
    }
  }, [getComponentWork]);

  const handleSubmit = async () => {
    try {
      // Simulate order creation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clear work after successful submission
      clearComponentWork("OrderCreationForm");
      setFormData({ customerName: "", orderItems: [], notes: "" });

      toast.success("Order created successfully!");
    } catch (error) {
      toast.error("Failed to create order");
    }
  };

  const simulateSessionExpiry = () => {
    // Simulate session expiry to test work preservation
    toast.warning("Simulating session expiry - your work will be preserved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work-in-Progress Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={formData.customerName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, customerName: e.target.value }))
            }
            className="w-full p-2 border rounded-md"
            placeholder="Enter customer name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Order Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Enter order notes"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit}>Create Order</Button>
          <Button onClick={simulateSessionExpiry} variant="outline">
            Simulate Session Expiry
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          Your work is automatically saved and will be restored if your session
          expires.
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example component demonstrating auto-reauth features
 */
function AutoReauthExample() {
  const { isReauthenticating } = useErrorRecoveryContext();
  const { reauthHistory, lastAttempt } = useAutoReauth();

  const simulateAuthFailure = () => {
    toast.error(
      "Simulating authentication failure - auto-reauth will attempt recovery"
    );
  };

  const getLastAttemptStatus = () => {
    if (!lastAttempt) return "No recent attempts";
    if (lastAttempt.success) return "✅ Last attempt successful";
    return "❌ Last attempt failed";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Reauth Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-600">Status</p>
            <p
              className={
                isReauthenticating ? "text-blue-600" : "text-green-600"
              }
            >
              {isReauthenticating ? "Re-authenticating..." : "Active"}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-600">Attempts</p>
            <p>{reauthHistory.length} total</p>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-1">Last Attempt</p>
          <p className="text-xs text-gray-600">{getLastAttemptStatus()}</p>
          {lastAttempt && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(lastAttempt.timestamp).toLocaleString()}(
              {lastAttempt.method.replace(/_/g, " ")})
            </p>
          )}
        </div>

        <Button onClick={simulateAuthFailure} variant="outline">
          Simulate Auth Failure
        </Button>

        <div className="text-xs text-gray-500">
          The system will automatically attempt to re-authenticate if your
          session expires.
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example of session conflict handling
 */
export function SessionConflictExample() {
  const { conflict, isOpen, showConflict, hideConflict } =
    useSessionConflictDialog();

  const simulateDeviceSwitch = () => {
    const mockConflict = {
      currentSession: {
        staffId: "staff_123",
        sessionId: "session_current",
        role: "reception",
        businessId: "business_456",
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date().toISOString(),
        deviceId: "device_mobile_789",
      },
      conflictingSession: {
        staffId: "staff_123",
        sessionId: "session_old",
        role: "reception",
        businessId: "business_456",
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        deviceId: "device_desktop_101",
      },
      conflictType: "device_switch" as const,
    };

    showConflict(mockConflict);
  };

  const handleConflictResolution = async (
    resolution: "takeover" | "merge" | "cancel"
  ) => {
    console.log("Resolving conflict with:", resolution);
    toast.success(`Conflict resolved: ${resolution}`);
    hideConflict();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Conflict Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Test session conflict resolution when logging in from multiple
          devices.
        </p>

        <Button onClick={simulateDeviceSwitch}>Simulate Device Switch</Button>

        <SessionConflictDialog
          conflict={conflict}
          isOpen={isOpen}
          onResolve={handleConflictResolution}
          onClose={hideConflict}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Example of state snapshot management
 */
export function StateSnapshotExample() {
  const { createStateSnapshot, restoreStateSnapshot } =
    useErrorRecoveryContext();
  const { snapshot } = useSessionState();

  const handleCreateSnapshot = () => {
    const newSnapshot = createStateSnapshot();
    if (newSnapshot) {
      toast.success("State snapshot created");
    } else {
      toast.error("Failed to create snapshot");
    }
  };

  const handleRestoreSnapshot = async () => {
    if (snapshot) {
      try {
        await restoreStateSnapshot(snapshot);
        toast.success("State snapshot restored");
      } catch (error) {
        toast.error("Failed to restore snapshot");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>State Snapshot Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Create and restore session state snapshots for seamless experience
          across devices.
        </p>

        <div className="flex gap-2">
          <Button onClick={handleCreateSnapshot}>Create Snapshot</Button>
          <Button
            onClick={handleRestoreSnapshot}
            variant="outline"
            disabled={!snapshot}
          >
            Restore Snapshot
          </Button>
        </div>

        {snapshot && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium mb-1">Current Snapshot</p>
            <p className="text-gray-600">
              Created: {new Date(snapshot.timestamp).toLocaleString()}
            </p>
            <p className="text-gray-600">
              Work items: {snapshot.workInProgress.length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
