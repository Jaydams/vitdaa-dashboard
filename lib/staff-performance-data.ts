import { createClient } from "@/lib/supabase/server";
import {
  StaffPerformanceReview,
  ReviewStatus,
  PerformanceMetric,
  Goal,
  Achievement,
} from "@/types/staff";

/**
 * Creates a new performance review
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param reviewerId - The reviewer's ID (business owner)
 * @param reviewData - The review information
 * @returns The created review record or null if failed
 */
export async function createPerformanceReview(
  staffId: string,
  businessId: string,
  reviewerId: string,
  reviewData: {
    review_period_start: string;
    review_period_end: string;
    overall_rating?: number;
    performance_metrics?: PerformanceMetric[];
    goals?: Goal[];
    achievements?: Achievement[];
    areas_for_improvement?: string;
    comments?: string;
  }
): Promise<StaffPerformanceReview | null> {
  try {
    const supabase = await createClient();

    const { data: review, error } = await supabase
      .from("staff_performance_reviews")
      .insert({
        staff_id: staffId,
        business_id: businessId,
        reviewer_id: reviewerId,
        review_period_start: reviewData.review_period_start,
        review_period_end: reviewData.review_period_end,
        overall_rating: reviewData.overall_rating,
        performance_metrics: reviewData.performance_metrics || [],
        goals: reviewData.goals || [],
        achievements: reviewData.achievements || [],
        areas_for_improvement: reviewData.areas_for_improvement,
        comments: reviewData.comments,
        status: "draft" as ReviewStatus,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating performance review:", error);
      return null;
    }

    return review as StaffPerformanceReview;
  } catch (error) {
    console.error("Error creating performance review:", error);
    return null;
  }
}

/**
 * Updates a performance review
 * @param reviewId - The review ID
 * @param businessId - The business ID
 * @param updates - The fields to update
 * @returns Updated review record or null if failed
 */
export async function updatePerformanceReview(
  reviewId: string,
  businessId: string,
  updates: Partial<{
    overall_rating: number;
    performance_metrics: PerformanceMetric[];
    goals: Goal[];
    achievements: Achievement[];
    areas_for_improvement: string;
    comments: string;
    status: ReviewStatus;
  }>
): Promise<StaffPerformanceReview | null> {
  try {
    const supabase = await createClient();

    const { data: review, error } = await supabase
      .from("staff_performance_reviews")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      console.error("Error updating performance review:", error);
      return null;
    }

    return review as StaffPerformanceReview;
  } catch (error) {
    console.error("Error updating performance review:", error);
    return null;
  }
}

/**
 * Gets performance reviews for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param limit - Maximum number of reviews to return (default: 10)
 * @returns Array of performance reviews
 */
export async function getStaffPerformanceReviews(
  staffId: string,
  businessId: string,
  limit: number = 10
): Promise<StaffPerformanceReview[]> {
  try {
    const supabase = await createClient();

    const { data: reviews, error } = await supabase
      .from("staff_performance_reviews")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .order("review_period_end", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error getting staff performance reviews:", error);
      return [];
    }

    return reviews || [];
  } catch (error) {
    console.error("Error getting staff performance reviews:", error);
    return [];
  }
}

/**
 * Gets the latest performance review for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @returns Latest performance review or null if not found
 */
export async function getLatestPerformanceReview(
  staffId: string,
  businessId: string
): Promise<StaffPerformanceReview | null> {
  try {
    const supabase = await createClient();

    const { data: review, error } = await supabase
      .from("staff_performance_reviews")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("status", "approved")
      .order("review_period_end", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No review found
        return null;
      }
      console.error("Error getting latest performance review:", error);
      return null;
    }

    return review as StaffPerformanceReview;
  } catch (error) {
    console.error("Error getting latest performance review:", error);
    return null;
  }
}

/**
 * Gets all performance reviews for a business
 * @param businessId - The business ID
 * @param status - Optional status filter
 * @param limit - Maximum number of reviews to return (default: 50)
 * @returns Array of performance reviews with staff information
 */
export async function getBusinessPerformanceReviews(
  businessId: string,
  status?: ReviewStatus,
  limit: number = 50
): Promise<
  (StaffPerformanceReview & {
    staff: { first_name: string; last_name: string; role: string };
    reviewer: { first_name: string; last_name: string };
  })[]
> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("staff_performance_reviews")
      .select(
        `
        *,
        staff:staff_id (
          first_name,
          last_name,
          role
        ),
        reviewer:reviewer_id (
          first_name,
          last_name
        )
      `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error("Error getting business performance reviews:", error);
      return [];
    }

    return reviews || [];
  } catch (error) {
    console.error("Error getting business performance reviews:", error);
    return [];
  }
}

