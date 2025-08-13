import { NextRequest, NextResponse } from "next/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  generatePayrollSummaryReport,
  generateAttendancePunctualityReport,
  generatePerformanceTrendReport,
  generateProductivityAnalyticsReport,
} from "@/lib/staff-reports-data";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json(
        { error: "Unauthorized - Business owner access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const reportType = searchParams.get("type"); // 'summary' or 'detailed'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    if (reportType === "summary") {
      // Generate summary overview with key metrics from each report
      const [
        payrollReport,
        attendanceReport,
        performanceReport,
        productivityReport,
      ] = await Promise.all([
        generatePayrollSummaryReport(businessId, startDate, endDate),
        generateAttendancePunctualityReport(businessId, startDate, endDate),
        generatePerformanceTrendReport(businessId, startDate, endDate),
        generateProductivityAnalyticsReport(businessId, startDate, endDate),
      ]);

      const summary = {
        period: `${startDate} to ${endDate}`,
        payroll_summary: payrollReport
          ? {
              total_staff: payrollReport.total_staff,
              total_payroll: payrollReport.total_payroll,
              average_salary: payrollReport.average_salary,
              overtime_costs: payrollReport.overtime_costs,
            }
          : null,
        attendance_summary: attendanceReport
          ? {
              total_staff: attendanceReport.total_staff,
              overall_attendance_rate: attendanceReport.overall_attendance_rate,
              overall_punctuality_score:
                attendanceReport.overall_punctuality_score,
              total_hours_worked: attendanceReport.total_hours_worked,
            }
          : null,
        performance_summary: performanceReport
          ? {
              total_reviews: performanceReport.total_reviews,
              average_rating: performanceReport.average_rating,
              performance_distribution:
                performanceReport.performance_distribution,
            }
          : null,
        productivity_summary: productivityReport
          ? {
              total_sessions: productivityReport.total_sessions,
              average_productivity_score:
                productivityReport.average_productivity_score,
              total_active_time: productivityReport.total_active_time,
            }
          : null,
        generated_at: new Date().toISOString(),
      };

      return NextResponse.json(summary);
    } else {
      // Generate all detailed reports
      const [
        payrollReport,
        attendanceReport,
        performanceReport,
        productivityReport,
      ] = await Promise.all([
        generatePayrollSummaryReport(businessId, startDate, endDate),
        generateAttendancePunctualityReport(businessId, startDate, endDate),
        generatePerformanceTrendReport(businessId, startDate, endDate),
        generateProductivityAnalyticsReport(businessId, startDate, endDate),
      ]);

      const detailedReports = {
        period: `${startDate} to ${endDate}`,
        payroll_report: payrollReport,
        attendance_report: attendanceReport,
        performance_report: performanceReport,
        productivity_report: productivityReport,
        generated_at: new Date().toISOString(),
      };

      return NextResponse.json(detailedReports);
    }
  } catch (error) {
    console.error("Error generating reports overview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
