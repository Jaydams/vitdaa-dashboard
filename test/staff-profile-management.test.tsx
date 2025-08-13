import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StaffProfileManagement from "../app/(dashboard)/staff/_components/StaffProfileManagement";
import { Staff } from "../types/staff";

// Mock fetch
global.fetch = vi.fn();

// Mock staff data
const mockStaff: Staff = {
  id: "123",
  business_id: "456",
  first_name: "John",
  last_name: "Doe",
  email: "john.doe@example.com",
  phone_number: "+1234567890",
  pin_hash: "hashed_pin",
  role: "reception",
  permissions: ["read:orders"],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  date_of_birth: "1990-01-01",
  address: {
    street: "123 Main St",
    city: "Anytown",
    state: "CA",
    postal_code: "12345",
    country: "USA",
  },
  emergency_contact_name: "Jane Doe",
  emergency_contact_phone: "+0987654321",
  emergency_contact_relationship: "spouse",
  employment_start_date: "2023-01-01",
  department: "Front Desk",
  employee_id: "EMP001",
  notes: "Great employee",
  profile_image_url: "https://example.com/profile.jpg",
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

describe("StaffProfileManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders staff profile information correctly", () => {
    render(<StaffProfileManagement staffId="123" staff={mockStaff} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("john.doe@example.com")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("+1234567890")).toBeInTheDocument();
  });

  it("shows edit button and allows editing", async () => {
    render(<StaffProfileManagement staffId="123" staff={mockStaff} />, {
      wrapper: createWrapper(),
    });

    const editButton = screen.getByText("Edit Profile");
    expect(editButton).toBeInTheDocument();

    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  it("displays address information correctly", () => {
    render(<StaffProfileManagement staffId="123" staff={mockStaff} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByDisplayValue("123 Main St")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Anytown")).toBeInTheDocument();
    expect(screen.getByDisplayValue("CA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12345")).toBeInTheDocument();
    expect(screen.getByDisplayValue("USA")).toBeInTheDocument();
  });

  it("displays emergency contact information", () => {
    render(<StaffProfileManagement staffId="123" staff={mockStaff} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+0987654321")).toBeInTheDocument();
  });

  it("displays employment information", () => {
    render(<StaffProfileManagement staffId="123" staff={mockStaff} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByDisplayValue("EMP001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Front Desk")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2023-01-01")).toBeInTheDocument();
  });

  it("displays employment history section", () => {
    render(<StaffProfileManagement staffId="123" staff={mockStaff} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Employment History")).toBeInTheDocument();
    expect(screen.getByText("reception")).toBeInTheDocument();
    expect(screen.getByText("Current Position")).toBeInTheDocument();
  });

  it("handles form submission", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStaff),
    });
    global.fetch = mockFetch;

    render(<StaffProfileManagement staffId="123" staff={mockStaff} />, {
      wrapper: createWrapper(),
    });

    // Click edit button
    fireEvent.click(screen.getByText("Edit Profile"));

    // Wait for edit mode
    await waitFor(() => {
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    // Change first name
    const firstNameInput = screen.getByDisplayValue("John");
    fireEvent.change(firstNameInput, { target: { value: "Johnny" } });

    // Submit form
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/staff/123", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"first_name":"Johnny"'),
      });
    });
  });
});
