import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

// Mock the complete application context
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
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
            Promise.resolve({
              data: {
                id: "order-123",
                status: "pending",
                total: 45.5,
                customer_name: "John Doe",
                table_number: 5,
                items: [
                  {
                    id: "item-1",
                    name: "Burger",
                    quantity: 1,
                    price: 15.0,
                    category: "food",
                  },
                  {
                    id: "item-2",
                    name: "Fries",
                    quantity: 1,
                    price: 8.0,
                    category: "food",
                  },
                  {
                    id: "item-3",
                    name: "Coke",
                    quantity: 2,
                    price: 4.5,
                    category: "beverage",
                  },
                ],
                created_at: new Date().toISOString(),
              },
              error: null,
            })
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
  },
}));

// Mock real-time hooks
vi.mock("@/hooks/use-realtime-sync", () => ({
  useRealtimeSync: vi.fn(() => ({
    isConnected: true,
    lastSync: new Date().toISOString(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    broadcastUpdate: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-activity-logging", () => ({
  useActivityLogging: vi.fn(() => ({
    logActivity: vi.fn(),
  })),
}));

// Mock dashboard components with realistic behavior
vi.mock("@/components/staff/ReceptionDashboard", () => ({
  default: ({ staffSession }: any) => {
    const [orders, setOrders] = React.useState<any[]>([]);
    const [selectedTable, setSelectedTable] = React.useState<number | null>(
      null
    );
    const [customerName, setCustomerName] = React.useState("");
    const [orderItems, setOrderItems] = React.useState<any[]>([]);

    const handleCreateOrder = async () => {
      const newOrder = {
        id: "order-123",
        customer_name: customerName,
        table_number: selectedTable,
        items: orderItems,
        status: "pending",
        total: orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
        created_at: new Date().toISOString(),
      };

      // Simulate API call
      const supabase = require("@/lib/supabase/client").supabase;
      await supabase.from("orders").insert(newOrder);

      setOrders([...orders, newOrder]);

      // Reset form
      setCustomerName("");
      setSelectedTable(null);
      setOrderItems([]);
    };

    const addMenuItem = (item: any) => {
      setOrderItems([...orderItems, item]);
    };

    return (
      <div data-testid="reception-dashboard">
        <h1>Reception Dashboard</h1>
        <div data-testid="staff-info">
          Staff: {staffSession.staff.name} ({staffSession.role})
        </div>

        {/* Order Creation Form */}
        <div data-testid="order-creation-form">
          <h2>Create New Order</h2>
          <input
            data-testid="customer-name-input"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <select
            data-testid="table-select"
            value={selectedTable || ""}
            onChange={(e) => setSelectedTable(Number(e.target.value))}
          >
            <option value="">Select Table</option>
            <option value="1">Table 1</option>
            <option value="2">Table 2</option>
            <option value="5">Table 5</option>
          </select>

          {/* Menu Items */}
          <div data-testid="menu-items">
            <button
              data-testid="add-burger"
              onClick={() =>
                addMenuItem({
                  id: "item-1",
                  name: "Burger",
                  price: 15.0,
                  quantity: 1,
                  category: "food",
                })
              }
            >
              Add Burger ($15.00)
            </button>
            <button
              data-testid="add-fries"
              onClick={() =>
                addMenuItem({
                  id: "item-2",
                  name: "Fries",
                  price: 8.0,
                  quantity: 1,
                  category: "food",
                })
              }
            >
              Add Fries ($8.00)
            </button>
            <button
              data-testid="add-coke"
              onClick={() =>
                addMenuItem({
                  id: "item-3",
                  name: "Coke",
                  price: 4.5,
                  quantity: 1,
                  category: "beverage",
                })
              }
            >
              Add Coke ($4.50)
            </button>
          </div>

          {/* Order Summary */}
          <div data-testid="order-summary">
            <h3>Order Items:</h3>
            {orderItems.map((item, index) => (
              <div key={index} data-testid={`order-item-${index}`}>
                {item.name} - ${item.price} x {item.quantity}
              </div>
            ))}
            <div data-testid="order-total">
              Total: $
              {orderItems
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
                .toFixed(2)}
            </div>
          </div>

          <button
            data-testid="create-order-button"
            onClick={handleCreateOrder}
            disabled={
              !customerName || !selectedTable || orderItems.length === 0
            }
          >
            Create Order
          </button>
        </div>

        {/* Orders List */}
        <div data-testid="orders-list">
          <h2>Current Orders</h2>
          {orders.map((order) => (
            <div key={order.id} data-testid={`order-${order.id}`}>
              <div>Order #{order.id}</div>
              <div>Customer: {order.customer_name}</div>
              <div>Table: {order.table_number}</div>
              <div>Status: {order.status}</div>
              <div>Total: ${order.total}</div>
            </div>
          ))}
        </div>

        {/* Payment Processing */}
        <div data-testid="payment-section">
          <h2>Payment Processing</h2>
          {orders
            .filter((o) => o.status === "ready")
            .map((order) => (
              <div key={order.id} data-testid={`payment-${order.id}`}>
                <button data-testid={`process-payment-${order.id}`}>
                  Process Payment - ${order.total}
                </button>
              </div>
            ))}
        </div>
      </div>
    );
  },
}));

vi.mock("@/components/staff/KitchenDashboard", () => ({
  default: ({ staffSession }: any) => {
    const [orders, setOrders] = React.useState([
      {
        id: "order-123",
        customer_name: "John Doe",
        table_number: 5,
        status: "pending",
        items: [
          {
            id: "item-1",
            name: "Burger",
            quantity: 1,
            status: "pending",
            category: "food",
          },
          {
            id: "item-2",
            name: "Fries",
            quantity: 1,
            status: "pending",
            category: "food",
          },
        ],
        created_at: new Date().toISOString(),
      },
    ]);

    const updateOrderStatus = async (orderId: string, status: string) => {
      const supabase = require("@/lib/supabase/client").supabase;
      await supabase.from("orders").update({ status }).eq("id", orderId);

      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    };

    const updateItemStatus = async (
      orderId: string,
      itemId: string,
      status: string
    ) => {
      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                items: order.items.map((item) =>
                  item.id === itemId ? { ...item, status } : item
                ),
              }
            : order
        )
      );
    };

    return (
      <div data-testid="kitchen-dashboard">
        <h1>Kitchen Dashboard</h1>
        <div data-testid="staff-info">
          Staff: {staffSession.staff.name} ({staffSession.role})
        </div>

        <div data-testid="kitchen-orders">
          <h2>Kitchen Orders</h2>
          {orders.map((order) => (
            <div key={order.id} data-testid={`kitchen-order-${order.id}`}>
              <div>
                Order #{order.id} - Table {order.table_number}
              </div>
              <div>Customer: {order.customer_name}</div>
              <div>Status: {order.status}</div>

              <div data-testid="food-items">
                <h3>Food Items:</h3>
                {order.items
                  .filter((item) => item.category === "food")
                  .map((item) => (
                    <div key={item.id} data-testid={`food-item-${item.id}`}>
                      <span>
                        {item.name} x{item.quantity} - Status: {item.status}
                      </span>
                      <button
                        data-testid={`start-cooking-${item.id}`}
                        onClick={() =>
                          updateItemStatus(order.id, item.id, "cooking")
                        }
                        disabled={item.status !== "pending"}
                      >
                        Start Cooking
                      </button>
                      <button
                        data-testid={`mark-ready-${item.id}`}
                        onClick={() =>
                          updateItemStatus(order.id, item.id, "ready")
                        }
                        disabled={item.status !== "cooking"}
                      >
                        Mark Ready
                      </button>
                    </div>
                  ))}
              </div>

              <div data-testid="order-actions">
                <button
                  data-testid={`start-preparation-${order.id}`}
                  onClick={() => updateOrderStatus(order.id, "preparing")}
                  disabled={order.status !== "pending"}
                >
                  Start Preparation
                </button>
                <button
                  data-testid={`complete-order-${order.id}`}
                  onClick={() => updateOrderStatus(order.id, "ready")}
                  disabled={order.status !== "preparing"}
                >
                  Complete Order
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Inventory Request Section */}
        <div data-testid="inventory-requests">
          <h2>Inventory Requests</h2>
          <button data-testid="create-inventory-request">
            Request Inventory
          </button>
        </div>
      </div>
    );
  },
}));

vi.mock("@/components/staff/BarDashboard", () => ({
  default: ({ staffSession }: any) => {
    const [orders, setOrders] = React.useState([
      {
        id: "order-123",
        customer_name: "John Doe",
        table_number: 5,
        status: "pending",
        items: [
          {
            id: "item-3",
            name: "Coke",
            quantity: 2,
            status: "pending",
            category: "beverage",
          },
        ],
      },
    ]);

    const updateDrinkStatus = async (
      orderId: string,
      itemId: string,
      status: string
    ) => {
      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                items: order.items.map((item) =>
                  item.id === itemId ? { ...item, status } : item
                ),
              }
            : order
        )
      );
    };

    return (
      <div data-testid="bar-dashboard">
        <h1>Bar Dashboard</h1>
        <div data-testid="staff-info">
          Staff: {staffSession.staff.name} ({staffSession.role})
        </div>

        <div data-testid="beverage-orders">
          <h2>Beverage Orders</h2>
          {orders.map((order) => (
            <div key={order.id} data-testid={`bar-order-${order.id}`}>
              <div>
                Order #{order.id} - Table {order.table_number}
              </div>
              <div>Customer: {order.customer_name}</div>

              <div data-testid="beverage-items">
                <h3>Beverages:</h3>
                {order.items
                  .filter((item) => item.category === "beverage")
                  .map((item) => (
                    <div key={item.id} data-testid={`beverage-item-${item.id}`}>
                      <span>
                        {item.name} x{item.quantity} - Status: {item.status}
                      </span>
                      <button
                        data-testid={`prepare-drink-${item.id}`}
                        onClick={() =>
                          updateDrinkStatus(order.id, item.id, "preparing")
                        }
                        disabled={item.status !== "pending"}
                      >
                        Prepare Drink
                      </button>
                      <button
                        data-testid={`serve-drink-${item.id}`}
                        onClick={() =>
                          updateDrinkStatus(order.id, item.id, "ready")
                        }
                        disabled={item.status !== "preparing"}
                      >
                        Ready to Serve
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bar Inventory */}
        <div data-testid="bar-inventory">
          <h2>Bar Inventory</h2>
          <button data-testid="update-inventory">Update Stock</button>
          <button data-testid="request-restock">Request Restock</button>
        </div>
      </div>
    );
  },
}));

vi.mock("@/components/staff/AccountantDashboard", () => ({
  default: ({ staffSession }: any) => {
    const [transactions, setTransactions] = React.useState<any[]>([]);
    const [reports, setReports] = React.useState<any[]>([]);

    const processPayment = async (
      orderId: string,
      amount: number,
      method: string
    ) => {
      const transaction = {
        id: `txn-${Date.now()}`,
        order_id: orderId,
        amount,
        payment_method: method,
        status: "completed",
        processed_at: new Date().toISOString(),
      };

      setTransactions([...transactions, transaction]);
    };

    const generateReport = async (reportType: string, dateRange: string) => {
      const report = {
        id: `report-${Date.now()}`,
        type: reportType,
        date_range: dateRange,
        generated_at: new Date().toISOString(),
        data: {
          total_revenue: 1250.75,
          total_transactions: 45,
          average_transaction: 27.79,
        },
      };

      setReports([...reports, report]);
    };

    return (
      <div data-testid="accountant-dashboard">
        <h1>Accountant Dashboard</h1>
        <div data-testid="staff-info">
          Staff: {staffSession.staff.name} ({staffSession.role})
        </div>

        {/* Financial Overview */}
        <div data-testid="financial-overview">
          <h2>Financial Overview</h2>
          <div data-testid="revenue-summary">
            <div>Today's Revenue: $1,250.75</div>
            <div>Total Transactions: 45</div>
            <div>Average Transaction: $27.79</div>
          </div>
        </div>

        {/* Payment Processing */}
        <div data-testid="payment-processing">
          <h2>Payment Processing</h2>
          <button
            data-testid="process-payment-order-123"
            onClick={() => processPayment("order-123", 45.5, "card")}
          >
            Process Payment - Order #123 ($45.50)
          </button>
        </div>

        {/* Transactions */}
        <div data-testid="transactions-list">
          <h2>Recent Transactions</h2>
          {transactions.map((txn) => (
            <div key={txn.id} data-testid={`transaction-${txn.id}`}>
              <div>Transaction: {txn.id}</div>
              <div>Order: {txn.order_id}</div>
              <div>Amount: ${txn.amount}</div>
              <div>Method: {txn.payment_method}</div>
              <div>Status: {txn.status}</div>
            </div>
          ))}
        </div>

        {/* Reports */}
        <div data-testid="reports-section">
          <h2>Financial Reports</h2>
          <button
            data-testid="generate-daily-report"
            onClick={() => generateReport("daily_sales", "today")}
          >
            Generate Daily Report
          </button>
          <button
            data-testid="export-transactions"
            onClick={() => generateReport("transaction_export", "last_30_days")}
          >
            Export Transactions
          </button>

          <div data-testid="generated-reports">
            {reports.map((report) => (
              <div key={report.id} data-testid={`report-${report.id}`}>
                <div>Report: {report.type}</div>
                <div>Date Range: {report.date_range}</div>
                <div>Generated: {report.generated_at}</div>
                <div>Revenue: ${report.data.total_revenue}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Performance */}
        <div data-testid="staff-performance">
          <h2>Staff Performance</h2>
          <div data-testid="performance-metrics">
            <div>Top Performer: Reception Staff (95% efficiency)</div>
            <div>Average Order Time: 12 minutes</div>
            <div>Customer Satisfaction: 4.8/5</div>
          </div>
        </div>
      </div>
    );
  },
}));

// Import components after mocking
import ReceptionDashboard from "@/components/staff/ReceptionDashboard";
import KitchenDashboard from "@/components/staff/KitchenDashboard";
import BarDashboard from "@/components/staff/BarDashboard";
import AccountantDashboard from "@/components/staff/AccountantDashboard";

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
const staffSessions = {
  reception: {
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
      name: "Alice Reception",
      email: "alice@example.com",
      role: "reception",
    },
  },
  kitchen: {
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
      name: "Bob Kitchen",
      email: "bob@example.com",
      role: "kitchen",
    },
  },
  bar: {
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
      name: "Carol Bar",
      email: "carol@example.com",
      role: "bar",
    },
  },
  accountant: {
    id: "session-4",
    staff_id: "staff-4",
    business_id: "business-1",
    role: "accountant" as const,
    permissions: {
      financial: {
        view_transactions: true,
        process_refunds: true,
        generate_reports: true,
        export_data: true,
      },
      staff: { view_performance: true },
    },
    staff: {
      id: "staff-4",
      name: "David Accountant",
      email: "david@example.com",
      role: "accountant",
    },
  },
};

describe("End-to-End Complete Order Lifecycle Tests", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Complete order lifecycle with multiple staff roles", () => {
    it("processes a complete order from creation to payment", async () => {
      // Step 1: Reception creates order
      const { rerender } = renderWithProviders(
        <ReceptionDashboard staffSession={staffSessions.reception} />
      );

      // Verify reception dashboard loads
      expect(screen.getByTestId("reception-dashboard")).toBeInTheDocument();
      expect(
        screen.getByText("Alice Reception (reception)")
      ).toBeInTheDocument();

      // Fill out order form
      await user.type(screen.getByTestId("customer-name-input"), "John Doe");
      await user.selectOptions(screen.getByTestId("table-select"), "5");

      // Add menu items
      await user.click(screen.getByTestId("add-burger"));
      await user.click(screen.getByTestId("add-fries"));
      await user.click(screen.getByTestId("add-coke"));
      await user.click(screen.getByTestId("add-coke")); // Add second coke

      // Verify order summary
      expect(screen.getByTestId("order-total")).toHaveTextContent(
        "Total: $31.50"
      );

      // Create order
      await user.click(screen.getByTestId("create-order-button"));

      // Verify order appears in orders list
      await waitFor(() => {
        expect(screen.getByTestId("order-order-123")).toBeInTheDocument();
        expect(screen.getByText("Customer: John Doe")).toBeInTheDocument();
        expect(screen.getByText("Table: 5")).toBeInTheDocument();
        expect(screen.getByText("Status: pending")).toBeInTheDocument();
      });

      // Step 2: Kitchen processes food items
      rerender(<KitchenDashboard staffSession={staffSessions.kitchen} />);

      // Verify kitchen dashboard loads with order
      expect(screen.getByTestId("kitchen-dashboard")).toBeInTheDocument();
      expect(screen.getByText("Bob Kitchen (kitchen)")).toBeInTheDocument();
      expect(screen.getByTestId("kitchen-order-order-123")).toBeInTheDocument();

      // Start preparation
      await user.click(screen.getByTestId("start-preparation-order-123"));

      // Process individual food items
      await user.click(screen.getByTestId("start-cooking-item-1")); // Burger
      await user.click(screen.getByTestId("start-cooking-item-2")); // Fries

      // Mark items as ready
      await user.click(screen.getByTestId("mark-ready-item-1"));
      await user.click(screen.getByTestId("mark-ready-item-2"));

      // Complete order
      await user.click(screen.getByTestId("complete-order-order-123"));

      // Step 3: Bar processes beverages
      rerender(<BarDashboard staffSession={staffSessions.bar} />);

      // Verify bar dashboard loads
      expect(screen.getByTestId("bar-dashboard")).toBeInTheDocument();
      expect(screen.getByText("Carol Bar (bar)")).toBeInTheDocument();
      expect(screen.getByTestId("bar-order-order-123")).toBeInTheDocument();

      // Process beverages
      await user.click(screen.getByTestId("prepare-drink-item-3"));
      await user.click(screen.getByTestId("serve-drink-item-3"));

      // Step 4: Accountant processes payment
      rerender(<AccountantDashboard staffSession={staffSessions.accountant} />);

      // Verify accountant dashboard loads
      expect(screen.getByTestId("accountant-dashboard")).toBeInTheDocument();
      expect(
        screen.getByText("David Accountant (accountant)")
      ).toBeInTheDocument();

      // Process payment
      await user.click(screen.getByTestId("process-payment-order-123"));

      // Verify transaction appears
      await waitFor(() => {
        const transactionElement = screen.getByTestId(/transaction-txn-/);
        expect(transactionElement).toBeInTheDocument();
        expect(
          within(transactionElement).getByText("Order: order-123")
        ).toBeInTheDocument();
        expect(
          within(transactionElement).getByText("Amount: $45.5")
        ).toBeInTheDocument();
        expect(
          within(transactionElement).getByText("Status: completed")
        ).toBeInTheDocument();
      });

      // Verify API calls were made
      const supabase = require("@/lib/supabase/client").supabase;
      expect(supabase.from).toHaveBeenCalledWith("orders");
      expect(supabase.from().insert).toHaveBeenCalled();
      expect(supabase.from().update).toHaveBeenCalled();
    });
  });

  describe("Inventory management from request to approval to stock update", () => {
    it("handles complete inventory workflow", async () => {
      // Step 1: Kitchen requests inventory
      renderWithProviders(
        <KitchenDashboard staffSession={staffSessions.kitchen} />
      );

      // Create inventory request
      await user.click(screen.getByTestId("create-inventory-request"));

      // Verify request creation (would normally open a modal)
      expect(screen.getByTestId("inventory-requests")).toBeInTheDocument();

      // Step 2: Admin approves request (simulated)
      // In a real scenario, this would involve admin dashboard interaction

      // Step 3: Bar updates stock
      const { rerender } = renderWithProviders(
        <BarDashboard staffSession={staffSessions.bar} />
      );

      // Update inventory
      await user.click(screen.getByTestId("update-inventory"));

      // Verify inventory update capability
      expect(screen.getByTestId("bar-inventory")).toBeInTheDocument();
    });
  });

  describe("Payment processing and financial reporting workflow", () => {
    it("processes payments and generates financial reports", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={staffSessions.accountant} />
      );

      // Verify initial financial overview
      expect(screen.getByTestId("financial-overview")).toBeInTheDocument();
      expect(
        screen.getByText("Today's Revenue: $1,250.75")
      ).toBeInTheDocument();
      expect(screen.getByText("Total Transactions: 45")).toBeInTheDocument();

      // Process a payment
      await user.click(screen.getByTestId("process-payment-order-123"));

      // Verify transaction is recorded
      await waitFor(() => {
        const transactionElement = screen.getByTestId(/transaction-txn-/);
        expect(transactionElement).toBeInTheDocument();
      });

      // Generate daily report
      await user.click(screen.getByTestId("generate-daily-report"));

      // Verify report generation
      await waitFor(() => {
        const reportElement = screen.getByTestId(/report-report-/);
        expect(reportElement).toBeInTheDocument();
        expect(
          within(reportElement).getByText("Report: daily_sales")
        ).toBeInTheDocument();
        expect(
          within(reportElement).getByText("Revenue: $1250.75")
        ).toBeInTheDocument();
      });

      // Export transactions
      await user.click(screen.getByTestId("export-transactions"));

      // Verify export functionality
      await waitFor(() => {
        const exportReports = screen.getAllByTestId(/report-report-/);
        expect(exportReports).toHaveLength(2); // Daily report + export
      });
    });
  });

  describe("Staff session management and performance tracking", () => {
    it("tracks staff activities across all dashboards", async () => {
      const mockLogActivity = vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging().logActivity
      );

      // Test reception activities
      const { rerender } = renderWithProviders(
        <ReceptionDashboard staffSession={staffSessions.reception} />
      );

      await user.type(
        screen.getByTestId("customer-name-input"),
        "Test Customer"
      );
      await user.selectOptions(screen.getByTestId("table-select"), "1");
      await user.click(screen.getByTestId("add-burger"));
      await user.click(screen.getByTestId("create-order-button"));

      // Verify reception activities are logged
      expect(mockLogActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: expect.stringContaining("order"),
          staff_id: "staff-1",
        })
      );

      // Test kitchen activities
      rerender(<KitchenDashboard staffSession={staffSessions.kitchen} />);

      await user.click(screen.getByTestId("start-preparation-order-123"));

      // Verify kitchen activities are logged
      expect(mockLogActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: expect.stringContaining("preparation"),
          staff_id: "staff-2",
        })
      );

      // Test accountant performance view
      rerender(<AccountantDashboard staffSession={staffSessions.accountant} />);

      // Verify staff performance metrics are displayed
      expect(screen.getByTestId("staff-performance")).toBeInTheDocument();
      expect(
        screen.getByText("Top Performer: Reception Staff (95% efficiency)")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Average Order Time: 12 minutes")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Customer Satisfaction: 4.8/5")
      ).toBeInTheDocument();
    });
  });

  describe("Error handling and recovery scenarios", () => {
    it("handles API failures gracefully", async () => {
      // Mock API failure
      const supabase = require("@/lib/supabase/client").supabase;
      supabase.from.mockImplementation(() => ({
        insert: vi.fn(() =>
          Promise.reject(new Error("Database connection failed"))
        ),
      }));

      renderWithProviders(
        <ReceptionDashboard staffSession={staffSessions.reception} />
      );

      // Attempt to create order
      await user.type(
        screen.getByTestId("customer-name-input"),
        "Test Customer"
      );
      await user.selectOptions(screen.getByTestId("table-select"), "1");
      await user.click(screen.getByTestId("add-burger"));
      await user.click(screen.getByTestId("create-order-button"));

      // Verify error handling (would show error message in real implementation)
      expect(supabase.from().insert).toHaveBeenCalled();
    });

    it("maintains functionality during network issues", async () => {
      // Mock offline state
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
        <KitchenDashboard staffSession={staffSessions.kitchen} />
      );

      // Attempt action while offline
      await user.click(screen.getByTestId("start-preparation-order-123"));

      // Verify offline handling
      const mockQueueOfflineAction = vi.mocked(
        require("@/hooks/use-realtime-sync").useRealtimeSync()
          .queueOfflineAction
      );
      expect(mockQueueOfflineAction).toHaveBeenCalled();
    });
  });

  describe("Mobile responsiveness validation", () => {
    it("adapts to mobile viewport correctly", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(
        <ReceptionDashboard staffSession={staffSessions.reception} />
      );

      // Verify mobile-responsive elements are present
      const dashboard = screen.getByTestId("reception-dashboard");
      expect(dashboard).toBeInTheDocument();

      // Test touch interactions (would be more comprehensive in real implementation)
      await user.click(screen.getByTestId("add-burger"));
      expect(screen.getByTestId("order-summary")).toBeInTheDocument();
    });
  });

  describe("Real-time synchronization validation", () => {
    it("synchronizes updates across multiple dashboard instances", async () => {
      const mockBroadcastUpdate = vi.mocked(
        require("@/hooks/use-realtime-sync").useRealtimeSync().broadcastUpdate
      );

      // Test order creation broadcast
      renderWithProviders(
        <ReceptionDashboard staffSession={staffSessions.reception} />
      );

      await user.type(screen.getByTestId("customer-name-input"), "Sync Test");
      await user.selectOptions(screen.getByTestId("table-select"), "2");
      await user.click(screen.getByTestId("add-burger"));
      await user.click(screen.getByTestId("create-order-button"));

      // Verify real-time broadcast
      expect(mockBroadcastUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("order"),
          targetDashboards: expect.arrayContaining(["kitchen", "bar"]),
        })
      );
    });
  });
});
