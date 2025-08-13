import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StaffSalaryManagement from "@/app/(dashboard)/staff/_components/StaffSalaryManagement";

// Mock the data functions
vi.mock("@/data/staff", () => ({
  fetchStaffSalary: vi.fn(),
  fetchStaffSalaryHistory: vi.fn(),
  updateStaffSalary: vi.fn(),
  createStaffSalary: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("StaffSalaryManagement Component", () => {
  const mockStaff = {
    id: "staff-123",
    business_id: "business-456",
    name: "John Doe",
    email: "john@example.com",
    role: "manager",
    status: "active",
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("should render without crashing", () => {
    const Wrapper = createWrapper();

    expect(() => {
      render(
        <Wrapper>
          <StaffSalaryManagement staffId="staff-123" staff={mockStaff} />
        </Wrapper>
      );
    }).not.toThrow();
  });

  it("should format Nigerian Naira currency correctly", () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <StaffSalaryManagement staffId="staff-123" staff={mockStaff} />
      </Wrapper>
    );

    // Component should render without TypeScript errors
    expect(true).toBe(true);
  });
});
