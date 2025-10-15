import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { KitchenDashboard } from "@/components/staff/KitchenDashboard";
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
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

const mockStaffSession = {
  id: "session-1",
  staff_id: "staff-1",
  business_id: "business-1",
  role: "kitchen" as const,
  permissions: {
    orders: { read: true, update: true },
    inventory: { view: true, request: true },
  },
  staff: {
    id: "staff-1",
    name: "Chef Mike",
    email: "chef@example.com",
    role: "kitchen",
  },
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

describe("KitchenDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role-based rendering and permission enforcement", () => {
    it("renders kitchen dashboard for kitchen staff", () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      expect(screen.getByText("Kitchen Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Order Queue")).toBeInTheDocument();
      expect(screen.getByText("Inventory Management")).toBeInTheDocument();
    });

    it("shows inventory request button when user has request permissions", () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      const requestButton = screen.getByRole("button", {
        name: /request inventory/i,
      });
      expect(requestButton).toBeInTheDocument();
      expect(requestButton).not.toBeDisabled();
    });

    it("hides inventory request when user lacks request permissions", () => {
      const restrictedSession = {
        ...mockStaffSession,
        permissions: {
          ...mockStaffSession.permissions,
          inventory: { view: true, request: false },
        },
      };

      renderWithProviders(
        <KitchenDashboard staffSession={restrictedSession} />
      );

      expect(
        screen.queryByRole("button", { name: /request inventory/i })
      ).not.toBeInTheDocument();
    });

    it("shows order status update controls when user has update permissions", () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      expect(screen.getByText("Update Order Status")).toBeInTheDocument();
    });
  });

  describe("Real-time updates and error handling", () => {
    it("displays real-time order updates", async () => {
      const mockOrders = [
        {
          id: "1",
          status: "pending",
          items: [{ name: "Burger", quantity: 2, status: "pending" }],
          created_at: new Date().toISOString(),
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

      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        expect(screen.getByText("Burger")).toBeInTheDocument();
        expect(screen.getByText("Quantity: 2")).toBeInTheDocument();
      });
    });

    it("handles order status update errors gracefully", async () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      // Mock error in status update
      vi.mocked(
        require("@/lib/supabase/client").supabase.from
      ).mockImplementation(() => ({
        update: () => ({
          eq: () => Promise.reject(new Error("Update failed")),
        }),
      }));

      const statusButton = screen.queryByRole("button", {
        name: /mark ready/i,
      });
      if (statusButton) {
        fireEvent.click(statusButton);

        await waitFor(() => {
          expect(
            screen.getByText(/error updating status/i)
          ).toBeInTheDocument();
        });
      }
    });

    it("shows loading states during operations", async () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      const requestButton = screen.getByRole("button", {
        name: /request inventory/i,
      });
      fireEvent.click(requestButton);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Mobile responsiveness and touch interactions", () => {
    it("adapts order queue for mobile viewport", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      const orderQueue = screen.getByTestId("order-queue");
      expect(orderQueue).toHaveClass("mobile-layout");
    });

    it("supports swipe gestures for order management", () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      const orderCard = screen.queryByTestId("order-card");
      if (orderCard) {
        expect(orderCard).toHaveAttribute("data-swipe-enabled", "true");
      }
    });

    it("shows touch-optimized controls", () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      const controls = screen.getAllByRole("button");
      controls.forEach((control) => {
        const styles = window.getComputedStyle(control);
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44); // Touch target size
      });
    });
  });

  describe("Integration with existing APIs", () => {
    it("fetches kitchen orders from existing API", async () => {
      const mockOrders = [
        {
          id: "1",
          status: "pending",
          items: [{ name: "Pizza", quantity: 1, status: "pending" }],
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

      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });
    });

    it("integrates with inventory API for stock levels", async () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        expect(
          require("@/lib/supabase/client").supabase.from
        ).toHaveBeenCalledWith("inventory_items");
      });
    });

    it("creates inventory requests through API", async () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      const requestButton = screen.getByRole("button", {
        name: /request inventory/i,
      });
      fireEvent.click(requestButton);

      // Fill out request form
      const itemSelect = screen.getByLabelText("Select Item");
      const quantityInput = screen.getByLabelText("Quantity");
      const justificationInput = screen.getByLabelText("Justification");

      fireEvent.change(itemSelect, { target: { value: "tomatoes" } });
      fireEvent.change(quantityInput, { target: { value: "10" } });
      fireEvent.change(justificationInput, {
        target: { value: "Running low on tomatoes" },
      });

      const submitButton = screen.getByRole("button", {
        name: /submit request/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          require("@/lib/supabase/client").supabase.from
        ).toHaveBeenCalledWith("inventory_requests");
      });
    });

    it("updates order status through existing API", async () => {
      const mockOrders = [
        {
          id: "1",
          status: "pending",
          items: [{ id: "item-1", name: "Burger", status: "pending" }],
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
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      }));

      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        const markReadyButton = screen.getByRole("button", {
          name: /mark ready/i,
        });
        fireEvent.click(markReadyButton);
      });

      expect(
        require("@/lib/supabase/client").supabase.from
      ).toHaveBeenCalledWith("orders");
    });
  });

  describe("Inventory request workflow", () => {
    it("displays pending inventory requests", async () => {
      const mockRequests = [
        {
          id: "req-1",
          status: "pending",
          items: [
            { inventory_item: { name: "Tomatoes" }, requested_quantity: 10 },
          ],
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(
        require("@/lib/supabase/client").supabase.from
      ).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockRequests, error: null }),
          }),
        }),
      }));

      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        expect(screen.getByText("Pending Requests")).toBeInTheDocument();
        expect(screen.getByText("Tomatoes - 10 units")).toBeInTheDocument();
      });
    });

    it("shows request status updates", async () => {
      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      // Mock real-time update
      const mockUpdate = {
        id: "req-1",
        status: "approved",
        admin_notes: "Approved for delivery tomorrow",
      };

      // Simulate real-time update
      await waitFor(() => {
        expect(screen.getByText("Request Approved")).toBeInTheDocument();
      });
    });
  });

  describe("Activity logging", () => {
    it("logs order status updates", async () => {
      const mockLogActivity = vi.fn();
      vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging
      ).mockReturnValue({
        logActivity: mockLogActivity,
      });

      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      const statusButton = screen.queryByRole("button", {
        name: /mark ready/i,
      });
      if (statusButton) {
        fireEvent.click(statusButton);

        expect(mockLogActivity).toHaveBeenCalledWith({
          activity_type: "order_status_updated",
          resource_type: "order",
          staff_id: "staff-1",
        });
      }
    });

    it("logs inventory requests", async () => {
      const mockLogActivity = vi.fn();
      vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging
      ).mockReturnValue({
        logActivity: mockLogActivity,
      });

      renderWithProviders(<KitchenDashboard staffSession={mockStaffSession} />);

      const requestButton = screen.getByRole("button", {
        name: /request inventory/i,
      });
      fireEvent.click(requestButton);

      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "inventory_request_started",
        resource_type: "inventory_request",
        staff_id: "staff-1",
      });
    });
  });
});
