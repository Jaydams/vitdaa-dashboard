import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  updatePerformanceReview,
  completePerformanceReview,
  approvePerformanceReview,
  deletePerformanceReview,
} from "@/lib/staff-performance-data";
import {
  PerformanceMetric,
  Goal,
  Achievement,
  ReviewStatus,
} from "@/types/staff";

interface RouteParams {
  params: {
    reviewId: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = params;
    const body = await request.json();
    const {
      overall_rating,
      performance_metrics,
      goals,
      achievements,
      areas_for_improvement,
      comments,
      status,
      action,
    } = body;

    let review;

    if (action === "complete") {
      review = await completePerformanceReview(reviewId, businessId);
    } else if (action === "approve") {
      review = await approvePerformanceReview(reviewId, businessId);
    } else {
      // Regular update
      review = await updatePerformanceReview(reviewId, businessId, {
        overall_rating,
        performance_metrics: performance_metrics as PerformanceMetric[],
        goals: goals as Goal[],
        achievements: achievements as Achievement[],
        areas_for_improvement,
        comments,
        status: status as ReviewStatus,
      });
    }

    if (!review) {
      return NextResponse.json(
        { error: "Failed to update performance review" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error updating performance review:", error);
    return NextResponse.json(
      { error: "Failed to update performance review" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = params;

    const success = await deletePerformanceReview(reviewId, businessId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete performance review" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting performance review:", error);
    return NextResponse.json(
      { error: "Failed to delete performance review" },
      { status: 500 }
    );
  }
}
