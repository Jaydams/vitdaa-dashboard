import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createPerformanceReview,
  updatePerformanceReview,
  getStaffPerformanceReviews,
  getLatestPerformanceReview,
  getStaffPerformanceTrend,
  updateReviewGoal,
  addReviewAchievement,
} from "@/lib/staff-performance-data";
import {
  StaffPerformanceReview,
  PerformanceMetric,
  Goal,
  Achievement,
} from "@/types/staff";

// Create a comprehensive mock that handles all the chaining patterns
const createMockChain = () => {
  const mockSingle = vi.fn();
  const mockLimit = vi.fn(() => ({ single: mockSingle }));
  const mockOrder = vi.fn(() => ({ limit: mockLimit }));

  // Create a recursive eq function that can handle multiple chaining
  const createEqChain = (depth: number = 0): unknown => {
    const mockEq = vi.fn(() => {
      if (depth < 3) {
        return {
          eq: createEqChain(depth + 1),
          order: mockOrder,
          limit: mockLimit,
          single: mockSingle,
          select: vi.fn(() => ({ single: mockSingle })),
        };
      } else {
        return {
          order: mockOrder,
          limit: mockLimit,
          single: mockSingle,
          select: vi.fn(() => ({ single: mockSingle })),
        };
      }
    });
    return mockEq;
  };

  const mockEq = createEqChain();
  const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockDelete = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    delete: mockDelete,
  }));

  return {
    mockSingle,
    mockLimit,
    mockOrder,
    mockEq,
    mockSelect,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockFrom,
  };
};

const mocks = createMockChain();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: mocks.mockFrom,
  })),
}));

