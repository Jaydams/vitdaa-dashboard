"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorRecoveryProvider } from "@/components/providers/ErrorRecoveryProvider";
import { ErrorRecoveryDashboard } from "@/components/dashboard/ErrorRecoveryDashboard";
import { ReceptionDashboardErrorBoundary } from "@/components/error-boundary/ReceptionDashboardErrorBoundary";
import { KitchenDashboardErrorBoundary } from "@/components/error-boundary/KitchenDashboardErrorBoundary";
import { BarDashboardErrorBoundary } from "@/components/error-boundary/BarDashboardErrorBoundary";
import { AccountantDashboardErrorBoundary } from "@/components/error-boundary/AccountantDashboardErrorBoundary";
import { useComponentErrorRecovery } from "@/components/providers/ErrorRecoveryProvider";
import { toast } from "sonner";

/**
 * Example of how to integrate error recovery into the main dashboard layout
 */
export function DashboardLayoutWithErrorRecovery({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorRecoveryProvider
      enableAutoRecovery={true}
      enableSessionManagement={true}
      enableOfflineSupport={true}
      onSessionConflict={(conflict) => {
        toast.warning(
          `Session conflict detected: ${conflict.conflictType}. Resolving...`
        );
      }}
      onCriticalError={(error, context) => {
        console.error("Critical error in", context.component, ":", error);
        toast.error(
          "A critical error occurred. Please contact support if this persists."
        );
      }}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header with error recovery indicator */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Vitdaa POS Dashboard</h1>
            <ErrorRecoveryDashboard showInHeader={true} />
          </div>
        </header>

        {/* Main content */}
        <main className="p-6">{children}</main>
      </div>
    </ErrorRecoveryProvider>
  );
}

/**
 * Example of wrapping dashboard components with appropriate error boundaries
 */
export function ReceptionDashboardWithErrorRecovery() {
  return (
    <ReceptionDashboardErrorBoundary context="Reception Dashboard">
      <ReceptionDashboardContent />
    </ReceptionDashboardErrorBoundary>
  );
}

export function KitchenDashboardWithErrorRecovery() {
  return (
    <KitchenDashboardErrorBoundary context="Kitchen Dashboard">
      <KitchenDashboardContent />
    </KitchenDashboardErrorBoundary>
  );
}

export function BarDashboardWithErrorRecovery() {
  return (
    <BarDashboardErrorBoundary context="Bar Dashboard">
      <BarDashboardContent />
    </BarDashboardErrorBoundary>
  );
}

export function AccountantDashboardWithErrorRecovery() {
  return (
    <AccountantDashboardErrorBoundary context="Accountant Dashboard">
      <AccountantDashboardContent />
    </AccountantDashboardErrorBoundary>
  );
}

/**
 * Example of using error recovery hooks in components
 */
function ReceptionDashboardContent() {
  const { handleError, saveWork } =
    useComponentErrorRecovery("ReceptionDashboard");
  const [orderData, setOrderData] = React.useState({
    customerId: "",
    tableId: "",
    items: [],
  });

  // Save work in progress when order data changes
  React.useEffect(() => {
    if (
      orderData.customerId ||
      orderData.tableId ||
      orderData.items.length > 0
    ) {
      saveWork(orderData);
    }
  }, [orderData, saveWork]);

  const handleCreateOrder = async () => {
    try {
      // Simulate order creation
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const order = await response.json();
      toast.success("Order created successfully!");

      // Clear work in progress after successful creation
      setOrderData({ customerId: "", tableId: "", items: [] });
    } catch (error) {
      // Use error recovery system
      const result = await handleError(error, "create_order", {
        orderData,
        timestamp: new Date().toISOString(),
      });

      if (!result.success) {
        toast.error("Failed to create order. Please try again.");
      }
    }
  };

  const simulateError = () => {
    throw new Error("Simulated reception dashboard error");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reception Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>This is an example reception dashboard with error recovery.</p>

          <div className="flex gap-2">
            <Button onClick={handleCreateOrder}>Create Order</Button>
            <Button onClick={simulateError} variant="destructive">
              Simulate Error
            </Button>
          </div>

          {/* Order form would go here */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Order form with automatic work-in-progress saving...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KitchenDashboardContent() {
  const { handleError, saveWork } =
    useComponentErrorRecovery("KitchenDashboard");
  const [orderStatus, setOrderStatus] = React.useState<Record<string, string>>(
    {}
  );

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update order status: ${response.statusText}`
        );
      }

      setOrderStatus((prev) => ({ ...prev, [orderId]: status }));
      toast.success("Order status updated!");
    } catch (error) {
      const result = await handleError(error, "update_order_status", {
        orderId,
        status,
        timestamp: new Date().toISOString(),
      });

      if (!result.success) {
        toast.error("Failed to update order status. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kitchen Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>This is an example kitchen dashboard with error recovery.</p>

          <Button
            onClick={() => handleUpdateOrderStatus("order-123", "preparing")}
          >
            Update Order Status
          </Button>

          {/* Kitchen orders would go here */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Kitchen orders with offline support...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BarDashboardContent() {
  const { handleError } = useComponentErrorRecovery("BarDashboard");

  const handleProcessDrinkOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/bar/${orderId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to process drink order: ${response.statusText}`
        );
      }

      toast.success("Drink order processed!");
    } catch (error) {
      const result = await handleError(error, "process_drink_order", {
        orderId,
        timestamp: new Date().toISOString(),
      });

      if (!result.success) {
        toast.error("Failed to process drink order. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bar Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>This is an example bar dashboard with error recovery.</p>

          <Button onClick={() => handleProcessDrinkOrder("drink-order-456")}>
            Process Drink Order
          </Button>

          {/* Bar orders would go here */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Drink orders with automatic retry...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountantDashboardContent() {
  const { handleError } = useComponentErrorRecovery("AccountantDashboard");

  const handleGenerateReport = async (reportType: string) => {
    try {
      const response = await fetch(`/api/reports/${reportType}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      const reportData = await response.json();
      toast.success("Report generated successfully!");
    } catch (error) {
      const result = await handleError(error, "generate_report", {
        reportType,
        timestamp: new Date().toISOString(),
      });

      if (!result.success) {
        toast.error("Failed to generate report. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Accountant Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>This is an example accountant dashboard with error recovery.</p>

          <Button onClick={() => handleGenerateReport("daily-sales")}>
            Generate Daily Sales Report
          </Button>

          {/* Financial reports would go here */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Financial reports with export fallback...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Example of a complete error recovery dashboard page
 */
export function ErrorRecoveryManagementPage() {
  return (
    <ErrorRecoveryProvider>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Error Recovery Management</h1>
          <p className="text-gray-600">
            Monitor and manage system error recovery, offline operations, and
            session management.
          </p>
        </div>

        <ErrorRecoveryDashboard />
      </div>
    </ErrorRecoveryProvider>
  );
}
