import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  createPerformanceReview,
  getStaffPerformanceReviews,
  getBusinessPerformanceReviews,
} from "@/lib/staff-performance-data";
import {
  StaffPerformanceReview,
  PerformanceMetric,
  Goal,
  Achievement,
} from "@/types/staff";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");

    if (staffId) {
      // Get reviews for specific staff member
      const reviews = await getStaffPerformanceReviews(
        staffId,
        businessId,
        limit ? parseInt(limit) : undefined
      );
      return NextResponse.json({ reviews });
    } else {
      // Get all reviews for business
      const reviews = await getBusinessPerformanceReviews(
        businessId,
        status as any,
        limit ? parseInt(limit) : undefined
      );
      return NextResponse.json({ reviews });
    }
  } catch (error) {
    console.error("Error fetching performance reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance reviews" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      staff_id,
      review_period_start,
      review_period_end,
      overall_rating,
      performance_metrics,
      goals,
      achievements,
      areas_for_improvement,
      comments,
    } = body;

    if (!staff_id || !review_period_start || !review_period_end) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const review = await createPerformanceReview(
      staff_id,
      businessId,
      businessId, // reviewer_id is the business owner
      {
        review_period_start,
        review_period_end,
        overall_rating,
        performance_metrics: performance_metrics as PerformanceMetric[],
        goals: goals as Goal[],
        achievements: achievements as Achievement[],
        areas_for_improvement,
        comments,
      }
    );

    if (!review) {
      return NextResponse.json(
        { error: "Failed to create performance review" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Error creating performance review:", error);
    return NextResponse.json(
      { error: "Failed to create performance review" },
      { status: 500 }
    );
  }
}
