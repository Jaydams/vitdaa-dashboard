import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { staffPerformanceCalculator } from "@/lib/staff-performance-calculator";

export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const staffId = params.staffId;

    // Get query parameters
    const businessId = searchParams.get("business_id");
    const startDate =
      searchParams.get("start_date") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate =
      searchParams.get("end_date") || new Date().toISOString().split("T")[0];
    const includeComparative =
      searchParams.get("include_comparative") === "true";
    const includeAlerts = searchParams.get("include_alerts") === "true";

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Verify staff exists
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role, created_at")
      .eq("id", staffId)
      .eq("business_id", businessId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Use the enhanced performance calculator
    const performanceMetrics =
      await staffPerformanceCalculator.calculatePerformanceMetrics(
        staffId,
        businessId,
        startDate,
        endDate
      );

    // Add staff info to the response
    const enhancedMetrics = {
      ...performanceMetrics,
      staff_info: staff,
    };

    // Filter response based on query parameters
    const response: any = {
      performance_metrics: enhancedMetrics,
    };

    // Helper functions
    const getPerformanceLevel = (score: number): string => {
      if (score >= 90) return "Excellent";
      if (score >= 80) return "Good";
      if (score >= 70) return "Average";
      if (score >= 60) return "Below Average";
      return "Needs Improvement";
    };

    const identifyKeyStrengths = (metrics: any): string[] => {
      const strengths: string[] = [];

      if (metrics.metrics.success_rate > 95) {
        strengths.push("High success rate");
      }
      if (metrics.metrics.response_time_percentiles.p50 < 1000) {
        strengths.push("Fast response times");
      }
      if (metrics.metrics.activity_volume_score > 80) {
        strengths.push("High activity volume");
      }
      if (metrics.metrics.error_rate < 2) {
        strengths.push("Low error rate");
      }

      return strengths.length > 0 ? strengths : ["Consistent performance"];
    };

    const identifyImprovementAreas = (metrics: any): string[] => {
      const areas: string[] = [];

      if (metrics.metrics.error_rate > 5) {
        areas.push("Reduce error rate");
      }
      if (metrics.metrics.response_time_percentiles.p95 > 5000) {
        areas.push("Improve response times");
      }
      if (metrics.metrics.activity_volume_score < 50) {
        areas.push("Increase activity volume");
      }
      if (metrics.metrics.success_rate < 85) {
        areas.push("Improve success rate");
      }

      return areas.length > 0 ? areas : ["Maintain current performance"];
    };

    // Add summary for quick overview
    response.summary = {
      overall_score: enhancedMetrics.metrics.efficiency_score,
      performance_level: getPerformanceLevel(
        enhancedMetrics.metrics.efficiency_score
      ),
      key_strengths: identifyKeyStrengths(enhancedMetrics),
      improvement_areas: identifyImprovementAreas(enhancedMetrics),
    };

    // Conditionally include detailed sections
    if (!includeComparative && enhancedMetrics.comparative_metrics) {
      delete (enhancedMetrics as any).comparative_metrics;
    }

    if (!includeAlerts && enhancedMetrics.performance_alerts) {
      delete (enhancedMetrics as any).performance_alerts;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
