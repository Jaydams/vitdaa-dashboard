import { describe, it, expect, vi } from "vitest";

// Simple test to verify the functions exist and have correct structure
describe("Staff Data Access Functions", () => {
  it("should export salary management functions", async () => {
    const salaryModule = await import("@/lib/staff-salary-data");

    expect(typeof salaryModule.createStaffSalary).toBe("function");
    expect(typeof salaryModule.getCurrentStaffSalary).toBe("function");
    expect(typeof salaryModule.getStaffSalaryHistory).toBe("function");
    expect(typeof salaryModule.calculateStaffCompensation).toBe("function");
    expect(typeof salaryModule.getBusinessSalaryStatistics).toBe("function");
  });

  it("should export shift management functions", async () => {
    const shiftsModule = await import("@/lib/staff-shifts-data");

    expect(typeof shiftsModule.createStaffShift).toBe("function");
    expect(typeof shiftsModule.checkShiftConflict).toBe("function");
    expect(typeof shiftsModule.getStaffShifts).toBe("function");
    expect(typeof shiftsModule.createAttendanceRecord).toBe("function");
    expect(typeof shiftsModule.getStaffAttendanceSummary).toBe("function");
  });

  it("should export performance management functions", async () => {
    const performanceModule = await import("@/lib/staff-performance-data");

    expect(typeof performanceModule.createPerformanceReview).toBe("function");
    expect(typeof performanceModule.getStaffPerformanceReviews).toBe(
      "function"
    );
    expect(typeof performanceModule.getStaffPerformanceTrend).toBe("function");
    expect(typeof performanceModule.getBusinessPerformanceStatistics).toBe(
      "function"
    );
  });

  it("should export document management functions", async () => {
    const documentsModule = await import("@/lib/staff-documents-data");

    expect(typeof documentsModule.createStaffDocument).toBe("function");
    expect(typeof documentsModule.getStaffDocuments).toBe("function");
    expect(typeof documentsModule.getStaffComplianceStatus).toBe("function");
    expect(typeof documentsModule.getBusinessComplianceOverview).toBe(
      "function"
    );
  });

  it("should have proper function signatures", async () => {
    // Test that functions have expected parameter counts
    const salaryModule = await import("@/lib/staff-salary-data");
    const shiftsModule = await import("@/lib/staff-shifts-data");
    const performanceModule = await import("@/lib/staff-performance-data");
    const documentsModule = await import("@/lib/staff-documents-data");

    expect(salaryModule.createStaffSalary.length).toBe(3); // staffId, businessId, salaryData
    expect(shiftsModule.createStaffShift.length).toBe(3); // staffId, businessId, shiftData
    expect(performanceModule.createPerformanceReview.length).toBe(4); // staffId, businessId, reviewerId, reviewData
    expect(documentsModule.createStaffDocument.length).toBe(4); // staffId, businessId, uploadedBy, documentData
  });
});
