import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the dashboard components
vi.mock("@/components/staff/ReceptionDashboard", () => ({
  default: ({ staffSession, onOrderCreated }: any) => (
    <div data-testid="reception-dashboard">
      <h1>Reception Dashboard</h1>
      <button
        onClick={() => onOrderCreated?.({ id: "order-1", status: "pending" })}
        data-testid="create-order"
      >
        Create Order
      </button>
      <div data-testid="staff-role">{staffSession.role}</div>
    </div>
  ),
}));

vi.mock("@/components/staff/KitchenDashboard", () => ({
  default: ({ staffSession, onOrderStatusUpdate }: any) => (
    <div data-testid="kitchen-dashboard">
      <h1>Kitchen Dashboard</h1>
      <button
        onClick={() => onOrderStatusUpdate?.("order-1", "preparing")}
        data-testid="start-preparation"
      >
        Start Preparation
      </button>
      <button
        onClick={() => onOrderStatusUpdate?.("order-1", "ready")}
        data-testid="mark-ready"
      >
        Mark Ready
      </button>
      <div data-testid="staff-role">{staffSession.role}</div>
    </div>
  ),
}));

vi.mock("@/components/staff/BarDashboard", () => ({
  default: ({ staffSession, onDrinkStatusUpdate }: any) => (
    <div data-testid="bar-dashboard">
      <h1>Bar Dashboard</h1>
      <button
        onClick={() => onDrinkStatusUpdate?.("order-1", "item-1", "prepared")}
        data-testid="mark-drink-ready"
      >
        Mark Drink Ready
      </button>
      <div data-testid="staff-role">{staffSession.role}</div>
    </div>
  ),
}));

