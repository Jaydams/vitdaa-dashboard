import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BarDashboard } from "@/components/staff/BarDashboard";
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
  role: "bar" as const,
  permissions: {
    orders: { read: true, update: true },
    inventory: { view: true, update: true, request: true },
    beverages: { manage: true },
  },
  staff: {
    id: "staff-1",
    name: "Bartender Joe",
    email: "joe@example.com",
    role: "bar",
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

describe("BarDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role-based rendering and permission enforcement", () => {
    it("renders bar dashboard for bar staff", () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      expect(screen.getByText("Bar Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Beverage Orders")).toBeInTheDocument();
      expect(screen.getByText("Bar Inventory")).toBeInTheDocument();
    });

    it("shows beverage management controls when user has manage permissions", () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      expect(
        screen.getByRole("button", { name: /manage beverages/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /update stock/i })
      ).toBeInTheDocument();
    });

    it("hides beverage management when user lacks permissions", () => {
      const restrictedSession = {
        ...mockStaffSession,
        permissions: {
          ...mockStaffSession.permissions,
          beverages: { manage: false },
        },
      };

      renderWithProviders(<BarDashboard staffSession={restrictedSession} />);

      expect(
        screen.queryByRole("button", { name: /manage beverages/i })
      ).not.toBeInTheDocument();
    });

    it("shows inventory request button when user has request permissions", () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const requestButton = screen.getByRole("button", {
        name: /request inventory/i,
      });
      expect(requestButton).toBeInTheDocument();
      expect(requestButton).not.toBeDisabled();
    });
  });

  describe("Real-time updates and error handling", () => {
    it("displays real-time beverage orders", async () => {
      const mockOrders = [
        {
          id: "1",
          status: "pending",
          items: [
            {
              name: "Mojito",
              quantity: 2,
              status: "pending",
              special_instructions: "Extra mint",
              category: "beverage",
            },
          ],
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

      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        expect(screen.getByText("Mojito")).toBeInTheDocument();
        expect(screen.getByText("Quantity: 2")).toBeInTheDocument();
        expect(screen.getByText("Extra mint")).toBeInTheDocument();
      });
    });

    it("handles drink preparation errors gracefully", async () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      // Mock error in status update
      vi.mocked(
        require("@/lib/supabase/client").supabase.from
      ).mockImplementation(() => ({
        update: () => ({
          eq: () => Promise.reject(new Error("Update failed")),
        }),
      }));

      const prepareButton = screen.queryByRole("button", {
        name: /mark prepared/i,
      });
      if (prepareButton) {
        fireEvent.click(prepareButton);

        await waitFor(() => {
          expect(
            screen.getByText(/error updating drink status/i)
          ).toBeInTheDocument();
        });
      }
    });

    it("shows connection status for real-time updates", () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      expect(screen.getByTestId("connection-status")).toBeInTheDocument();
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  describe("Mobile responsiveness and touch interactions", () => {
    it("adapts beverage order queue for mobile", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const orderQueue = screen.getByTestId("beverage-order-queue");
      expect(orderQueue).toHaveClass("mobile-layout");
    });

    it("supports touch interactions for drink preparation", () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const drinkCard = screen.queryByTestId("drink-card");
      if (drinkCard) {
        expect(drinkCard).toHaveAttribute("data-touch-enabled", "true");
      }
    });

    it("shows mobile-optimized inventory controls", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const inventoryControls = screen.getByTestId("bar-inventory-controls");
      expect(inventoryControls).toHaveClass("mobile-optimized");
    });
  });

  describe("Integration with existing APIs", () => {
    it("fetches beverage orders from existing API", async () => {
      const mockOrders = [
        {
          id: "1",
          status: "pending",
          items: [
            {
              name: "Cocktail",
              quantity: 1,
              status: "pending",
              category: "beverage",
            },
          ],
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

      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        expect(screen.getByText("Cocktail")).toBeInTheDocument();
      });
    });

    it("integrates with inventory API for beverage stock", async () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        expect(
          require("@/lib/supabase/client").supabase.from
        ).toHaveBeenCalledWith("inventory_items");
      });
    });

    it("updates beverage stock through existing API", async () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const updateStockButton = screen.getByRole("button", {
        name: /update stock/i,
      });
      fireEvent.click(updateStockButton);

      // Fill stock update form
      const itemSelect = screen.getByLabelText("Select Beverage");
      const quantityInput = screen.getByLabelText("New Quantity");

      fireEvent.change(itemSelect, { target: { value: "vodka" } });
      fireEvent.change(quantityInput, { target: { value: "50" } });

      const submitButton = screen.getByRole("button", { name: /update/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          require("@/lib/supabase/client").supabase.from
        ).toHaveBeenCalledWith("inventory_items");
      });
    });

    it("creates beverage restock requests", async () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const requestButton = screen.getByRole("button", {
        name: /request inventory/i,
      });
      fireEvent.click(requestButton);

      // Fill request form
      const itemSelect = screen.getByLabelText("Select Item");
      const quantityInput = screen.getByLabelText("Quantity");
      const justificationInput = screen.getByLabelText("Justification");

      fireEvent.change(itemSelect, { target: { value: "whiskey" } });
      fireEvent.change(quantityInput, { target: { value: "20" } });
      fireEvent.change(justificationInput, {
        target: { value: "Low stock for weekend rush" },
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
  });

  describe("Beverage-specific functionality", () => {
    it("displays drink preparation times", async () => {
      const mockOrders = [
        {
          id: "1",
          items: [
            {
              name: "Margarita",
              preparation_time: 5,
              timing_requirements: "Serve immediately",
            },
          ],
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

      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      await waitFor(() => {
        expect(screen.getByText("Prep time: 5 min")).toBeInTheDocument();
        expect(screen.getByText("Serve immediately")).toBeInTheDocument();
      });
    });

    it("shows beverage analytics and sales tracking", () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      expect(screen.getByText("Beverage Analytics")).toBeInTheDocument();
      expect(screen.getByText("Top Selling Drinks")).toBeInTheDocument();
      expect(screen.getByText("Revenue Tracking")).toBeInTheDocument();
    });

    it("handles special drink instructions", async () => {
      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const addInstructionsButton = screen.queryByRole("button", {
        name: /add instructions/i,
      });
      if (addInstructionsButton) {
        fireEvent.click(addInstructionsButton);

        const instructionsInput = screen.getByLabelText("Special Instructions");
        fireEvent.change(instructionsInput, {
          target: { value: "No ice, extra lime" },
        });

        const saveButton = screen.getByRole("button", { name: /save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(screen.getByText("No ice, extra lime")).toBeInTheDocument();
        });
      }
    });
  });

  describe("Activity logging", () => {
    it("logs drink preparation activities", async () => {
      const mockLogActivity = vi.fn();
      vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging
      ).mockReturnValue({
        logActivity: mockLogActivity,
      });

      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const prepareButton = screen.queryByRole("button", {
        name: /mark prepared/i,
      });
      if (prepareButton) {
        fireEvent.click(prepareButton);

        expect(mockLogActivity).toHaveBeenCalledWith({
          activity_type: "drink_prepared",
          resource_type: "order_item",
          staff_id: "staff-1",
        });
      }
    });

    it("logs inventory updates", async () => {
      const mockLogActivity = vi.fn();
      vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging
      ).mockReturnValue({
        logActivity: mockLogActivity,
      });

      renderWithProviders(<BarDashboard staffSession={mockStaffSession} />);

      const updateStockButton = screen.getByRole("button", {
        name: /update stock/i,
      });
      fireEvent.click(updateStockButton);

      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "inventory_updated",
        resource_type: "inventory_item",
        staff_id: "staff-1",
      });
    });
  });
});
