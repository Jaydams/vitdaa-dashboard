import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  updatePerformanceReview,
  deletePerformanceReview,
  completePerformanceReview,
  approvePerformanceReview,
} from "@/lib/staff-performance-data";
import {
  ReviewStatus,
  PerformanceMetric,
  Goal,
  Achievement,
} from "@/types/staff";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await params;

    // Validate reviewId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reviewId)) {
      return NextResponse.json(
        { error: "Invalid review ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, ...updates } = body;

    // Handle special actions
    if (action === "complete") {
      const updatedReview = await completePerformanceReview(
        reviewId,
        businessOwnerId
      );

      if (!updatedReview) {
        return NextResponse.json(
          { error: "Failed to complete performance review" },
          { status: 500 }
        );
      }

      return NextResponse.json(updatedReview);
    }

    if (action === "approve") {
      const updatedReview = await approvePerformanceReview(
        reviewId,
        businessOwnerId
      );

      if (!updatedReview) {
        return NextResponse.json(
          { error: "Failed to approve performance review" },
          { status: 500 }
        );
      }

      return NextResponse.json(updatedReview);
    }

    // Validate overall_rating if provided
    if (
      updates.overall_rating !== undefined &&
      (updates.overall_rating < 1 || updates.overall_rating > 5)
    ) {
      return NextResponse.json(
        { error: "overall_rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (updates.status) {
      const validStatuses: ReviewStatus[] = ["draft", "completed", "approved"];
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be: draft, completed, or approved" },
          { status: 400 }
        );
      }
    }

    // Type cast arrays if provided
    const updateData: any = { ...updates };
    if (updates.performance_metrics) {
      updateData.performance_metrics =
        updates.performance_metrics as PerformanceMetric[];
    }
    if (updates.goals) {
      updateData.goals = updates.goals as Goal[];
    }
    if (updates.achievements) {
      updateData.achievements = updates.achievements as Achievement[];
    }

    const updatedReview = await updatePerformanceReview(
      reviewId,
      businessOwnerId,
      updateData
    );

    if (!updatedReview) {
      return NextResponse.json(
        { error: "Failed to update performance review" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error("Error in PUT /api/staff/performance/[reviewId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await params;

    // Validate reviewId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reviewId)) {
      return NextResponse.json(
        { error: "Invalid review ID format" },
        { status: 400 }
      );
    }

    const success = await deletePerformanceReview(reviewId, businessOwnerId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete performance review" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Performance review deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/staff/performance/[reviewId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
