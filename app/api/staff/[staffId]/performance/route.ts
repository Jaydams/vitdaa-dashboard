import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getStaffPerformanceReviews,
  createPerformanceReview,
  getLatestPerformanceReview,
} from "@/lib/staff-performance-data";
import { PerformanceMetric, Goal, Achievement } from "@/types/staff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const latest = searchParams.get("latest") === "true";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (latest) {
      const latestReview = await getLatestPerformanceReview(
        staffId,
        businessOwnerId
      );
      return NextResponse.json({ latest: latestReview });
    } else {
      const reviews = await getStaffPerformanceReviews(
        staffId,
        businessOwnerId,
        limit
      );
      return NextResponse.json({ reviews });
    }
  } catch (error) {
    console.error("Error in GET /api/staff/[staffId]/performance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.review_period_start || !body.review_period_end) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: review_period_start, review_period_end",
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      !dateRegex.test(body.review_period_start) ||
      !dateRegex.test(body.review_period_end)
    ) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate that start date is before end date
    if (body.review_period_start >= body.review_period_end) {
      return NextResponse.json(
        { error: "review_period_start must be before review_period_end" },
        { status: 400 }
      );
    }

    // Validate overall_rating if provided
    if (
      body.overall_rating !== undefined &&
      (body.overall_rating < 1 || body.overall_rating > 5)
    ) {
      return NextResponse.json(
        { error: "overall_rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const reviewData = {
      review_period_start: body.review_period_start,
      review_period_end: body.review_period_end,
      overall_rating: body.overall_rating,
      performance_metrics: body.performance_metrics as PerformanceMetric[],
      goals: body.goals as Goal[],
      achievements: body.achievements as Achievement[],
      areas_for_improvement: body.areas_for_improvement,
      comments: body.comments,
    };

    const newReview = await createPerformanceReview(
      staffId,
      businessOwnerId,
      businessOwnerId, // reviewer_id is the business owner
      reviewData
    );

    if (!newReview) {
      return NextResponse.json(
        { error: "Failed to create performance review" },
        { status: 500 }
      );
    }

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/staff/[staffId]/performance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