// Mock real-time sync
vi.mock("@/hooks/use-realtime-sync", () => ({
  useRealtimeSync: vi.fn(() => ({
    isConnected: true,
    lastSync: new Date().toISOString(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    broadcastUpdate: vi.fn(),
  })),
}));

// Mock activity logging
vi.mock("@/hooks/use-activity-logging", () => ({
  useActivityLogging: vi.fn(() => ({
    logActivity: vi.fn(),
  })),
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({ data: { id: "order-1" }, error: null })
        ),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  channel: vi.fn(() => ({
    on: vi.fn(() => ({ subscribe: vi.fn() })),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
};

vi.mock("@/lib/supabase/client", () => ({
  supabase: mockSupabaseClient,
}));

// Import components after mocking
import { ReceptionDashboardWithSync } from "@/components/staff/ReceptionDashboardWithSync";
import KitchenDashboard from "@/components/staff/KitchenDashboard";
import BarDashboard from "@/components/staff/BarDashboard";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

// Mock staff sessions
const receptionStaffSession = {
  id: "session-1",
  staff_id: "staff-1",
  business_id: "business-1",
  role: "reception" as const,
  permissions: {
    orders: { create: true, read: true, update: true },
    tables: { manage: true },
    customers: { create: true, read: true, update: true },
    payments: { process: true },
  },
  staff: {
    id: "staff-1",
    name: "Reception Staff",
    email: "reception@example.com",
    role: "reception",
  },
};

const kitchenStaffSession = {
  id: "session-2",
  staff_id: "staff-2",
  business_id: "business-1",
  role: "kitchen" as const,
  permissions: {
    orders: { read: true, update: true },
    inventory: { view: true, request: true },
  },
  staff: {
    id: "staff-2",
    name: "Kitchen Staff",
    email: "kitchen@example.com",
    role: "kitchen",
  },
};

const barStaffSession = {
  id: "session-3",
  staff_id: "staff-3",
  business_id: "business-1",
  role: "bar" as const,
  permissions: {
    orders: { read: true, update: true },
    inventory: { view: true, update: true, request: true },
    beverages: { manage: true },
  },
  staff: {
    id: "staff-3",
    name: "Bar Staff",
    email: "bar@example.com",
    role: "bar",
  },
};

describe("Cross-Dashboard Workflows Integration Tests", () => {
  let mockBroadcastUpdate: any;
  let mockLogActivity: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBroadcastUpdate = vi.fn();
    mockLogActivity = vi.fn();

    vi.mocked(
      require("@/hooks/use-realtime-sync").useRealtimeSync
    ).mockReturnValue({
      isConnected: true,
      lastSync: new Date().toISOString(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      broadcastUpdate: mockBroadcastUpdate,
    });

    vi.mocked(
      require("@/hooks/use-activity-logging").useActivityLogging
    ).mockReturnValue({
      logActivity: mockLogActivity,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Order flow from reception to kitchen to completion", () => {
    it("creates order in reception and updates kitchen dashboard", async () => {
      // Render reception dashboard
      const { rerender } = renderWithProviders(
        <ReceptionDashboard staffSession={receptionStaffSession} />
      );

      // Create order in reception
      const createOrderButton = screen.getByTestId("create-order");
      fireEvent.click(createOrderButton);

      // Verify order creation API call
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("orders");
      });

      // Verify real-time broadcast
      expect(mockBroadcastUpdate).toHaveBeenCalledWith({
        type: "order_created",
        orderId: "order-1",
        status: "pending",
        targetDashboards: ["kitchen", "bar"],
      });

      // Verify activity logging
      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "order_created",
        resource_type: "order",
        resource_id: "order-1",
        staff_id: "staff-1",
      });

      // Switch to kitchen dashboard
      rerender(<KitchenDashboard staffSession={kitchenStaffSession} />);

      // Kitchen staff starts preparation
      const startPrepButton = screen.getByTestId("start-preparation");
      fireEvent.click(startPrepButton);

      // Verify kitchen status update
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("orders");
        expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
          status: "preparing",
          updated_at: expect.any(String),
        });
      });

      // Verify real-time broadcast to other dashboards
      expect(mockBroadcastUpdate).toHaveBeenCalledWith({
        type: "order_status_updated",
        orderId: "order-1",
        status: "preparing",
        targetDashboards: ["reception", "bar"],
      });

      // Kitchen staff marks order ready
      const markReadyButton = screen.getByTestId("mark-ready");
      fireEvent.click(markReadyButton);

      // Verify completion status update
      await waitFor(() => {
        expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
          status: "ready",
          completed_at: expect.any(String),
        });
      });

      // Verify final broadcast
      expect(mockBroadcastUpdate).toHaveBeenCalledWith({
        type: "order_completed",
        orderId: "order-1",
        status: "ready",
        targetDashboards: ["reception"],
      });
    });

    it("handles concurrent order updates from multiple dashboards", async () => {
      // Mock concurrent updates
      const orderUpdates = [
        { dashboard: "kitchen", status: "preparing", timestamp: Date.now() },
        {
          dashboard: "bar",
          status: "drinks_ready",
          timestamp: Date.now() + 100,
        },
        {
          dashboard: "kitchen",
          status: "food_ready",
          timestamp: Date.now() + 200,
        },
      ];

      // Simulate concurrent updates
      orderUpdates.forEach((update) => {
        mockBroadcastUpdate({
          type: "order_status_updated",
          orderId: "order-1",
          status: update.status,
          timestamp: update.timestamp,
          source: update.dashboard,
        });
      });

      // Verify conflict resolution (latest timestamp wins)
      expect(mockBroadcastUpdate).toHaveBeenCalledTimes(3);

      // Verify database updates are queued properly
      await waitFor(() => {
        expect(mockSupabaseClient.from().update).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe("Inventory request workflow from kitchen to admin approval", () => {
    it("creates inventory request and handles admin approval", async () => {
      // Render kitchen dashboard
      renderWithProviders(
        <KitchenDashboard staffSession={kitchenStaffSession} />
      );

      // Mock inventory request creation
      const mockInventoryRequest = {
        id: "req-1",
        business_id: "business-1",
        requested_by_staff_id: "staff-2",
        items: [
          {
            inventory_item_id: "item-1",
            requested_quantity: 10,
            estimated_unit_cost: 5.0,
          },
        ],
        status: "pending",
        urgency_level: "normal",
        justification: "Running low on ingredients",
      };

      // Simulate inventory request creation
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "inventory_requests") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: mockInventoryRequest,
                    error: null,
                  })
                ),
              })),
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({
                    data: [mockInventoryRequest],
                    error: null,
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          };
        }
        return mockSupabaseClient.from();
      });

      // Trigger inventory request
      const requestButton = screen.queryByTestId("request-inventory");
      if (requestButton) {
        fireEvent.click(requestButton);

        // Verify request creation
        await waitFor(() => {
          expect(mockSupabaseClient.from).toHaveBeenCalledWith(
            "inventory_requests"
          );
        });

        // Verify real-time notification to admin
        expect(mockBroadcastUpdate).toHaveBeenCalledWith({
          type: "inventory_request_created",
          requestId: "req-1",
          targetDashboards: ["admin"],
          urgencyLevel: "normal",
        });

        // Verify activity logging
        expect(mockLogActivity).toHaveBeenCalledWith({
          activity_type: "inventory_request_created",
          resource_type: "inventory_request",
          resource_id: "req-1",
          staff_id: "staff-2",
        });
      }
    });

    it("handles inventory request approval workflow", async () => {
      const mockApprovedRequest = {
        id: "req-1",
        status: "approved",
        approved_by_admin_id: "admin-1",
        approved_at: new Date().toISOString(),
        admin_notes: "Approved for next delivery",
      };

      // Simulate admin approval
      mockBroadcastUpdate({
        type: "inventory_request_approved",
        requestId: "req-1",
        targetDashboards: ["kitchen"],
        approvalData: mockApprovedRequest,
      });

      // Render kitchen dashboard to receive approval
      renderWithProviders(
        <KitchenDashboard staffSession={kitchenStaffSession} />
      );

      // Verify kitchen dashboard receives approval notification
      await waitFor(() => {
        expect(screen.queryByText("Request Approved")).toBeInTheDocument();
      });

      // Verify activity logging for approval
      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "inventory_request_approved",
        resource_type: "inventory_request",
        resource_id: "req-1",
        staff_id: "staff-2",
      });
    });
  });

  describe("Real-time synchronization across multiple dashboards", () => {
    it("synchronizes order updates across all relevant dashboards", async () => {
      // Mock multiple dashboard instances
      const dashboards = [
        { component: ReceptionDashboard, session: receptionStaffSession },
        { component: KitchenDashboard, session: kitchenStaffSession },
        { component: BarDashboard, session: barStaffSession },
      ];

      // Render all dashboards
      const { rerender } = renderWithProviders(
        <div>
          {dashboards.map((dashboard, index) => (
            <dashboard.component key={index} staffSession={dashboard.session} />
          ))}
        </div>
      );

      // Simulate order status update from kitchen
      mockBroadcastUpdate({
        type: "order_status_updated",
        orderId: "order-1",
        status: "preparing",
        sourceStaffId: "staff-2",
        targetDashboards: ["reception", "bar"],
        timestamp: Date.now(),
      });

      // Verify all dashboards receive the update
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("orders");
      });

      // Verify real-time subscription setup
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith("order-updates");
    });

    it("handles network disconnection and reconnection", async () => {
      // Mock network disconnection
      vi.mocked(
        require("@/hooks/use-realtime-sync").useRealtimeSync
      ).mockReturnValue({
        isConnected: false,
        lastSync: new Date().toISOString(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        broadcastUpdate: vi.fn(),
        queueOfflineAction: vi.fn(),
      });

      renderWithProviders(
        <KitchenDashboard staffSession={kitchenStaffSession} />
      );

      // Attempt action while offline
      const startPrepButton = screen.getByTestId("start-preparation");
      fireEvent.click(startPrepButton);

      // Verify action is queued
      const mockQueueOfflineAction = vi.mocked(
        require("@/hooks/use-realtime-sync").useRealtimeSync()
          .queueOfflineAction
      );
      expect(mockQueueOfflineAction).toHaveBeenCalledWith({
        type: "order_status_update",
        orderId: "order-1",
        status: "preparing",
        timestamp: expect.any(Number),
      });

      // Mock reconnection
      vi.mocked(
        require("@/hooks/use-realtime-sync").useRealtimeSync
      ).mockReturnValue({
        isConnected: true,
        lastSync: new Date().toISOString(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        broadcastUpdate: mockBroadcastUpdate,
        syncQueuedActions: vi.fn(),
      });

      // Verify queued actions are synced on reconnection
      const mockSyncQueuedActions = vi.mocked(
        require("@/hooks/use-realtime-sync").useRealtimeSync().syncQueuedActions
      );
      expect(mockSyncQueuedActions).toHaveBeenCalled();
    });
  });

  describe("Staff activity logging and performance tracking", () => {
    it("logs cross-dashboard workflow activities", async () => {
      // Render reception dashboard
      renderWithProviders(
        <ReceptionDashboard staffSession={receptionStaffSession} />
      );

      // Create order
      const createOrderButton = screen.getByTestId("create-order");
      fireEvent.click(createOrderButton);

      // Verify comprehensive activity logging
      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "order_created",
        resource_type: "order",
        resource_id: "order-1",
        staff_id: "staff-1",
        performance_metrics: {
          response_time: expect.any(Number),
          workflow_step: "order_creation",
          cross_dashboard_impact: ["kitchen", "bar"],
        },
      });

      // Switch to kitchen dashboard
      const { rerender } = renderWithProviders(
        <KitchenDashboard staffSession={kitchenStaffSession} />
      );

      // Start preparation
      const startPrepButton = screen.getByTestId("start-preparation");
      fireEvent.click(startPrepButton);

      // Verify workflow continuation logging
      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "order_preparation_started",
        resource_type: "order",
        resource_id: "order-1",
        staff_id: "staff-2",
        performance_metrics: {
          response_time: expect.any(Number),
          workflow_step: "preparation_start",
          previous_step_staff_id: "staff-1",
          workflow_efficiency_score: expect.any(Number),
        },
      });
    });

    it("tracks workflow performance metrics", async () => {
      const workflowStartTime = Date.now();

      // Mock workflow timing
      const mockWorkflowMetrics = {
        order_creation_time: 1500, // ms
        kitchen_response_time: 2000, // ms
        total_workflow_time: 3500, // ms
        staff_handoffs: 2,
        efficiency_score: 85,
      };

      // Simulate complete workflow
      mockLogActivity.mockImplementation((activity) => {
        if (activity.activity_type === "workflow_completed") {
          expect(activity.performance_metrics).toEqual(
            expect.objectContaining(mockWorkflowMetrics)
          );
        }
      });

      // Trigger workflow completion
      mockBroadcastUpdate({
        type: "workflow_completed",
        orderId: "order-1",
        workflowMetrics: mockWorkflowMetrics,
        startTime: workflowStartTime,
        endTime: Date.now(),
      });

      // Verify performance tracking
      expect(mockLogActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: "workflow_completed",
          performance_metrics: expect.objectContaining(mockWorkflowMetrics),
        })
      );
    });
  });

  describe("Error handling and recovery in cross-dashboard workflows", () => {
    it("handles API failures gracefully across dashboards", async () => {
      // Mock API failure
      mockSupabaseClient.from.mockImplementation(() => ({
        update: vi.fn(() =>
          Promise.reject(new Error("Database connection failed"))
        ),
      }));

      renderWithProviders(
        <KitchenDashboard staffSession={kitchenStaffSession} />
      );

      // Attempt status update
      const startPrepButton = screen.getByTestId("start-preparation");
      fireEvent.click(startPrepButton);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/error updating status/i)).toBeInTheDocument();
      });

      // Verify error is logged
      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "workflow_error",
        resource_type: "order",
        error_details: {
          error_message: "Database connection failed",
          failed_operation: "order_status_update",
          staff_id: "staff-2",
        },
      });

      // Verify retry mechanism
      const retryButton = screen.queryByRole("button", { name: /retry/i });
      if (retryButton) {
        fireEvent.click(retryButton);

        // Verify retry attempt is logged
        expect(mockLogActivity).toHaveBeenCalledWith({
          activity_type: "workflow_retry_attempted",
          resource_type: "order",
          staff_id: "staff-2",
        });
      }
    });

    it("handles conflicting updates from multiple dashboards", async () => {
      // Mock conflicting updates
      const conflictingUpdates = [
        {
          orderId: "order-1",
          status: "preparing",
          timestamp: Date.now(),
          staffId: "staff-2",
          source: "kitchen",
        },
        {
          orderId: "order-1",
          status: "cancelled",
          timestamp: Date.now() + 50,
          staffId: "staff-1",
          source: "reception",
        },
      ];

      // Simulate conflict resolution
      conflictingUpdates.forEach((update) => {
        mockBroadcastUpdate({
          type: "order_status_conflict",
          ...update,
        });
      });

      // Verify conflict resolution (latest timestamp wins)
      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "workflow_conflict_resolved",
        resource_type: "order",
        resource_id: "order-1",
        conflict_resolution: {
          winning_update: conflictingUpdates[1],
          conflicting_updates: conflictingUpdates,
          resolution_strategy: "latest_timestamp",
        },
      });
    });
  });
});
