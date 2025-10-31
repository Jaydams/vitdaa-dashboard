import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Import the components we're testing
import EnhancedReceptionDashboard from "@/components/staff/EnhancedReceptionDashboard";
import { useOrderStore } from "@/stores/order-store";

// Mock the Supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { id: "ticket-1" }, error: null })
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock Next.js modules
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => "/"),
}));

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

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

// Mock staff session
const mockStaffSession = {
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

// Mock menu items for testing
const mockMenuItems = [
  {
    id: 1,
    name: "Burger",
    price: 15.99,
    image_url: "/burger.jpg",
  },
  {
    id: 2,
    name: "Pizza",
    price: 22.5,
    image_url: "/pizza.jpg",
  },
];

describe("Reception Dashboard Integration Tests", () => {
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the order store
    useOrderStore.getState().clearCurrentOrder();
    useOrderStore.setState({ openTickets: [] });

    // Setup fetch mock
    mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation((url: string, options?: any) => {
      const method = options?.method || "GET";

      if (url.includes("/api/tickets") && method === "GET") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ tickets: [] }),
        } as Response);
      }

      if (url.includes("/api/tickets") && method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: "ticket-1",
              ticketNumber: "TKT-123",
              status: "pending_payment",
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Complete Order Creation to Payment Workflow", () => {
    it("should create order, save as ticket, and process payment", async () => {
      renderWithProviders(
        <EnhancedReceptionDashboard staffSession={mockStaffSession} />
      );

      // Verify initial state - should be on Create New Order tab
      expect(screen.getByText("Create New Order")).toBeInTheDocument();

      // Step 1: Add items to order
      const orderStore = useOrderStore.getState();

      // Simulate adding items to the order
      act(() => {
        orderStore.addItem(mockMenuItems[0]);
        orderStore.addItem(mockMenuItems[1]);
      });

      // Verify items were added
      await waitFor(() => {
        const currentOrder = useOrderStore.getState().currentOrder;
        expect(currentOrder?.items).toHaveLength(2);
        expect(currentOrder?.calculations.total).toBeGreaterThan(0);
      });

      // Step 2: Save as open ticket
      act(() => {
        orderStore.saveAsOpenTicket();
      });

      // Verify ticket was created
      await waitFor(() => {
        const { openTickets } = useOrderStore.getState();
        expect(openTickets).toHaveLength(1);
        expect(openTickets[0].status).toBe("pending_payment");
      });

      // Verify API call was made
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      // Step 3: Switch to Open Tickets tab
      const openTicketsTab = screen.getByText("Open Tickets");
      fireEvent.click(openTicketsTab);

      // Verify we're on the open tickets tab
      expect(screen.getByText("Open Tickets")).toHaveClass(
        "data-[state=active]:bg-primary"
      );

      // Step 4: Verify ticket appears in the list
      await waitFor(() => {
        const { openTickets } = useOrderStore.getState();
        expect(openTickets).toHaveLength(1);
        expect(openTickets[0].orderState.items).toHaveLength(2);
      });

      // Step 5: Process payment (simulate clicking on ticket)
      const { openTickets } = useOrderStore.getState();
      const ticketId = openTickets[0].id;

      act(() => {
        orderStore.completeTicketPayment(ticketId);
      });

      // Verify payment completion
      await waitFor(() => {
        const { openTickets: updatedTickets } = useOrderStore.getState();
        // Completed tickets should be removed from the list
        expect(updatedTickets).toHaveLength(0);
      });
    });

    it("should handle order modifications during payment process", async () => {
      renderWithProviders(
        <EnhancedReceptionDashboard staffSession={mockStaffSession} />
      );

      const orderStore = useOrderStore.getState();

      // Create an order with items
      act(() => {
        orderStore.addItem(mockMenuItems[0]);
        orderStore.updateCustomer({ name: "John Doe", phone: "123-456-7890" });
        orderStore.updateDiningOption("takeaway");
      });

      // Save as ticket
      let ticketId: string;
      await act(async () => {
        ticketId = await orderStore.saveAsOpenTicket();
      });

      // Load ticket back for editing
      act(() => {
        orderStore.loadOpenTicket(ticketId!);
      });

      // Modify the order
      act(() => {
        orderStore.addItem(mockMenuItems[1]);
        orderStore.updateQuantity(
          useOrderStore.getState().currentOrder!.items[0].id,
          2
        );
      });

      // Verify modifications
      await waitFor(() => {
        const currentOrder = useOrderStore.getState().currentOrder;
        expect(currentOrder?.items).toHaveLength(2);
        expect(currentOrder?.items[0].quantity).toBe(2);
      });

      // Save modifications back to ticket
      await act(async () => {
        await orderStore.saveAsOpenTicket();
      });

      // Verify ticket was updated
      const { openTickets } = useOrderStore.getState();
      expect(openTickets[0].orderState.items).toHaveLength(2);
    });
  });

  describe("Multi-Staff Concurrent Usage Scenarios", () => {
    it("should handle concurrent ticket creation by multiple staff", async () => {
      // Simulate multiple staff sessions
      const staff1Store = useOrderStore.getState();

      // Staff 1 creates a ticket
      act(() => {
        staff1Store.addItem(mockMenuItems[0]);
      });

      let ticket1Id: string;
      await act(async () => {
        ticket1Id = await staff1Store.saveAsOpenTicket();
      });

      // Simulate another staff member's ticket appearing (from server sync)
      const externalTicket = {
        id: "external-ticket-1",
        ticketNumber: "TKT-EXTERNAL-001",
        orderState: {
          id: "external-ticket-1",
          items: [
            {
              id: "item-1",
              order_id: "external-ticket-1",
              menu_item_id: 2,
              menu_item_name: "Pizza",
              menu_item_price: 22.5,
              quantity: 1,
              total_price: 22.5,
              created_at: new Date().toISOString(),
            },
          ],
          customer: { name: "Jane Doe" },
          diningOption: "indoor" as const,
          status: "open_ticket" as const,
          calculations: {
            subtotal: 22.5,
            vatAmount: 1.69,
            serviceChargeAmount: 1.13,
            customChargesTotal: 0,
            total: 25.32,
          },
          customCharges: [],
          timestamps: {
            created: new Date(),
            lastModified: new Date(),
            savedAsTicket: new Date(),
          },
        },
        status: "pending_payment" as const,
        priority: "normal" as const,
        createdBy: "staff-2",
        createdAt: new Date(),
        lastModified: new Date(),
        paymentStatus: "pending" as const,
      };

      // Simulate receiving external ticket via sync
      act(() => {
        useOrderStore.setState((state) => ({
          openTickets: [...state.openTickets, externalTicket],
        }));
      });

      // Verify both tickets exist
      await waitFor(() => {
        const { openTickets } = useOrderStore.getState();
        expect(openTickets).toHaveLength(2);
        expect(
          openTickets.find((t) => t.createdBy === "current-staff")
        ).toBeDefined();
        expect(
          openTickets.find((t) => t.createdBy === "staff-2")
        ).toBeDefined();
      });

      // Test concurrent status updates
      act(() => {
        staff1Store.updateTicketStatus(ticket1Id!, "preparing");
        staff1Store.updateTicketStatus(externalTicket.id, "ready");
      });

      // Verify status updates
      const { openTickets } = useOrderStore.getState();
      expect(openTickets.find((t) => t.id === ticket1Id!)?.status).toBe(
        "preparing"
      );
      expect(openTickets.find((t) => t.id === externalTicket.id)?.status).toBe(
        "ready"
      );
    });

    it("should handle conflicting updates gracefully", async () => {
      const orderStore = useOrderStore.getState();

      // Create a ticket
      act(() => {
        orderStore.addItem(mockMenuItems[0]);
      });

      let ticketId: string;
      await act(async () => {
        ticketId = await orderStore.saveAsOpenTicket();
      });

      // Simulate conflict scenario - server returns 409
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ error: "Conflict detected" }),
        } as Response)
      );

      // Attempt to sync ticket
      await act(async () => {
        try {
          await orderStore.syncTicketWithServer(ticketId!);
        } catch (error) {
          // Expected to fail due to conflict
        }
      });

      // Verify conflict is tracked
      const { conflictedTickets } = useOrderStore.getState();
      expect(conflictedTickets).toContain(ticketId!);
    });
  });

  describe("Real-time Synchronization", () => {
    it("should sync tickets with server on load", async () => {
      // Mock server response with existing tickets
      const serverTickets = [
        {
          id: "server-ticket-1",
          ticketNumber: "TKT-SERVER-001",
          orderState: {
            id: "server-ticket-1",
            items: [
              {
                id: "item-1",
                order_id: "server-ticket-1",
                menu_item_id: 1,
                menu_item_name: "Burger",
                menu_item_price: 15.99,
                quantity: 2,
                total_price: 31.98,
                created_at: new Date().toISOString(),
              },
            ],
            customer: { name: "Server Customer" },
            diningOption: "indoor" as const,
            status: "open_ticket" as const,
            calculations: {
              subtotal: 31.98,
              vatAmount: 2.4,
              serviceChargeAmount: 1.6,
              customChargesTotal: 0,
              total: 35.98,
            },
            customCharges: [],
            timestamps: {
              created: new Date(),
              lastModified: new Date(),
              savedAsTicket: new Date(),
            },
          },
          status: "pending_payment" as const,
          priority: "normal" as const,
          createdBy: "server-staff",
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          paymentStatus: "pending" as const,
        },
      ];

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ tickets: serverTickets }),
        } as Response)
      );

      const orderStore = useOrderStore.getState();

      // Trigger sync
      await act(async () => {
        await orderStore.syncWithServer();
      });

      // Verify tickets were loaded from server
      const { openTickets } = useOrderStore.getState();
      expect(openTickets).toHaveLength(1);
      expect(openTickets[0].ticketNumber).toBe("TKT-SERVER-001");
      expect(openTickets[0].createdBy).toBe("server-staff");
    });

    it("should handle offline/online scenarios", async () => {
      const orderStore = useOrderStore.getState();

      // Set offline status
      act(() => {
        orderStore.setOnlineStatus(false);
      });

      // Create order while offline
      act(() => {
        orderStore.addItem(mockMenuItems[0]);
      });

      // Save as ticket (should queue operation)
      await act(async () => {
        await orderStore.saveAsOpenTicket();
      });

      // Verify operation was queued
      const { operationQueue } = useOrderStore.getState();
      expect(operationQueue).toHaveLength(1);
      expect(operationQueue[0].type).toBe("create");

      // Come back online
      act(() => {
        orderStore.setOnlineStatus(true);
      });

      // Verify queue processing is triggered
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/tickets",
          expect.objectContaining({
            method: "POST",
          })
        );
      });
    });

    it("should maintain proper ticket sorting", async () => {
      const orderStore = useOrderStore.getState();

      // Create tickets with different statuses and timestamps
      const tickets = [
        {
          id: "ticket-1",
          status: "completed" as const,
          createdAt: new Date(Date.now() - 3000),
        },
        {
          id: "ticket-2",
          status: "pending_payment" as const,
          createdAt: new Date(Date.now() - 2000),
        },
        {
          id: "ticket-3",
          status: "preparing" as const,
          createdAt: new Date(Date.now() - 1000),
        },
        {
          id: "ticket-4",
          status: "pending_payment" as const,
          createdAt: new Date(Date.now() - 4000),
        },
      ];

      // Add tickets to store
      act(() => {
        useOrderStore.setState({
          openTickets: tickets.map((t) => ({
            ...t,
            ticketNumber: `TKT-${t.id}`,
            orderState: {
              id: t.id,
              items: [],
              customer: {},
              diningOption: "indoor" as const,
              status: "open_ticket" as const,
              calculations: {
                subtotal: 0,
                vatAmount: 0,
                serviceChargeAmount: 0,
                customChargesTotal: 0,
                total: 0,
              },
              customCharges: [],
              timestamps: {
                created: t.createdAt,
                lastModified: t.createdAt,
              },
            },
            priority: "normal" as const,
            createdBy: "staff-1",
            lastModified: t.createdAt,
            paymentStatus: "pending" as const,
          })),
        });
      });

      // Get sorted tickets
      const sortedTickets = orderStore.getSortedTickets();

      // Verify sorting: pending_payment first (oldest first), then preparing, then completed
      expect(sortedTickets[0].id).toBe("ticket-4"); // oldest pending_payment
      expect(sortedTickets[1].id).toBe("ticket-2"); // newer pending_payment
      expect(sortedTickets[2].id).toBe("ticket-3"); // preparing
      expect(sortedTickets[3].id).toBe("ticket-1"); // completed
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle API failures gracefully", async () => {
      const orderStore = useOrderStore.getState();

      // Mock API failure
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error("Network error"))
      );

      // Create order
      act(() => {
        orderStore.addItem(mockMenuItems[0]);
      });

      // Attempt to save as ticket (should fail)
      await act(async () => {
        try {
          await orderStore.saveAsOpenTicket();
        } catch (error) {
          // Expected to fail
        }
      });

      // Verify ticket was still created locally
      const { openTickets } = useOrderStore.getState();
      expect(openTickets).toHaveLength(1);

      // Verify it's marked as conflicted (needs sync)
      const { conflictedTickets } = useOrderStore.getState();
      expect(conflictedTickets).toHaveLength(1);
    });

    it("should retry failed operations", async () => {
      const orderStore = useOrderStore.getState();

      // Set offline to queue operations
      act(() => {
        orderStore.setOnlineStatus(false);
      });

      // Create operation
      act(() => {
        orderStore.queueOperation({
          type: "create",
          data: { test: "data" },
        });
      });

      // Mock first attempt to fail, second to succeed
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response);
      });

      // Come back online and process queue
      act(() => {
        orderStore.setOnlineStatus(true);
      });

      // Wait for retry
      await waitFor(
        () => {
          expect(attemptCount).toBeGreaterThan(1);
        },
        { timeout: 10000 }
      );

      // Verify operation was eventually successful
      await waitFor(() => {
        const { operationQueue } = useOrderStore.getState();
        expect(operationQueue).toHaveLength(0);
      });
    });
  });

  describe("Performance and Memory Management", () => {
    it("should handle large numbers of tickets efficiently", async () => {
      const orderStore = useOrderStore.getState();

      // Create many tickets
      const manyTickets = Array.from({ length: 100 }, (_, i) => ({
        id: `ticket-${i}`,
        ticketNumber: `TKT-${i.toString().padStart(3, "0")}`,
        orderState: {
          id: `ticket-${i}`,
          items: [
            {
              id: `item-${i}`,
              order_id: `ticket-${i}`,
              menu_item_id: 1,
              menu_item_name: "Test Item",
              menu_item_price: 10.0,
              quantity: 1,
              total_price: 10.0,
              created_at: new Date().toISOString(),
            },
          ],
          customer: { name: `Customer ${i}` },
          diningOption: "indoor" as const,
          status: "open_ticket" as const,
          calculations: {
            subtotal: 10.0,
            vatAmount: 0.75,
            serviceChargeAmount: 0.5,
            customChargesTotal: 0,
            total: 11.25,
          },
          customCharges: [],
          timestamps: {
            created: new Date(Date.now() - i * 1000),
            lastModified: new Date(Date.now() - i * 1000),
          },
        },
        status: (i % 4 === 0
          ? "pending_payment"
          : i % 4 === 1
          ? "preparing"
          : i % 4 === 2
          ? "ready"
          : "completed") as const,
        priority: "normal" as const,
        createdBy: "staff-1",
        createdAt: new Date(Date.now() - i * 1000),
        lastModified: new Date(Date.now() - i * 1000),
        paymentStatus: "pending" as const,
      }));

      // Add all tickets at once
      const startTime = performance.now();

      act(() => {
        useOrderStore.setState({ openTickets: manyTickets });
      });

      // Test sorting performance
      const sortedTickets = orderStore.getSortedTickets();
      const endTime = performance.now();

      // Verify all tickets are present and sorted correctly
      expect(sortedTickets).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms

      // Verify sorting is correct
      const pendingTickets = sortedTickets.filter(
        (t) => t.status === "pending_payment"
      );
      expect(pendingTickets.length).toBeGreaterThan(0);

      // First few should be pending_payment tickets
      expect(
        sortedTickets
          .slice(0, pendingTickets.length)
          .every((t) => t.status === "pending_payment")
      ).toBe(true);
    });
  });
});
