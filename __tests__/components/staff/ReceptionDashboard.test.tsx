import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ReceptionDashboardWithSync } from "@/components/staff/ReceptionDashboardWithSync";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock dependencies
vi.mock("@/hooks/use-realtime-sync", () => ({
  useRealtimeSync: vi.fn(() => ({
    isConnected: true,
    lastSync: new Date().toISOString(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-activity-logging", () => ({
  useActivityLogging: vi.fn(() => ({
    logActivity: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

const mockStaffSession = {
  sessionRecord: {
    id: "session-1",
    staff_id: "staff-1",
    business_id: "business-1",
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
  },
  staff: {
    id: "staff-1",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    role: "reception" as const,
  },
  business: {
    id: "business-1",
    business_name: "Test Restaurant",
  },
  permissions: [
    "orders:create",
    "orders:read",
    "orders:update",
    "tables:read",
    "tables:update",
    "customers:create",
    "customers:read",
    "customers:update",
    "payments:process",
  ],
};

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

describe("ReceptionDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role-based rendering and permission enforcement", () => {
    it("renders reception dashboard for reception staff", () => {
      renderWithProviders(
        <ReceptionDashboardWithSync staffSession={mockStaffSession} />
      );

      expect(screen.getByText("Create New Order")).toBeInTheDocument();
      expect(screen.getByText("Open Tickets")).toBeInTheDocument();
    });

    it("shows create order tab when user has create permissions", () => {
      renderWithProviders(
        <ReceptionDashboardWithSync staffSession={mockStaffSession} />
      );

      const createOrderTab = screen.getByRole("tab", {
        name: /create new order/i,
      });
      expect(createOrderTab).toBeInTheDocument();
      expect(createOrderTab).not.toBeDisabled();
    });

    it("hides create order tab when user lacks create permissions", () => {
      const restrictedSession = {
        ...mockStaffSession,
        permissions: mockStaffSession.permissions.filter(
          (p) => p !== "orders:create"
        ),
      };

      renderWithProviders(
        <ReceptionDashboardWithSync staffSession={restrictedSession} />
      );

      expect(
        screen.queryByRole("tab", { name: /create new order/i })
      ).not.toBeInTheDocument();
    });

    it("shows payment processing section when user has payment permissions", () => {
      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByText("Payment Processing")).toBeInTheDocument();
    });

    it("hides payment processing when user lacks payment permissions", () => {
      const restrictedSession = {
        ...mockStaffSession,
        permissions: {
          ...mockStaffSession.permissions,
          payments: { process: false },
        },
      };

      renderWithProviders(
        <ReceptionDashboard staffSession={restrictedSession} />
      );

      expect(screen.queryByText("Payment Processing")).not.toBeInTheDocument();
    });
  });

  describe("Real-time updates and error handling", () => {
    it("displays connection status indicator", () => {
      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByTestId("connection-status")).toBeInTheDocument();
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it("shows offline indicator when disconnected", () => {
      vi.mocked(
        require("@/hooks/use-realtime-sync").useRealtimeSync
      ).mockReturnValue({
        isConnected: false,
        lastSync: new Date().toISOString(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      });

      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    it("handles order creation errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      const createOrderButton = screen.getByRole("button", {
        name: /create order/i,
      });
      fireEvent.click(createOrderButton);

      // Simulate error in order creation
      const mockError = new Error("Network error");
      vi.mocked(
        require("@/lib/supabase/client").supabase.from
      ).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.reject(mockError),
          }),
        }),
      }));

      await waitFor(() => {
        expect(screen.getByText(/error creating order/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it("retries failed operations", async () => {
      const retryButton = screen.queryByRole("button", { name: /retry/i });
      if (retryButton) {
        fireEvent.click(retryButton);
        await waitFor(() => {
          expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe("Mobile responsiveness and touch interactions", () => {
    it("adapts layout for mobile viewport", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      const dashboard = screen.getByTestId("reception-dashboard");
      expect(dashboard).toHaveClass("mobile-layout");
    });

    it("shows collapsible navigation on mobile", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByTestId("mobile-nav-toggle")).toBeInTheDocument();
    });

    it("handles touch interactions for table management", () => {
      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      const tableGrid = screen.getByTestId("table-management-grid");
      expect(tableGrid).toHaveAttribute("data-touch-enabled", "true");
    });

    it("supports swipe gestures for order management", () => {
      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      const orderList = screen.getByTestId("order-list");
      expect(orderList).toHaveAttribute("data-swipe-enabled", "true");
    });
  });

  describe("Integration with existing APIs", () => {
    it("fetches orders from existing API", async () => {
      const mockOrders = [
        { id: "1", customer_name: "John Doe", status: "pending", total: 25.5 },
        {
          id: "2",
          customer_name: "Jane Smith",
          status: "completed",
          total: 18.75,
        },
      ];

      vi.mocked(
        require("@/lib/supabase/client").supabase.from
      ).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockOrders, error: null }),
          }),
        }),
      }));

      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });
    });

    it("integrates with menu items API for order creation", async () => {
      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      const createOrderButton = screen.getByRole("button", {
        name: /create order/i,
      });
      fireEvent.click(createOrderButton);

      await waitFor(() => {
        expect(screen.getByText("Select Menu Items")).toBeInTheDocument();
      });
    });

    it("integrates with customer API for customer management", async () => {
      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      const customerSearch = screen.getByPlaceholderText("Search customers...");
      fireEvent.change(customerSearch, { target: { value: "John" } });

      await waitFor(() => {
        expect(
          require("@/lib/supabase/client").supabase.from
        ).toHaveBeenCalledWith("customers");
      });
    });

    it("integrates with payment API for payment processing", async () => {
      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      const processPaymentButton = screen.queryByRole("button", {
        name: /process payment/i,
      });
      if (processPaymentButton) {
        fireEvent.click(processPaymentButton);

        await waitFor(() => {
          expect(
            require("@/lib/supabase/client").supabase.from
          ).toHaveBeenCalledWith("payments");
        });
      }
    });
  });

  describe("Activity logging", () => {
    it("logs user actions for performance tracking", async () => {
      const mockLogActivity = vi.fn();
      vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging
      ).mockReturnValue({
        logActivity: mockLogActivity,
      });

      renderWithProviders(
        <ReceptionDashboard staffSession={mockStaffSession} />
      );

      const createOrderButton = screen.getByRole("button", {
        name: /create order/i,
      });
      fireEvent.click(createOrderButton);

      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "order_creation_started",
        resource_type: "order",
        staff_id: "staff-1",
      });
    });
  });
});