describe("Performance Management System", () => {
  const mockBusinessId = "business_123";
  const mockStaffId = "staff_123";
  const mockReviewerId = "reviewer_123";

  const mockPerformanceMetrics: PerformanceMetric[] = [
    {
      name: "Quality of Work",
      score: 4,
      max_score: 5,
      comments: "Excellent work",
    },
    {
      name: "Productivity",
      score: 4,
      max_score: 5,
      comments: "Very productive",
    },
    {
      name: "Communication",
      score: 5,
      max_score: 5,
      comments: "Great communication",
    },
  ];

  const mockGoals: Goal[] = [
    {
      id: "goal_1",
      title: "Improve customer service",
      description: "Reduce response time to under 2 minutes",
      target_date: "2024-12-31",
      status: "in_progress",
      progress_percentage: 75,
    },
  ];

  const mockAchievements: Achievement[] = [
    {
      id: "achievement_1",
      title: "Employee of the Month",
      description: "Outstanding performance in March",
      date_achieved: "2024-03-15",
      recognition_type: "award",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mocks).forEach((mock) => {
      if (typeof mock === "function") {
        mock.mockReset();
      }
    });

    // Recreate the chain for each test
    const newMocks = createMockChain();
    Object.assign(mocks, newMocks);
  });

  describe("Performance Review Creation", () => {
    it("should create a new performance review", async () => {
      const mockReview: StaffPerformanceReview = {
        id: "review_123",
        staff_id: mockStaffId,
        business_id: mockBusinessId,
        reviewer_id: mockReviewerId,
        review_period_start: "2024-01-01",
        review_period_end: "2024-06-30",
        overall_rating: 4.2,
        performance_metrics: mockPerformanceMetrics,
        goals: mockGoals,
        achievements: mockAchievements,
        areas_for_improvement: "Could improve time management",
        comments: "Overall excellent performance",
        status: "draft",
        created_at: "2024-07-01T00:00:00Z",
        updated_at: "2024-07-01T00:00:00Z",
      };

      mocks.mockSingle.mockResolvedValue({
        data: mockReview,
        error: null,
      });

      const result = await createPerformanceReview(
        mockStaffId,
        mockBusinessId,
        mockReviewerId,
        {
          review_period_start: "2024-01-01",
          review_period_end: "2024-06-30",
          overall_rating: 4.2,
          performance_metrics: mockPerformanceMetrics,
          goals: mockGoals,
          achievements: mockAchievements,
          areas_for_improvement: "Could improve time management",
          comments: "Overall excellent performance",
        }
      );

      expect(result).toEqual(mockReview);
    });

    it("should handle creation errors gracefully", async () => {
      mocks.mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await createPerformanceReview(
        mockStaffId,
        mockBusinessId,
        mockReviewerId,
        {
          review_period_start: "2024-01-01",
          review_period_end: "2024-06-30",
        }
      );

      expect(result).toBeNull();
    });
  });

  describe("Performance Review Updates", () => {
    it("should update a performance review", async () => {
      const mockUpdatedReview: StaffPerformanceReview = {
        id: "review_123",
        staff_id: mockStaffId,
        business_id: mockBusinessId,
        reviewer_id: mockReviewerId,
        review_period_start: "2024-01-01",
        review_period_end: "2024-06-30",
        overall_rating: 4.5,
        performance_metrics: mockPerformanceMetrics,
        goals: mockGoals,
        achievements: mockAchievements,
        areas_for_improvement: "Updated improvement areas",
        comments: "Updated comments",
        status: "completed",
        created_at: "2024-07-01T00:00:00Z",
        updated_at: "2024-07-02T00:00:00Z",
      };

      mocks.mockSingle.mockResolvedValue({
        data: mockUpdatedReview,
        error: null,
      });

      const result = await updatePerformanceReview(
        "review_123",
        mockBusinessId,
        {
          overall_rating: 4.5,
          areas_for_improvement: "Updated improvement areas",
          comments: "Updated comments",
          status: "completed",
        }
      );

      expect(result).toEqual(mockUpdatedReview);
    });
  });

  describe("Performance Review Retrieval", () => {
    it("should get staff performance reviews", async () => {
      const mockReviews: StaffPerformanceReview[] = [
        {
          id: "review_123",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          reviewer_id: mockReviewerId,
          review_period_start: "2024-01-01",
          review_period_end: "2024-06-30",
          overall_rating: 4.2,
          performance_metrics: mockPerformanceMetrics,
          goals: mockGoals,
          achievements: mockAchievements,
          areas_for_improvement: "Could improve time management",
          comments: "Overall excellent performance",
          status: "approved",
          created_at: "2024-07-01T00:00:00Z",
          updated_at: "2024-07-01T00:00:00Z",
        },
      ];

      mocks.mockLimit.mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      const result = await getStaffPerformanceReviews(
        mockStaffId,
        mockBusinessId
      );

      expect(result).toEqual(mockReviews);
    });

    it("should get latest performance review", async () => {
      const mockLatestReview: StaffPerformanceReview = {
        id: "review_123",
        staff_id: mockStaffId,
        business_id: mockBusinessId,
        reviewer_id: mockReviewerId,
        review_period_start: "2024-01-01",
        review_period_end: "2024-06-30",
        overall_rating: 4.2,
        performance_metrics: mockPerformanceMetrics,
        goals: mockGoals,
        achievements: mockAchievements,
        areas_for_improvement: "Could improve time management",
        comments: "Overall excellent performance",
        status: "approved",
        created_at: "2024-07-01T00:00:00Z",
        updated_at: "2024-07-01T00:00:00Z",
      };

      mocks.mockSingle.mockResolvedValue({
        data: mockLatestReview,
        error: null,
      });

      const result = await getLatestPerformanceReview(
        mockStaffId,
        mockBusinessId
      );

      expect(result).toEqual(mockLatestReview);
    });
  });

  describe("Performance Trend Analysis", () => {
    it("should calculate performance trend correctly", async () => {
      const mockReviews: StaffPerformanceReview[] = [
        {
          id: "review_1",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          reviewer_id: mockReviewerId,
          review_period_start: "2024-01-01",
          review_period_end: "2024-03-31",
          overall_rating: 3.5,
          performance_metrics: [],
          goals: [],
          achievements: [],
          status: "approved",
          created_at: "2024-04-01T00:00:00Z",
          updated_at: "2024-04-01T00:00:00Z",
        },
        {
          id: "review_2",
          staff_id: mockStaffId,
          business_id: mockBusinessId,
          reviewer_id: mockReviewerId,
          review_period_start: "2024-04-01",
          review_period_end: "2024-06-30",
          overall_rating: 4.2,
          performance_metrics: [],
          goals: [],
          achievements: [],
          status: "approved",
          created_at: "2024-07-01T00:00:00Z",
          updated_at: "2024-07-01T00:00:00Z",
        },
      ];

      mocks.mockLimit.mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      const result = await getStaffPerformanceTrend(
        mockStaffId,
        mockBusinessId
      );

      expect(result).toEqual({
        trend: "improving",
        average_rating: 3.85,
        rating_change: 0.7,
        reviews_analyzed: 2,
      });
    });
  });

  describe("Goal Management", () => {
    it("should update a goal in a performance review", async () => {
      const mockCurrentReview = {
        goals: mockGoals,
      };

      const updatedGoal: Goal = {
        ...mockGoals[0],
        progress_percentage: 90,
        status: "in_progress" as const,
      };

      const mockUpdatedReview: StaffPerformanceReview = {
        id: "review_123",
        staff_id: mockStaffId,
        business_id: mockBusinessId,
        reviewer_id: mockReviewerId,
        review_period_start: "2024-01-01",
        review_period_end: "2024-06-30",
        overall_rating: 4.2,
        performance_metrics: mockPerformanceMetrics,
        goals: [updatedGoal],
        achievements: mockAchievements,
        status: "draft",
        created_at: "2024-07-01T00:00:00Z",
        updated_at: "2024-07-02T00:00:00Z",
      };

      // Mock the select call to get current review
      mocks.mockSingle.mockResolvedValueOnce({
        data: mockCurrentReview,
        error: null,
      });

      // Mock the update call
      mocks.mockSingle.mockResolvedValueOnce({
        data: mockUpdatedReview,
        error: null,
      });

      const result = await updateReviewGoal(
        "review_123",
        mockBusinessId,
        updatedGoal
      );

      expect(result).toEqual(mockUpdatedReview);
    });
  });

  describe("Achievement Management", () => {
    it("should add an achievement to a performance review", async () => {
      const newAchievement: Achievement = {
        id: "achievement_2",
        title: "Perfect Attendance",
        description: "No absences for 6 months",
        date_achieved: "2024-06-30",
        recognition_type: "milestone",
      };

      const mockCurrentReview = {
        achievements: mockAchievements,
      };

      const mockUpdatedReview: StaffPerformanceReview = {
        id: "review_123",
        staff_id: mockStaffId,
        business_id: mockBusinessId,
        reviewer_id: mockReviewerId,
        review_period_start: "2024-01-01",
        review_period_end: "2024-06-30",
        overall_rating: 4.2,
        performance_metrics: mockPerformanceMetrics,
        goals: mockGoals,
        achievements: [...mockAchievements, newAchievement],
        status: "draft",
        created_at: "2024-07-01T00:00:00Z",
        updated_at: "2024-07-02T00:00:00Z",
      };

      // Mock the select call to get current review
      mocks.mockSingle.mockResolvedValueOnce({
        data: mockCurrentReview,
        error: null,
      });

      // Mock the update call
      mocks.mockSingle.mockResolvedValueOnce({
        data: mockUpdatedReview,
        error: null,
      });

      const result = await addReviewAchievement(
        "review_123",
        mockBusinessId,
        newAchievement
      );

      expect(result).toEqual(mockUpdatedReview);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mocks.mockLimit.mockResolvedValue({
        data: null,
        error: { message: "Database connection error" },
      });

      const result = await getStaffPerformanceReviews(
        mockStaffId,
        mockBusinessId
      );

      expect(result).toEqual([]);
    });

    it("should handle missing review gracefully", async () => {
      mocks.mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" }, // No rows found
      });

      const result = await getLatestPerformanceReview(
        mockStaffId,
        mockBusinessId
      );

      expect(result).toBeNull();
    });
  });
});
