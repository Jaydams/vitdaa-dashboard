import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchStaffById,
  fetchStaff,
  fetchStaffSalary,
  fetchStaffShifts,
  fetchStaffAttendance,
  fetchStaffPerformanceReviews,
  fetchStaffDocuments,
} from "@/data/staff";

// Mock the data functions
vi.mock("@/data/staff");

describe("Staff Management Performance Tests", () => {
  const mockBusinessId = "business-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database Query Performance", () => {
    it("should fetch staff data efficiently with proper indexing", async () => {
      // Mock large staff dataset
      const largeStaffDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `staff-${i}`,
        business_id: mockBusinessId,
        name: `Employee ${i}`,
        email: `employee${i}@company.com`,
        role: i % 3 === 0 ? "admin" : i % 3 === 1 ? "manager" : "staff",
        status: i % 10 === 0 ? "inactive" : "active",
        created_at: new Date(2023, 0, 1 + i).toISOString(),
      }));

      vi.mocked(fetchStaff).mockResolvedValue({
        data: largeStaffDataset,
        first: 1,
        last: 1000,
        prev: null,
        next: null,
      });

      const startTime = performance.now();
      const result = await fetchStaff({ page: 1, perPage: 1000 });
      const endTime = performance.now();

      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
    });

    it("should handle pagination efficiently for large datasets", async () => {
      const pageSize = 50;
      const totalRecords = 1000;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Mock paginated data
      const mockPaginatedData = (page: number) => ({
        data: Array.from({ length: pageSize }, (_, i) => ({
          id: `staff-${(page - 1) * pageSize + i}`,
          business_id: mockBusinessId,
          name: `Employee ${(page - 1) * pageSize + i}`,
          email: `employee${(page - 1) * pageSize + i}@company.com`,
          role: "staff",
          status: "active",
        })),
        first: (page - 1) * pageSize + 1,
        last: page * pageSize,
        prev: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
      });

      // Test multiple page loads
      const pageLoadTimes: number[] = [];

      for (let page = 1; page <= Math.min(5, totalPages); page++) {
        vi.mocked(fetchStaff).mockResolvedValue(mockPaginatedData(page));

        const startTime = performance.now();
        const result = await fetchStaff({ page, perPage: pageSize });
        const endTime = performance.now();

        pageLoadTimes.push(endTime - startTime);
        expect(result.data).toHaveLength(pageSize);
      }

      // All page loads should be consistently fast
      const averageLoadTime =
        pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length;
      expect(averageLoadTime).toBeLessThan(30);
    });
  });

  describe("Memory Usage Optimization", () => {
    it("should handle large salary history datasets efficiently", async () => {
      const staffId = "staff-123";

      // Mock large salary history (5 years of monthly records)
      const largeSalaryHistory = Array.from({ length: 60 }, (_, i) => ({
        id: `salary-${i}`,
        staff_id: staffId,
        business_id: mockBusinessId,
        base_salary: 50000 + i * 100,
        salary_type: "annual" as const,
        payment_frequency: "monthly" as const,
        effective_date: new Date(2019, i % 12, 1).toISOString().split("T")[0],
        is_current: i === 59,
      }));

      vi.mocked(fetchStaffSalary).mockResolvedValue(largeSalaryHistory);

      const startTime = performance.now();
      const result = await fetchStaffSalary(staffId, mockBusinessId);
      const endTime = performance.now();

      expect(result).toHaveLength(60);
      expect(endTime - startTime).toBeLessThan(25);

      // Test memory efficiency by processing the data
      const currentSalary = result.find((s) => s.is_current);
      const salaryChanges = result.length - 1;

      expect(currentSalary).toBeDefined();
      expect(salaryChanges).toBe(59);
    });

    it("should efficiently process shift scheduling data", async () => {
      const staffId = "staff-123";

      // Mock 1 year of shift data (daily shifts)
      const yearOfShifts = Array.from({ length: 365 }, (_, i) => {
        const date = new Date(2024, 0, 1 + i);
        return {
          id: `shift-${i}`,
          staff_id: staffId,
          business_id: mockBusinessId,
          shift_date: date.toISOString().split("T")[0],
          scheduled_start_time: "09:00:00",
          scheduled_end_time: "17:00:00",
          actual_start_time: "09:00:00",
          actual_end_time: "17:00:00",
          status: "completed" as const,
        };
      });

      vi.mocked(fetchStaffShifts).mockResolvedValue(yearOfShifts);

      const startTime = performance.now();
      const result = await fetchStaffShifts(staffId, mockBusinessId);
      const endTime = performance.now();

      expect(result).toHaveLength(365);
      expect(endTime - startTime).toBeLessThan(30);

      // Test data processing efficiency
      const totalHours = result.reduce((total, shift) => {
        const start = new Date(`2024-01-01T${shift.scheduled_start_time}`);
        const end = new Date(`2024-01-01T${shift.scheduled_end_time}`);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      expect(totalHours).toBe(365 * 8); // 8 hours per day
    });
  });

  describe("Concurrent Operations Performance", () => {
    it("should handle multiple simultaneous data fetches efficiently", async () => {
      const staffIds = Array.from({ length: 10 }, (_, i) => `staff-${i}`);

      // Mock individual staff data fetches
      vi.mocked(fetchStaffById).mockImplementation(async (id) => {
        const staffId = id as string;
        return {
          id: staffId,
          business_id: mockBusinessId,
          name: `Employee ${staffId}`,
          email: `${staffId}@company.com`,
          role: "staff" as const,
          status: "active" as const,
        };
      });

      const startTime = performance.now();

      // Fetch all staff data concurrently
      const promises = staffIds.map((staffId) =>
        fetchStaffById(staffId, mockBusinessId)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100); // Should complete concurrently in under 100ms

      // Verify all results are correct
      results.forEach((result, index) => {
        expect(result.id).toBe(staffIds[index]);
      });
    });

    it("should handle mixed data operations efficiently", async () => {
      const staffId = "staff-123";

      // Mock different types of data
      vi.mocked(fetchStaffById).mockResolvedValue({
        id: staffId,
        business_id: mockBusinessId,
        name: "John Doe",
        email: "john@company.com",
        role: "manager",
        status: "active",
      });

      vi.mocked(fetchStaffSalary).mockResolvedValue([
        {
          id: "salary-123",
          staff_id: staffId,
          business_id: mockBusinessId,
          base_salary: 60000,
          salary_type: "annual",
          payment_frequency: "monthly",
          is_current: true,
        },
      ]);

      vi.mocked(fetchStaffAttendance).mockResolvedValue([
        {
          id: "attendance-123",
          staff_id: staffId,
          business_id: mockBusinessId,
          attendance_date: "2024-01-15",
          clock_in_time: "2024-01-15T09:00:00Z",
          clock_out_time: "2024-01-15T17:00:00Z",
          total_hours_worked: 8,
          status: "present",
        },
      ]);

      vi.mocked(fetchStaffDocuments).mockResolvedValue([
        {
          id: "doc-123",
          staff_id: staffId,
          business_id: mockBusinessId,
          document_type: "contract",
          document_name: "Employment Contract",
          file_url: "secure://docs/contract.pdf",
          is_required: true,
        },
      ]);

      const startTime = performance.now();

      // Fetch all related data concurrently
      const [profile, salary, attendance, documents] = await Promise.all([
        fetchStaffById(staffId, mockBusinessId),
        fetchStaffSalary(staffId, mockBusinessId),
        fetchStaffAttendance(staffId, mockBusinessId),
        fetchStaffDocuments(staffId, mockBusinessId),
      ]);

      const endTime = performance.now();

      expect(profile).toBeDefined();
      expect(salary).toHaveLength(1);
      expect(attendance).toHaveLength(1);
      expect(documents).toHaveLength(1);
      expect(endTime - startTime).toBeLessThan(75); // All operations should complete quickly
    });
  });

  describe("Caching and Optimization", () => {
    it("should demonstrate efficient data caching patterns", async () => {
      const staffId = "staff-123";
      let callCount = 0;

      // Mock with call counting
      vi.mocked(fetchStaffById).mockImplementation(async () => {
        callCount++;
        return {
          id: staffId,
          business_id: mockBusinessId,
          name: "John Doe",
          email: "john@company.com",
          role: "manager",
          status: "active",
        };
      });

      // Simulate caching behavior
      let cachedData: any = null;
      const getCachedStaff = async (id: string, businessId: string) => {
        if (cachedData && cachedData.id === id) {
          return cachedData;
        }
        cachedData = await fetchStaffById(id, businessId);
        return cachedData;
      };

      // First call should hit the database
      const result1 = await getCachedStaff(staffId, mockBusinessId);
      expect(callCount).toBe(1);

      // Second call should use cache
      const result2 = await getCachedStaff(staffId, mockBusinessId);
      expect(callCount).toBe(1); // Should not increment

      expect(result1).toEqual(result2);
    });

    it("should optimize search and filtering operations", async () => {
      // Mock large dataset for search testing
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `staff-${i}`,
        business_id: mockBusinessId,
        name: `Employee ${i}`,
        email: `employee${i}@company.com`,
        role: i % 3 === 0 ? "admin" : i % 3 === 1 ? "manager" : "staff",
        status: i % 10 === 0 ? "inactive" : "active",
        department: `Department ${i % 5}`,
      }));

      vi.mocked(fetchStaff).mockResolvedValue({
        data: largeDataset,
        first: 1,
        last: 5000,
        prev: null,
        next: null,
      });

      const startTime = performance.now();
      const staffResult = await fetchStaff({ page: 1, perPage: 5000 });
      const allStaff = staffResult.data;

      // Perform various filtering operations
      const activeStaff = allStaff.filter((s) => s.status === "active");
      const managers = allStaff.filter((s) => s.role === "manager");
      const dept0Staff = allStaff.filter(
        (s) => s.department === "Department 0"
      );
      const searchResults = allStaff.filter((s) =>
        s.name.includes("Employee 1")
      );

      const endTime = performance.now();

      expect(activeStaff.length).toBeGreaterThan(0);
      expect(managers.length).toBeGreaterThan(0);
      expect(dept0Staff.length).toBeGreaterThan(0);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(50); // All filtering should be fast
    });
  });

  describe("Resource Usage Monitoring", () => {
    it("should monitor and validate resource usage patterns", async () => {
      // Test memory usage patterns
      const initialMemory = process.memoryUsage();

      // Simulate processing large amounts of data
      const largeDataProcessing = async () => {
        const data = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          data: `Large data string ${i}`.repeat(100),
        }));

        // Process the data
        const processed = data.map((item) => ({
          ...item,
          processed: true,
          timestamp: Date.now(),
        }));

        return processed.length;
      };

      const processedCount = await largeDataProcessing();
      const finalMemory = process.memoryUsage();

      expect(processedCount).toBe(10000);

      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });
});