/**
 * Completes a performance review (changes status from draft to completed)
 * @param reviewId - The review ID
 * @param businessId - The business ID
 * @returns Updated review record or null if failed
 */
export async function completePerformanceReview(
  reviewId: string,
  businessId: string
): Promise<StaffPerformanceReview | null> {
  return updatePerformanceReview(reviewId, businessId, {
    status: "completed",
  });
}

/**
 * Approves a performance review (changes status from completed to approved)
 * @param reviewId - The review ID
 * @param businessId - The business ID
 * @returns Updated review record or null if failed
 */
export async function approvePerformanceReview(
  reviewId: string,
  businessId: string
): Promise<StaffPerformanceReview | null> {
  return updatePerformanceReview(reviewId, businessId, {
    status: "approved",
  });
}

/**
 * Adds or updates a goal in a performance review
 * @param reviewId - The review ID
 * @param businessId - The business ID
 * @param goal - The goal to add or update
 * @returns Updated review record or null if failed
 */
export async function updateReviewGoal(
  reviewId: string,
  businessId: string,
  goal: Goal
): Promise<StaffPerformanceReview | null> {
  try {
    const supabase = await createClient();

    // Get current review
    const { data: currentReview, error: fetchError } = await supabase
      .from("staff_performance_reviews")
      .select("goals")
      .eq("id", reviewId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !currentReview) {
      console.error("Error fetching current review:", fetchError);
      return null;
    }

    const currentGoals = (currentReview.goals as Goal[]) || [];
    const existingGoalIndex = currentGoals.findIndex((g) => g.id === goal.id);

    let updatedGoals: Goal[];
    if (existingGoalIndex >= 0) {
      // Update existing goal
      updatedGoals = [...currentGoals];
      updatedGoals[existingGoalIndex] = goal;
    } else {
      // Add new goal
      updatedGoals = [...currentGoals, goal];
    }

    return updatePerformanceReview(reviewId, businessId, {
      goals: updatedGoals,
    });
  } catch (error) {
    console.error("Error updating review goal:", error);
    return null;
  }
}

/**
 * Removes a goal from a performance review
 * @param reviewId - The review ID
 * @param businessId - The business ID
 * @param goalId - The goal ID to remove
 * @returns Updated review record or null if failed
 */
export async function removeReviewGoal(
  reviewId: string,
  businessId: string,
  goalId: string
): Promise<StaffPerformanceReview | null> {
  try {
    const supabase = await createClient();

    // Get current review
    const { data: currentReview, error: fetchError } = await supabase
      .from("staff_performance_reviews")
      .select("goals")
      .eq("id", reviewId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !currentReview) {
      console.error("Error fetching current review:", fetchError);
      return null;
    }

    const currentGoals = (currentReview.goals as Goal[]) || [];
    const updatedGoals = currentGoals.filter((g) => g.id !== goalId);

    return updatePerformanceReview(reviewId, businessId, {
      goals: updatedGoals,
    });
  } catch (error) {
    console.error("Error removing review goal:", error);
    return null;
  }
}

/**
 * Adds an achievement to a performance review
 * @param reviewId - The review ID
 * @param businessId - The business ID
 * @param achievement - The achievement to add
 * @returns Updated review record or null if failed
 */
export async function addReviewAchievement(
  reviewId: string,
  businessId: string,
  achievement: Achievement
): Promise<StaffPerformanceReview | null> {
  try {
    const supabase = await createClient();

    // Get current review
    const { data: currentReview, error: fetchError } = await supabase
      .from("staff_performance_reviews")
      .select("achievements")
      .eq("id", reviewId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !currentReview) {
      console.error("Error fetching current review:", fetchError);
      return null;
    }

    const currentAchievements =
      (currentReview.achievements as Achievement[]) || [];
    const updatedAchievements = [...currentAchievements, achievement];

    return updatePerformanceReview(reviewId, businessId, {
      achievements: updatedAchievements,
    });
  } catch (error) {
    console.error("Error adding review achievement:", error);
    return null;
  }
}

/**
 * Gets active goals for a staff member across all reviews
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @returns Array of active goals
 */
export async function getStaffActiveGoals(
  staffId: string,
  businessId: string
): Promise<Goal[]> {
  try {
    const reviews = await getStaffPerformanceReviews(staffId, businessId);
    const activeGoals: Goal[] = [];

    for (const review of reviews) {
      const goals = (review.goals as Goal[]) || [];
      const reviewActiveGoals = goals.filter(
        (goal) => goal.status === "in_progress" || goal.status === "not_started"
      );
      activeGoals.push(...reviewActiveGoals);
    }

    return activeGoals;
  } catch (error) {
    console.error("Error getting staff active goals:", error);
    return [];
  }
}

