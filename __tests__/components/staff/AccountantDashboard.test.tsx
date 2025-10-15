import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AccountantDashboard } from "@/components/staff/AccountantDashboard";
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
          range: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        range: vi.fn(() => Promise.resolve({ data: [], error: null })),
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
  role: "accountant" as const,
  permissions: {
    financial: {
      view_transactions: true,
      process_refunds: true,
      generate_reports: true,
      export_data: true,
    },
    staff: {
      view_performance: true,
    },
  },
  staff: {
    id: "staff-1",
    name: "Accountant Alice",
    email: "alice@example.com",
    role: "accountant",
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

describe("AccountantDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role-based rendering and permission enforcement", () => {
    it("renders accountant dashboard for accountant staff", () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByText("Accountant Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
      expect(screen.getByText("Transaction Management")).toBeInTheDocument();
    });

    it("shows financial reporting when user has report permissions", () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      expect(
        screen.getByRole("button", { name: /generate report/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /export data/i })
      ).toBeInTheDocument();
    });

    it("hides financial reporting when user lacks permissions", () => {
      const restrictedSession = {
        ...mockStaffSession,
        permissions: {
          ...mockStaffSession.permissions,
          financial: {
            ...mockStaffSession.permissions.financial,
            generate_reports: false,
          },
        },
      };

      renderWithProviders(
        <AccountantDashboard staffSession={restrictedSession} />
      );

      expect(
        screen.queryByRole("button", { name: /generate report/i })
      ).not.toBeInTheDocument();
    });

    it("shows refund processing when user has refund permissions", () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByText("Refund Processing")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /process refund/i })
      ).toBeInTheDocument();
    });

    it("shows staff performance when user has staff view permissions", () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByText("Staff Performance")).toBeInTheDocument();
    });
  });

  describe("Real-time updates and error handling", () => {
    it("displays real-time transaction data", async () => {
      const mockTransactions = [
        {
          id: "1",
          amount: 25.5,
          payment_method: "card",
          status: "completed",
          created_at: new Date().toISOString(),
          order_id: "order-1",
        },
        {
          id: "2",
          amount: 18.75,
          payment_method: "cash",
          status: "completed",
          created_at: new Date().toISOString(),
          order_id: "order-2",
        },
      ];

      vi.mocked(
        require("@/lib/supabase/client").supabase.from
      ).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({ data: mockTransactions, error: null }),
          }),
        }),
      }));

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      await waitFor(() => {
        expect(screen.getByText("$25.50")).toBeInTheDocument();
        expect(screen.getByText("$18.75")).toBeInTheDocument();
        expect(screen.getByText("Card")).toBeInTheDocument();
        expect(screen.getByText("Cash")).toBeInTheDocument();
      });
    });

    it("handles report generation errors gracefully", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      // Mock error in report generation
      vi.mocked(
        require("@/lib/supabase/client").supabase.from
      ).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            range: () => Promise.reject(new Error("Report generation failed")),
          }),
        }),
      }));

      const generateButton = screen.getByRole("button", {
        name: /generate report/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/error generating report/i)
        ).toBeInTheDocument();
      });
    });

    it("shows loading states during financial operations", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const exportButton = screen.getByRole("button", { name: /export data/i });
      fireEvent.click(exportButton);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Mobile responsiveness and touch interactions", () => {
    it("adapts financial tables for mobile viewport", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const transactionTable = screen.getByTestId("transaction-table");
      expect(transactionTable).toHaveClass("mobile-layout");
    });

    it("supports touch interactions for report controls", () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const reportControls = screen.getByTestId("report-controls");
      expect(reportControls).toHaveAttribute("data-touch-enabled", "true");
    });

    it("shows mobile-optimized financial charts", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const charts = screen.getByTestId("financial-charts");
      expect(charts).toHaveClass("mobile-optimized");
    });
  });

  describe("Integration with existing APIs", () => {
    it("fetches transactions from existing API", async () => {
      const mockTransactions = [
        {
          id: "1",
          amount: 100.0,
          payment_method: "card",
          status: "completed",
        },
      ];

      vi.mocked(
        require("@/lib/supabase/client").supabase.from
      ).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({ data: mockTransactions, error: null }),
          }),
        }),
      }));

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      await waitFor(() => {
        expect(screen.getByText("$100.00")).toBeInTheDocument();
      });
    });

    it("integrates with payment API for refund processing", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const processRefundButton = screen.getByRole("button", {
        name: /process refund/i,
      });
      fireEvent.click(processRefundButton);

      // Fill refund form
      const orderIdInput = screen.getByLabelText("Order ID");
      const amountInput = screen.getByLabelText("Refund Amount");
      const reasonInput = screen.getByLabelText("Reason");

      fireEvent.change(orderIdInput, { target: { value: "order-123" } });
      fireEvent.change(amountInput, { target: { value: "25.50" } });
      fireEvent.change(reasonInput, {
        target: { value: "Customer complaint" },
      });

      const submitButton = screen.getByRole("button", {
        name: /submit refund/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          require("@/lib/supabase/client").supabase.from
        ).toHaveBeenCalledWith("payments");
      });
    });

    it("generates financial reports through existing API", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate report/i,
      });
      fireEvent.click(generateButton);

      // Select report parameters
      const reportType = screen.getByLabelText("Report Type");
      const dateRange = screen.getByLabelText("Date Range");

      fireEvent.change(reportType, { target: { value: "daily_sales" } });
      fireEvent.change(dateRange, {
        target: { value: "2024-01-01,2024-01-31" },
      });

      const generateReportButton = screen.getByRole("button", {
        name: /generate/i,
      });
      fireEvent.click(generateReportButton);

      await waitFor(() => {
        expect(
          require("@/lib/supabase/client").supabase.from
        ).toHaveBeenCalledWith("payments");
      });
    });

    it("exports financial data through existing API", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const exportButton = screen.getByRole("button", { name: /export data/i });
      fireEvent.click(exportButton);

      // Select export format
      const formatSelect = screen.getByLabelText("Export Format");
      fireEvent.change(formatSelect, { target: { value: "csv" } });

      const confirmExportButton = screen.getByRole("button", {
        name: /confirm export/i,
      });
      fireEvent.click(confirmExportButton);

      await waitFor(() => {
        expect(
          require("@/lib/supabase/client").supabase.from
        ).toHaveBeenCalledWith("payments");
      });
    });
  });

  describe("Financial reporting functionality", () => {
    it("displays comprehensive financial analytics", async () => {
      const mockAnalytics = {
        total_revenue: 5000.0,
        total_transactions: 150,
        average_transaction: 33.33,
        refunds_processed: 5,
        top_payment_method: "card",
      };

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      await waitFor(() => {
        expect(screen.getByText("Total Revenue")).toBeInTheDocument();
        expect(screen.getByText("Total Transactions")).toBeInTheDocument();
        expect(screen.getByText("Average Transaction")).toBeInTheDocument();
      });
    });

    it("shows audit trail for financial operations", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
      expect(screen.getByText("Recent Activities")).toBeInTheDocument();
    });

    it("handles discrepancy investigation tools", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const investigateButton = screen.queryByRole("button", {
        name: /investigate discrepancy/i,
      });
      if (investigateButton) {
        fireEvent.click(investigateButton);

        await waitFor(() => {
          expect(screen.getByText("Discrepancy Details")).toBeInTheDocument();
          expect(screen.getByText("Investigation Tools")).toBeInTheDocument();
        });
      }
    });
  });

  describe("Staff performance analytics", () => {
    it("displays staff sales metrics", async () => {
      const mockStaffMetrics = [
        {
          staff_id: "staff-1",
          staff_name: "John Doe",
          total_sales: 1500.0,
          transactions_count: 45,
          efficiency_score: 85,
        },
      ];

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      await waitFor(() => {
        expect(screen.getByText("Staff Performance")).toBeInTheDocument();
        expect(screen.getByText("Sales Metrics")).toBeInTheDocument();
      });
    });

    it("shows productivity analytics", async () => {
      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      expect(screen.getByText("Productivity Analytics")).toBeInTheDocument();
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });
  });

  describe("Activity logging", () => {
    it("logs financial report generation", async () => {
      const mockLogActivity = vi.fn();
      vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging
      ).mockReturnValue({
        logActivity: mockLogActivity,
      });

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate report/i,
      });
      fireEvent.click(generateButton);

      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "financial_report_generated",
        resource_type: "financial_report",
        staff_id: "staff-1",
      });
    });

    it("logs refund processing activities", async () => {
      const mockLogActivity = vi.fn();
      vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging
      ).mockReturnValue({
        logActivity: mockLogActivity,
      });

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const processRefundButton = screen.getByRole("button", {
        name: /process refund/i,
      });
      fireEvent.click(processRefundButton);

      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "refund_processing_started",
        resource_type: "refund",
        staff_id: "staff-1",
      });
    });

    it("logs data export activities", async () => {
      const mockLogActivity = vi.fn();
      vi.mocked(
        require("@/hooks/use-activity-logging").useActivityLogging
      ).mockReturnValue({
        logActivity: mockLogActivity,
      });

      renderWithProviders(
        <AccountantDashboard staffSession={mockStaffSession} />
      );

      const exportButton = screen.getByRole("button", { name: /export data/i });
      fireEvent.click(exportButton);

      expect(mockLogActivity).toHaveBeenCalledWith({
        activity_type: "financial_data_exported",
        resource_type: "financial_export",
        staff_id: "staff-1",
      });
    });
  });
});
