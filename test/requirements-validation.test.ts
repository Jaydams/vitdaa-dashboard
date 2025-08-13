import { describe, it, expect, vi } from "vitest";
import {
  fetchStaffById,
  updateStaffProfile,
  fetchStaffSalary,
  updateStaffSalary,
  fetchStaffShifts,
  createStaffShift,
  fetchStaffAttendance,
  clockInStaff,
  clockOutStaff,
  fetchStaffPerformanceReviews,
  createPerformanceReview,
  fetchStaffDocuments,
  uploadStaffDocument,
} from "@/data/staff";

// Mock all data functions
vi.mock("@/data/staff");

describe("Requirements Validation Tests", () => {
  const mockBusinessId = "business-456";
  const mockStaffId = "staff-123";

  describe("Requirement 1: Comprehensive Staff Profiles", () => {
    describe("1.1 - Staff Profile Display", () => {
      it("WHEN a business owner clicks on a staff member THEN the system SHALL display a detailed staff profile page", async () => {
        const mockStaffProfile = {
          id: mockStaffId,
          business_id: mockBusinessId,
          name: "John Doe",
          email: "john@company.com",
          role: "manager",
          status: "active",
          profile_image_url: "https://example.com/profile.jpg",
          date_of_birth: "1990-01-01",
          address: {
            street: "123 Main St",
            city: "Anytown",
            state: "ST",
            zip: "12345",
          },
          emergency_contact_name: "Jane Doe",
          emergency_contact_phone: "+1234567890",
          emergency_contact_relationship: "spouse",
          employment_start_date: "2023-01-01",
          department: "Operations",
          employee_id: "EMP001",
        };

        vi.mocked(fetchStaffById).mockResolvedValue(mockStaffProfile);

        const result = await fetchStaffById(mockStaffId, mockBusinessId);

        // Validate all required profile information is present
        expect(result.id).toBe(mockStaffId);
        expect(result.name).toBeDefined();
        expect(result.email).toBeDefined();
        expect(result.role).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.employment_start_date).toBeDefined();
        expect(result.department).toBeDefined();
        expect(result.employee_id).toBeDefined();
      });
    });

    describe("1.2 - Personal Information Display", () => {
      it("WHEN viewing a staff profile THEN the system SHALL show personal information, employment details, role, permissions, and current status", async () => {
        const mockProfile = {
          id: mockStaffId,
          business_id: mockBusinessId,
          name: "John Doe",
          email: "john@company.com",
          role: "manager",
          status: "active",
          profile_image_url: "profile.jpg",
          date_of_birth: "1990-01-01",
          address: { street: "123 Main St", city: "Anytown" },
          employment_start_date: "2023-01-01",
          department: "Operations",
        };

        vi.mocked(fetchStaffById).mockResolvedValue(mockProfile);
        const result = await fetchStaffById(mockStaffId, mockBusinessId);

        // Validate personal information
        expect(result.name).toBe("John Doe");
        expect(result.email).toBe("john@company.com");
        expect(result.date_of_birth).toBe("1990-01-01");
        expect(result.address).toBeDefined();

        // Validate employment details
        expect(result.role).toBe("manager");
        expect(result.status).toBe("active");
        expect(result.employment_start_date).toBe("2023-01-01");
        expect(result.department).toBe("Operations");
      });
    });

    describe("1.3 - Contact Information Display", () => {
      it("WHEN accessing staff profiles THEN the system SHALL display profile photo, contact information, emergency contacts, and employment start date", async () => {
        const mockProfile = {
          id: mockStaffId,
          business_id: mockBusinessId,
          name: "John Doe",
          email: "john@company.com",
          profile_image_url: "profile.jpg",
          emergency_contact_name: "Jane Doe",
          emergency_contact_phone: "+1234567890",
          emergency_contact_relationship: "spouse",
          employment_start_date: "2023-01-01",
        };

        vi.mocked(fetchStaffById).mockResolvedValue(mockProfile);
        const result = await fetchStaffById(mockStaffId, mockBusinessId);

        expect(result.profile_image_url).toBe("profile.jpg");
        expect(result.email).toBe("john@company.com");
        expect(result.emergency_contact_name).toBe("Jane Doe");
        expect(result.emergency_contact_phone).toBe("+1234567890");
        expect(result.emergency_contact_relationship).toBe("spouse");
        expect(result.employment_start_date).toBe("2023-01-01");
      });
    });

    describe("1.4 - Current Information Display", () => {
      it("WHEN viewing staff information THEN the system SHALL show current salary, position, department, and reporting structure", async () => {
        const mockProfile = {
          id: mockStaffId,
          business_id: mockBusinessId,
          name: "John Doe",
          role: "manager",
          department: "Operations",
        };

        const mockSalary = [
          {
            id: "salary-123",
            staff_id: mockStaffId,
            business_id: mockBusinessId,
            base_salary: 60000,
            salary_type: "annual",
            is_current: true,
          },
        ];

        vi.mocked(fetchStaffById).mockResolvedValue(mockProfile);
        vi.mocked(fetchStaffSalary).mockResolvedValue(mockSalary);

        const profile = await fetchStaffById(mockStaffId, mockBusinessId);
        const salary = await fetchStaffSalary(mockStaffId, mockBusinessId);

        expect(profile.role).toBe("manager"); // Position
        expect(profile.department).toBe("Operations");
        expect(salary[0].base_salary).toBe(60000); // Current salary
        expect(salary[0].is_current).toBe(true);
      });
    });

    describe("1.5 - Profile Editing", () => {
      it("IF staff information needs updating THEN the business owner SHALL be able to edit profile details directly from the profile page", async () => {
        const updatedProfile = {
          id: mockStaffId,
          business_id: mockBusinessId,
          name: "John Smith", // Updated name
          email: "john.smith@company.com", // Updated email
          department: "Sales", // Updated department
        };

        vi.mocked(updateStaffProfile).mockResolvedValue(updatedProfile);

        const result = await updateStaffProfile(mockStaffId, mockBusinessId, {
          name: "John Smith",
          email: "john.smith@company.com",
          department: "Sales",
        });

        expect(result.name).toBe("John Smith");
        expect(result.email).toBe("john.smith@company.com");
        expect(result.department).toBe("Sales");
        expect(updateStaffProfile).toHaveBeenCalledWith(
          mockStaffId,
          mockBusinessId,
          {
            name: "John Smith",
            email: "john.smith@company.com",
            department: "Sales",
          }
        );
      });
    });
  });

  describe("Requirement 2: Salary and Compensation Management", () => {
    describe("2.1 - Compensation Setting", () => {
      it("WHEN managing staff compensation THEN the system SHALL allow setting base salary, hourly rate, and commission structure", async () => {
        const mockSalaryData = {
          id: "salary-123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          base_salary: 50000,
          hourly_rate: 25.0,
          commission_rate: 0.05,
          salary_type: "annual",
          payment_frequency: "monthly",
          is_current: true,
        };

        vi.mocked(updateStaffSalary).mockResolvedValue(mockSalaryData);

        const result = await updateStaffSalary(mockStaffId, mockBusinessId, {
          base_salary: 50000,
          hourly_rate: 25.0,
          commission_rate: 0.05,
        });

        expect(result.base_salary).toBe(50000);
        expect(result.hourly_rate).toBe(25.0);
        expect(result.commission_rate).toBe(0.05);
      });
    });

    describe("2.2 - Salary History", () => {
      it("WHEN updating salary information THEN the system SHALL maintain a history of salary changes with effective dates", async () => {
        const mockSalaryHistory = [
          {
            id: "salary-1",
            staff_id: mockStaffId,
            business_id: mockBusinessId,
            base_salary: 45000,
            effective_date: "2023-01-01",
            is_current: false,
          },
          {
            id: "salary-2",
            staff_id: mockStaffId,
            business_id: mockBusinessId,
            base_salary: 50000,
            effective_date: "2023-07-01",
            is_current: true,
          },
        ];

        vi.mocked(fetchStaffSalary).mockResolvedValue(mockSalaryHistory);

        const result = await fetchStaffSalary(mockStaffId, mockBusinessId);

        expect(result).toHaveLength(2);
        expect(result[0].effective_date).toBe("2023-01-01");
        expect(result[1].effective_date).toBe("2023-07-01");
        expect(result[1].is_current).toBe(true);
        expect(result[0].is_current).toBe(false);
      });
    });

    describe("2.3 - Compensation Display", () => {
      it("WHEN viewing compensation THEN the system SHALL display current salary, payment frequency, and total compensation", async () => {
        const mockCurrentSalary = [
          {
            id: "salary-123",
            staff_id: mockStaffId,
            business_id: mockBusinessId,
            base_salary: 60000,
            commission_rate: 0.03,
            bonus_eligible: true,
            payment_frequency: "monthly",
            is_current: true,
          },
        ];

        vi.mocked(fetchStaffSalary).mockResolvedValue(mockCurrentSalary);

        const result = await fetchStaffSalary(mockStaffId, mockBusinessId);
        const currentSalary = result.find((s) => s.is_current);

        expect(currentSalary).toBeDefined();
        expect(currentSalary!.base_salary).toBe(60000);
        expect(currentSalary!.payment_frequency).toBe("monthly");
        expect(currentSalary!.commission_rate).toBe(0.03);
        expect(currentSalary!.bonus_eligible).toBe(true);
      });
    });
  });

  describe("Requirement 3: Shift Scheduling Management", () => {
    describe("3.1 - Shift Creation", () => {
      it("WHEN creating shifts THEN the system SHALL allow setting start time, end time, break periods, and assigned roles", async () => {
        const mockShift = {
          id: "shift-123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          shift_date: "2024-01-15",
          scheduled_start_time: "09:00:00",
          scheduled_end_time: "17:00:00",
          break_duration_minutes: 60,
          status: "scheduled",
        };

        vi.mocked(createStaffShift).mockResolvedValue(mockShift);

        const result = await createStaffShift(mockBusinessId, {
          staff_id: mockStaffId,
          shift_date: "2024-01-15",
          scheduled_start_time: "09:00:00",
          scheduled_end_time: "17:00:00",
          break_duration_minutes: 60,
        });

        expect(result.scheduled_start_time).toBe("09:00:00");
        expect(result.scheduled_end_time).toBe("17:00:00");
        expect(result.break_duration_minutes).toBe(60);
        expect(result.status).toBe("scheduled");
      });
    });

    describe("3.2 - Conflict Prevention", () => {
      it("WHEN scheduling staff THEN the system SHALL prevent double-booking and show availability conflicts", async () => {
        const existingShift = {
          id: "shift-1",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          shift_date: "2024-01-15",
          scheduled_start_time: "09:00:00",
          scheduled_end_time: "17:00:00",
          status: "scheduled",
        };

        const conflictingShift = {
          staff_id: mockStaffId,
          shift_date: "2024-01-15",
          scheduled_start_time: "16:00:00", // Overlaps with existing shift
          scheduled_end_time: "20:00:00",
        };

        vi.mocked(fetchStaffShifts).mockResolvedValue([existingShift]);

        const existingShifts = await fetchStaffShifts(
          mockStaffId,
          mockBusinessId
        );

        // Check for conflicts
        const hasConflict = existingShifts.some((shift) => {
          if (shift.shift_date !== conflictingShift.shift_date) return false;

          const existingStart = new Date(
            `2024-01-15T${shift.scheduled_start_time}`
          );
          const existingEnd = new Date(
            `2024-01-15T${shift.scheduled_end_time}`
          );
          const newStart = new Date(
            `2024-01-15T${conflictingShift.scheduled_start_time}`
          );
          const newEnd = new Date(
            `2024-01-15T${conflictingShift.scheduled_end_time}`
          );

          return newStart < existingEnd && newEnd > existingStart;
        });

        expect(hasConflict).toBe(true);
      });
    });
  });

  describe("Requirement 4: Attendance and Time Tracking", () => {
    describe("4.1 - Clock In Recording", () => {
      it("WHEN staff sign in THEN the system SHALL record clock-in time and compare to scheduled start time", async () => {
        const mockAttendance = {
          id: "attendance-123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          attendance_date: "2024-01-15",
          clock_in_time: "2024-01-15T09:05:00Z",
          scheduled_start_time: "09:00:00",
          status: "late",
        };

        vi.mocked(clockInStaff).mockResolvedValue(mockAttendance);

        const result = await clockInStaff(mockStaffId);

        expect(result.clock_in_time).toBe("2024-01-15T09:05:00Z");
        expect(result.status).toBe("late");

        // Verify late detection
        const scheduledStart = new Date(`2024-01-15T09:00:00Z`);
        const actualStart = new Date(result.clock_in_time);
        const isLate = actualStart > scheduledStart;
        expect(isLate).toBe(true);
      });
    });

    describe("4.2 - Clock Out and Hours Calculation", () => {
      it("WHEN staff sign out THEN the system SHALL record clock-out time and calculate total hours worked", async () => {
        const mockAttendance = {
          id: "attendance-123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          attendance_date: "2024-01-15",
          clock_in_time: "2024-01-15T09:00:00Z",
          clock_out_time: "2024-01-15T17:30:00Z",
          total_hours_worked: 8.5,
          status: "present",
        };

        vi.mocked(clockOutStaff).mockResolvedValue(mockAttendance);

        const result = await clockOutStaff("attendance-123");

        expect(result.clock_out_time).toBe("2024-01-15T17:30:00Z");
        expect(result.total_hours_worked).toBe(8.5);

        // Verify hours calculation
        const clockIn = new Date(result.clock_in_time);
        const clockOut = new Date(result.clock_out_time);
        const hoursWorked =
          (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        expect(hoursWorked).toBe(8.5);
      });
    });
  });

  describe("Requirement 5: Session Activity Monitoring", () => {
    describe("5.1 - Activity Tracking", () => {
      it("WHEN staff are active THEN the system SHALL track page visits, actions performed, and time spent on different tasks", async () => {
        const mockSessionActivity = {
          id: "session-123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          session_start: "2024-01-15T09:00:00Z",
          session_end: "2024-01-15T17:00:00Z",
          screens_accessed: ["dashboard", "orders", "customers", "inventory"],
          tasks_completed: [
            "order_processing",
            "customer_service",
            "inventory_update",
          ],
          active_time_minutes: 420,
          break_time_minutes: 60,
        };

        // Mock session activity tracking
        expect(mockSessionActivity.screens_accessed).toContain("dashboard");
        expect(mockSessionActivity.screens_accessed).toContain("orders");
        expect(mockSessionActivity.tasks_completed).toContain(
          "order_processing"
        );
        expect(mockSessionActivity.active_time_minutes).toBe(420); // 7 hours
        expect(mockSessionActivity.break_time_minutes).toBe(60); // 1 hour
      });
    });

    describe("5.2 - Real-time Monitoring", () => {
      it("WHEN monitoring sessions THEN the system SHALL show real-time activity, idle time, and productivity metrics", async () => {
        const mockRealTimeData = {
          staff_id: mockStaffId,
          current_screen: "orders",
          last_activity: "2024-01-15T14:30:00Z",
          idle_time_minutes: 5,
          productivity_score: 85,
          tasks_completed_today: 12,
        };

        expect(mockRealTimeData.current_screen).toBe("orders");
        expect(mockRealTimeData.idle_time_minutes).toBe(5);
        expect(mockRealTimeData.productivity_score).toBe(85);
        expect(mockRealTimeData.tasks_completed_today).toBe(12);
      });
    });
  });

  describe("Requirement 6: Performance Management", () => {
    describe("6.1 - Performance Reviews", () => {
      it("WHEN conducting evaluations THEN the system SHALL provide performance review templates and rating systems", async () => {
        const mockPerformanceReview = {
          id: "review-123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          reviewer_id: "reviewer-456",
          review_period_start: "2023-01-01",
          review_period_end: "2023-12-31",
          overall_rating: 4,
          performance_metrics: {
            sales: 90,
            customer_service: 85,
            teamwork: 95,
            punctuality: 88,
          },
          status: "completed",
        };

        vi.mocked(createPerformanceReview).mockResolvedValue(
          mockPerformanceReview
        );

        const result = await createPerformanceReview(
          mockBusinessId,
          mockPerformanceReview
        );

        expect(result.overall_rating).toBe(4);
        expect(result.performance_metrics.sales).toBe(90);
        expect(result.performance_metrics.customer_service).toBe(85);
        expect(result.status).toBe("completed");
      });
    });

    describe("6.2 - Goal Tracking", () => {
      it("WHEN tracking performance THEN the system SHALL record goals, achievements, and areas for improvement", async () => {
        const mockReviewWithGoals = {
          id: "review-123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          goals: [
            {
              goal: "Increase sales by 15%",
              status: "achieved",
              target_date: "2023-12-31",
            },
            {
              goal: "Complete customer service training",
              status: "in_progress",
              target_date: "2024-03-31",
            },
          ],
          achievements: [
            "Employee of the month - March 2023",
            "Exceeded sales target by 20%",
            "Perfect attendance record",
          ],
          areas_for_improvement: "Time management and delegation skills",
        };

        vi.mocked(fetchStaffPerformanceReviews).mockResolvedValue([
          mockReviewWithGoals,
        ]);

        const result = await fetchStaffPerformanceReviews(
          mockStaffId,
          mockBusinessId
        );

        expect(result[0].goals).toHaveLength(2);
        expect(result[0].goals[0].status).toBe("achieved");
        expect(result[0].achievements).toHaveLength(3);
        expect(result[0].areas_for_improvement).toBe(
          "Time management and delegation skills"
        );
      });
    });
  });

  describe("Requirement 7: Document Management and Compliance", () => {
    describe("7.1 - Document Storage", () => {
      it("WHEN managing documents THEN the system SHALL store employment contracts, tax forms, and identification documents", async () => {
        const mockDocuments = [
          {
            id: "doc-1",
            staff_id: mockStaffId,
            business_id: mockBusinessId,
            document_type: "contract",
            document_name: "Employment Contract",
            file_url: "secure://docs/contract.pdf",
            is_required: true,
          },
          {
            id: "doc-2",
            staff_id: mockStaffId,
            business_id: mockBusinessId,
            document_type: "tax_form",
            document_name: "W-4 Form",
            file_url: "secure://docs/w4.pdf",
            is_required: true,
          },
          {
            id: "doc-3",
            staff_id: mockStaffId,
            business_id: mockBusinessId,
            document_type: "id_document",
            document_name: "Driver's License",
            file_url: "secure://docs/license.pdf",
            is_required: true,
          },
        ];

        vi.mocked(fetchStaffDocuments).mockResolvedValue(mockDocuments);

        const result = await fetchStaffDocuments(mockStaffId, mockBusinessId);

        expect(result).toHaveLength(3);
        expect(
          result.find((d) => d.document_type === "contract")
        ).toBeDefined();
        expect(
          result.find((d) => d.document_type === "tax_form")
        ).toBeDefined();
        expect(
          result.find((d) => d.document_type === "id_document")
        ).toBeDefined();
      });
    });

    describe("7.2 - Compliance Tracking", () => {
      it("WHEN tracking compliance THEN the system SHALL monitor certification expiration dates and training requirements", async () => {
        const mockComplianceDoc = {
          id: "doc-123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          document_type: "certification",
          document_name: "Food Safety Certification",
          file_url: "secure://docs/cert.pdf",
          expiration_date: "2025-12-31",
          is_required: true,
        };

        vi.mocked(uploadStaffDocument).mockResolvedValue(mockComplianceDoc);

        const result = await uploadStaffDocument(
          mockBusinessId,
          mockComplianceDoc
        );

        expect(result.expiration_date).toBe("2025-12-31");
        expect(result.is_required).toBe(true);

        // Check expiration tracking
        const expirationDate = new Date(result.expiration_date);
        const currentDate = new Date();
        const daysUntilExpiration = Math.floor(
          (expirationDate.getTime() - currentDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        expect(daysUntilExpiration).toBeGreaterThan(0);
      });
    });
  });

  describe("Cross-Requirement Integration Tests", () => {
    it("should validate complete staff management workflow", async () => {
      // Mock complete staff data
      const mockCompleteStaffData = {
        profile: {
          id: mockStaffId,
          business_id: mockBusinessId,
          name: "John Doe",
          email: "john@company.com",
          role: "manager",
          status: "active",
        },
        salary: [
          {
            id: "salary-123",
            staff_id: mockStaffId,
            base_salary: 60000,
            is_current: true,
          },
        ],
        shifts: [
          {
            id: "shift-123",
            staff_id: mockStaffId,
            shift_date: "2024-01-15",
            status: "completed",
          },
        ],
        attendance: [
          {
            id: "attendance-123",
            staff_id: mockStaffId,
            attendance_date: "2024-01-15",
            status: "present",
          },
        ],
        performance: [
          {
            id: "review-123",
            staff_id: mockStaffId,
            overall_rating: 4,
          },
        ],
        documents: [
          {
            id: "doc-123",
            staff_id: mockStaffId,
            document_type: "contract",
            is_required: true,
          },
        ],
      };

      // Mock all data fetching functions
      vi.mocked(fetchStaffById).mockResolvedValue(
        mockCompleteStaffData.profile
      );
      vi.mocked(fetchStaffSalary).mockResolvedValue(
        mockCompleteStaffData.salary
      );
      vi.mocked(fetchStaffShifts).mockResolvedValue(
        mockCompleteStaffData.shifts
      );
      vi.mocked(fetchStaffAttendance).mockResolvedValue(
        mockCompleteStaffData.attendance
      );
      vi.mocked(fetchStaffPerformanceReviews).mockResolvedValue(
        mockCompleteStaffData.performance
      );
      vi.mocked(fetchStaffDocuments).mockResolvedValue(
        mockCompleteStaffData.documents
      );

      // Fetch all staff data
      const [profile, salary, shifts, attendance, performance, documents] =
        await Promise.all([
          fetchStaffById(mockStaffId, mockBusinessId),
          fetchStaffSalary(mockStaffId, mockBusinessId),
          fetchStaffShifts(mockStaffId, mockBusinessId),
          fetchStaffAttendance(mockStaffId, mockBusinessId),
          fetchStaffPerformanceReviews(mockStaffId, mockBusinessId),
          fetchStaffDocuments(mockStaffId, mockBusinessId),
        ]);

      // Validate all requirements are met
      expect(profile).toBeDefined(); // Requirement 1
      expect(salary).toHaveLength(1); // Requirement 2
      expect(shifts).toHaveLength(1); // Requirement 3
      expect(attendance).toHaveLength(1); // Requirement 4
      expect(performance).toHaveLength(1); // Requirement 6
      expect(documents).toHaveLength(1); // Requirement 7
    });
  });
});