/**
 * Gets recent achievements for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param limit - Maximum number of achievements to return (default: 10)
 * @returns Array of recent achievements
 */
export async function getStaffRecentAchievements(
  staffId: string,
  businessId: string,
  limit: number = 10
): Promise<Achievement[]> {
  try {
    const reviews = await getStaffPerformanceReviews(staffId, businessId);
    const allAchievements: Achievement[] = [];

    for (const review of reviews) {
      const achievements = (review.achievements as Achievement[]) || [];
      allAchievements.push(...achievements);
    }

    // Sort by date achieved and limit
    return allAchievements
      .sort(
        (a, b) =>
          new Date(b.date_achieved).getTime() -
          new Date(a.date_achieved).getTime()
      )
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting staff recent achievements:", error);
    return [];
  }
}

/**
 * Gets performance trend for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param periodCount - Number of recent reviews to analyze (default: 3)
 * @returns Performance trend analysis
 */
export async function getStaffPerformanceTrend(
  staffId: string,
  businessId: string,
  periodCount: number = 3
): Promise<{
  trend: "improving" | "stable" | "declining";
  average_rating: number;
  rating_change: number;
  reviews_analyzed: number;
} | null> {
  try {
    const reviews = await getStaffPerformanceReviews(
      staffId,
      businessId,
      periodCount
    );

    if (reviews.length === 0) {
      return null;
    }

    // Filter only approved reviews with ratings
    const ratedReviews = reviews
      .filter((r) => r.status === "approved" && r.overall_rating !== null)
      .sort(
        (a, b) =>
          new Date(a.review_period_end).getTime() -
          new Date(b.review_period_end).getTime()
      );

    if (ratedReviews.length === 0) {
      return null;
    }

    const ratings = ratedReviews.map((r) => r.overall_rating!);
    const averageRating =
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    let trend: "improving" | "stable" | "declining" = "stable";
    let ratingChange = 0;

    if (ratedReviews.length >= 2) {
      const firstRating = ratings[0];
      const lastRating = ratings[ratings.length - 1];
      ratingChange = lastRating - firstRating;

      if (ratingChange > 0.5) {
        trend = "improving";
      } else if (ratingChange < -0.5) {
        trend = "declining";
      }
    }

    return {
      trend,
      average_rating: Math.round(averageRating * 100) / 100,
      rating_change: Math.round(ratingChange * 100) / 100,
      reviews_analyzed: ratedReviews.length,
    };
  } catch (error) {
    console.error("Error getting staff performance trend:", error);
    return null;
  }
}

/**
 * Gets performance statistics for a business
 * @param businessId - The business ID
 * @returns Performance statistics
 */
export async function getBusinessPerformanceStatistics(
  businessId: string
): Promise<{
  total_reviews: number;
  average_rating: number;
  reviews_by_status: Record<ReviewStatus, number>;
  staff_with_reviews: number;
  pending_reviews: number;
} | null> {
  try {
    const reviews = await getBusinessPerformanceReviews(businessId);

    if (reviews.length === 0) {
      return {
        total_reviews: 0,
        average_rating: 0,
        reviews_by_status: { draft: 0, completed: 0, approved: 0 },
        staff_with_reviews: 0,
        pending_reviews: 0,
      };
    }

    const totalReviews = reviews.length;
    const ratedReviews = reviews.filter((r) => r.overall_rating !== null);
    const averageRating =
      ratedReviews.length > 0
        ? ratedReviews.reduce((sum, r) => sum + r.overall_rating!, 0) /
          ratedReviews.length
        : 0;

    const reviewsByStatus: Record<ReviewStatus, number> = {
      draft: 0,
      completed: 0,
      approved: 0,
    };

    const uniqueStaff = new Set<string>();

    for (const review of reviews) {
      reviewsByStatus[review.status]++;
      uniqueStaff.add(review.staff_id);
    }

    const pendingReviews = reviewsByStatus.draft + reviewsByStatus.completed;

    return {
      total_reviews: totalReviews,
      average_rating: Math.round(averageRating * 100) / 100,
      reviews_by_status: reviewsByStatus,
      staff_with_reviews: uniqueStaff.size,
      pending_reviews: pendingReviews,
    };
  } catch (error) {
    console.error("Error getting business performance statistics:", error);
    return null;
  }
}

/**
 * Deletes a performance review
 * @param reviewId - The review ID
 * @param businessId - The business ID
 * @returns True if successful, false otherwise
 */
export async function deletePerformanceReview(
  reviewId: string,
  businessId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("staff_performance_reviews")
      .delete()
      .eq("id", reviewId)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error deleting performance review:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting performance review:", error);
    return false;
  }
}
