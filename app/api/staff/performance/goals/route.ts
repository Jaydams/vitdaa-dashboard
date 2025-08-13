import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getStaffActiveGoals,
  updateReviewGoal,
  removeReviewGoal,
} from "@/lib/staff-performance-data";
import { Goal } from "@/types/staff";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");

    if (!staffId) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    const goals = await getStaffActiveGoals(staffId, businessId);
    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Error fetching staff goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff goals" },
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
    const { reviewId, goal } = body;

    if (!reviewId || !goal) {
      return NextResponse.json(
        { error: "Review ID and goal are required" },
        { status: 400 }
      );
    }

    const updatedReview = await updateReviewGoal(
      reviewId,
      businessId,
      goal as Goal
    );

    if (!updatedReview) {
      return NextResponse.json(
        { error: "Failed to update goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review: updatedReview });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("reviewId");
    const goalId = searchParams.get("goalId");

    if (!reviewId || !goalId) {
      return NextResponse.json(
        { error: "Review ID and goal ID are required" },
        { status: 400 }
      );
    }

    const updatedReview = await removeReviewGoal(reviewId, businessId, goalId);

    if (!updatedReview) {
      return NextResponse.json(
        { error: "Failed to remove goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review: updatedReview });
  } catch (error) {
    console.error("Error removing goal:", error);
    return NextResponse.json(
      { error: "Failed to remove goal" },
      { status: 500 }
    );
  }
}
