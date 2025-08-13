import { createClient } from "@/lib/supabase/server";
import {
  getBusinessCurrentSalaries,
  getBusinessSalaryStatistics,
  calculateStaffCompensation,
} from "./staff-salary-data";
import {
  getBusinessShifts,
  getStaffAttendanceSummary,
} from "./staff-shifts-data";
import {
  getBusinessPerformanceStatistics,
  getStaffPerformanceTrend,
} from "./staff-performance-data";
import {
  getStaffActivitySummary,
  getRealTimeActivityMonitoring,
} from "./staff-activity-tracking";

/**
 * Staff Report Types
 */
export interface PayrollSummaryReport {
  period: string;
  total_staff: number;
  total_payroll: number;
  average_salary: number;
  salary_breakdown: {
    hourly_staff: number;
    monthly_staff: number;
    annual_staff: number;
    total_hourly_cost: number;
    total_monthly_cost: number;
    total_annual_cost: number;
  };
  overtime_costs: number;
  commission_costs: number;
  staff_details: Array<{
    staff_id: string;
    name: string;
    role: string;
    salary_type: string;
    base_compensation: number;
    overtime_pay: number;
    commission: number;
    total_compensation: number;
    hours_worked: number;
  }>;
}

export interface AttendancePunctualityReport {
  period: string;
  total_staff: number;
  overall_attendance_rate: number;
  overall_punctuality_score: number;
  total_hours_worked: number;
  total_overtime_hours: number;
  staff_details: Array<{
    staff_id: string;
    name: string;
    role: string;
    days_worked: number;
    hours_worked: number;
    overtime_hours: number;
    attendance_rate: number;
    punctuality_score: number;
    late_count: number;
    absence_count: number;
    early_departure_count: number;
  }>;
  trends: {
    daily_attendance: Array<{
      date: string;
      present_count: number;
      absent_count: number;
      late_count: number;
    }>;
    punctuality_trend: Array<{
      week: string;
      average_punctuality: number;
    }>;
  };
}

export interface PerformanceTrendReport {
  period: string;
  total_reviews: number;
  average_rating: number;
  staff_performance: Array<{
    staff_id: string;
    name: string;
    role: string;
    current_rating: number;
    trend: "improving" | "stable" | "declining";
    rating_change: number;
    reviews_count: number;
    goals_completed: number;
    achievements_count: number;
    areas_for_improvement: string[];
  }>;
  department_performance: Array<{
    department: string;
    staff_count: number;
    average_rating: number;
    trend: "improving" | "stable" | "declining";
  }>;
  performance_distribution: {
    excellent: number; // 4.5-5.0
    good: number; // 3.5-4.4
    satisfactory: number; // 2.5-3.4
    needs_improvement: number; // 1.5-2.4
    poor: number; // 1.0-1.4
  };
}

export interface ProductivityAnalyticsReport {
  period: string;
  total_sessions: number;
  average_productivity_score: number;
  total_active_time: number;
  total_idle_time: number;
  staff_productivity: Array<{
    staff_id: string;
    name: string;
    role: string;
    sessions_count: number;
    average_productivity: number;
    total_active_time: number;
    total_idle_time: number;
    task_completion_rate: number;
    most_used_features: string[];
    productivity_trend: "improving" | "stable" | "declining";
  }>;
  productivity_trends: Array<{
    date: string;
    average_productivity: number;
    active_sessions: number;
  }>;
  feature_usage: Array<{
    feature: string;
    usage_count: number;
    average_time_spent: number;
  }>;
}

/**
 * Generates a comprehensive payroll summary report
 * @param businessId - The business ID
 * @param startDate - Start date for the report period
 * @param endDate - End date for the report period
 * @returns Payroll summary report
 */
export async function generatePayrollSummaryReport(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<PayrollSummaryReport | null> {
  try {
    const supabase = await createClient();

    // Get current salaries
    const salaries = await getBusinessCurrentSalaries(businessId);
    const salaryStats = await getBusinessSalaryStatistics(businessId);

    if (!salaryStats) {
      return null;
    }

    // Get shifts and attendance data for the period
    const shifts = await getBusinessShifts(businessId, startDate, endDate);

    // Calculate staff details with compensation
    const staffDetails = await Promise.all(
      salaries.map(async (salary) => {
        // Get attendance summary for this staff member
        const attendanceSummary = await getStaffAttendanceSummary(
          salary.staff_id,
          businessId,
          startDate,
          endDate
        );

        const hoursWorked = attendanceSummary?.total_hours_worked || 0;
        const overtimeHours = attendanceSummary?.total_overtime_hours || 0;

        // Calculate compensation
        const compensation = await calculateStaffCompensation(
          salary.staff_id,
          businessId,
          hoursWorked,
          true, // Include commission
          0 // Commission amount would need to be calculated separately
        );

        return {
          staff_id: salary.staff_id,
          name: `${salary.staff.first_name} ${salary.staff.last_name}`,
          role: salary.staff.role,
          salary_type: salary.salary_type,
          base_compensation: compensation?.base_pay || 0,
          overtime_pay: overtimeHours * (salary.hourly_rate || 0) * 1.5, // 1.5x for overtime
          commission: compensation?.commission || 0,
          total_compensation:
            (compensation?.total || 0) +
            overtimeHours * (salary.hourly_rate || 0) * 1.5,
          hours_worked: hoursWorked,
        };
      })
    );

    // Calculate totals
    const totalPayroll = staffDetails.reduce(
      (sum, staff) => sum + staff.total_compensation,
      0
    );
    const overtimeCosts = staffDetails.reduce(
      (sum, staff) => sum + staff.overtime_pay,
      0
    );
    const commissionCosts = staffDetails.reduce(
      (sum, staff) => sum + staff.commission,
      0
    );

    return {
      period: `${startDate} to ${endDate}`,
      total_staff: salaries.length,
      total_payroll: Math.round(totalPayroll * 100) / 100,
      average_salary:
        salaries.length > 0
          ? Math.round((totalPayroll / salaries.length) * 100) / 100
          : 0,
      salary_breakdown: {
        hourly_staff: salaryStats.salary_type_distribution.hourly,
        monthly_staff: salaryStats.salary_type_distribution.monthly,
        annual_staff: salaryStats.salary_type_distribution.annual,
        total_hourly_cost: staffDetails
          .filter((s) => s.salary_type === "hourly")
          .reduce((sum, s) => sum + s.total_compensation, 0),
        total_monthly_cost: staffDetails
          .filter((s) => s.salary_type === "monthly")
          .reduce((sum, s) => sum + s.total_compensation, 0),
        total_annual_cost: staffDetails
          .filter((s) => s.salary_type === "annual")
          .reduce((sum, s) => sum + s.total_compensation, 0),
      },
      overtime_costs: Math.round(overtimeCosts * 100) / 100,
      commission_costs: Math.round(commissionCosts * 100) / 100,
      staff_details: staffDetails,
    };
  } catch (error) {
    console.error("Error generating payroll summary report:", error);
    return null;
  }
}

/**
 * Generates an attendance and punctuality analytics report
 * @param businessId - The business ID
 * @param startDate - Start date for the report period
 * @param endDate - End date for the report period
 * @returns Attendance and punctuality report
 */
export async function generateAttendancePunctualityReport(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<AttendancePunctualityReport | null> {
  try {
    const supabase = await createClient();

    // Get all staff for the business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role")
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (staffError || !staff) {
      console.error("Error getting staff:", staffError);
      return null;
    }

    // Get attendance data for each staff member
    const staffDetails = await Promise.all(
      staff.map(async (staffMember) => {
        const attendanceSummary = await getStaffAttendanceSummary(
          staffMember.id,
          businessId,
          startDate,
          endDate
        );

        if (!attendanceSummary) {
          return {
            staff_id: staffMember.id,
            name: `${staffMember.first_name} ${staffMember.last_name}`,
            role: staffMember.role,
            days_worked: 0,
            hours_worked: 0,
            overtime_hours: 0,
            attendance_rate: 0,
            punctuality_score: 0,
            late_count: 0,
            absence_count: 0,
            early_departure_count: 0,
          };
        }

        // Calculate attendance rate (assuming 5 working days per week)
        const totalWorkingDays = getWorkingDaysBetween(startDate, endDate);
        const attendanceRate =
          totalWorkingDays > 0
            ? (attendanceSummary.total_days_worked / totalWorkingDays) * 100
            : 0;

        return {
          staff_id: staffMember.id,
          name: `${staffMember.first_name} ${staffMember.last_name}`,
          role: staffMember.role,
          days_worked: attendanceSummary.total_days_worked,
          hours_worked: attendanceSummary.total_hours_worked,
          overtime_hours: attendanceSummary.total_overtime_hours,
          attendance_rate: Math.round(attendanceRate * 100) / 100,
          punctuality_score: attendanceSummary.punctuality_score,
          late_count: attendanceSummary.late_count,
          absence_count: attendanceSummary.absence_count,
          early_departure_count: attendanceSummary.early_departure_count,
        };
      })
    );

    // Calculate overall metrics
    const totalStaff = staffDetails.length;
    const overallAttendanceRate =
      totalStaff > 0
        ? staffDetails.reduce((sum, s) => sum + s.attendance_rate, 0) /
          totalStaff
        : 0;
    const overallPunctualityScore =
      totalStaff > 0
        ? staffDetails.reduce((sum, s) => sum + s.punctuality_score, 0) /
          totalStaff
        : 0;
    const totalHoursWorked = staffDetails.reduce(
      (sum, s) => sum + s.hours_worked,
      0
    );
    const totalOvertimeHours = staffDetails.reduce(
      (sum, s) => sum + s.overtime_hours,
      0
    );

    // Generate daily attendance trends
    const dailyAttendance = await getDailyAttendanceTrends(
      businessId,
      startDate,
      endDate
    );
    const punctualityTrend = await getWeeklyPunctualityTrends(
      businessId,
      startDate,
      endDate
    );

    return {
      period: `${startDate} to ${endDate}`,
      total_staff: totalStaff,
      overall_attendance_rate: Math.round(overallAttendanceRate * 100) / 100,
      overall_punctuality_score:
        Math.round(overallPunctualityScore * 100) / 100,
      total_hours_worked: Math.round(totalHoursWorked * 100) / 100,
      total_overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
      staff_details: staffDetails,
      trends: {
        daily_attendance: dailyAttendance,
        punctuality_trend: punctualityTrend,
      },
    };
  } catch (error) {
    console.error("Error generating attendance punctuality report:", error);
    return null;
  }
}

/**
 * Generates a performance trend analysis report
 * @param businessId - The business ID
 * @param startDate - Start date for the report period
 * @param endDate - End date for the report period
 * @returns Performance trend report
 */
export async function generatePerformanceTrendReport(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<PerformanceTrendReport | null> {
  try {
    const supabase = await createClient();

    // Get performance statistics
    const performanceStats = await getBusinessPerformanceStatistics(businessId);
    if (!performanceStats) {
      return null;
    }

    // Get all staff with performance data
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role, department")
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (staffError || !staff) {
      console.error("Error getting staff:", staffError);
      return null;
    }

    // Get performance data for each staff member
    const staffPerformance = await Promise.all(
      staff.map(async (staffMember) => {
        const performanceTrend = await getStaffPerformanceTrend(
          staffMember.id,
          businessId,
          3 // Last 3 reviews
        );

        // Get latest review details
        const { data: latestReview } = await supabase
          .from("staff_performance_reviews")
          .select("overall_rating, goals, achievements, areas_for_improvement")
          .eq("staff_id", staffMember.id)
          .eq("business_id", businessId)
          .eq("status", "approved")
          .order("review_period_end", { ascending: false })
          .limit(1)
          .single();

        const goals = latestReview?.goals || [];
        const achievements = latestReview?.achievements || [];
        const goalsCompleted = goals.filter(
          (g: any) => g.status === "completed"
        ).length;

        return {
          staff_id: staffMember.id,
          name: `${staffMember.first_name} ${staffMember.last_name}`,
          role: staffMember.role,
          current_rating: latestReview?.overall_rating || 0,
          trend: performanceTrend?.trend || "stable",
          rating_change: performanceTrend?.rating_change || 0,
          reviews_count: performanceTrend?.reviews_analyzed || 0,
          goals_completed: goalsCompleted,
          achievements_count: achievements.length,
          areas_for_improvement: latestReview?.areas_for_improvement
            ? [latestReview.areas_for_improvement]
            : [],
        };
      })
    );

    // Calculate department performance
    const departmentGroups = staff.reduce((groups, staffMember) => {
      const dept = staffMember.department || "Unassigned";
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(staffMember.id);
      return groups;
    }, {} as Record<string, string[]>);

    const departmentPerformance = Object.entries(departmentGroups).map(
      ([department, staffIds]) => {
        const deptStaff = staffPerformance.filter((s) =>
          staffIds.includes(s.staff_id)
        );
        const avgRating =
          deptStaff.length > 0
            ? deptStaff.reduce((sum, s) => sum + s.current_rating, 0) /
              deptStaff.length
            : 0;

        // Determine department trend based on individual trends
        const trendCounts = deptStaff.reduce(
          (counts, s) => {
            counts[s.trend]++;
            return counts;
          },
          { improving: 0, stable: 0, declining: 0 }
        );

        let deptTrend: "improving" | "stable" | "declining" = "stable";
        if (trendCounts.improving > trendCounts.declining) {
          deptTrend = "improving";
        } else if (trendCounts.declining > trendCounts.improving) {
          deptTrend = "declining";
        }

        return {
          department,
          staff_count: deptStaff.length,
          average_rating: Math.round(avgRating * 100) / 100,
          trend: deptTrend,
        };
      }
    );

    // Calculate performance distribution
    const performanceDistribution = staffPerformance.reduce(
      (dist, staff) => {
        const rating = staff.current_rating;
        if (rating >= 4.5) dist.excellent++;
        else if (rating >= 3.5) dist.good++;
        else if (rating >= 2.5) dist.satisfactory++;
        else if (rating >= 1.5) dist.needs_improvement++;
        else dist.poor++;
        return dist;
      },
      { excellent: 0, good: 0, satisfactory: 0, needs_improvement: 0, poor: 0 }
    );

    return {
      period: `${startDate} to ${endDate}`,
      total_reviews: performanceStats.total_reviews,
      average_rating: performanceStats.average_rating,
      staff_performance: staffPerformance,
      department_performance: departmentPerformance,
      performance_distribution: performanceDistribution,
    };
  } catch (error) {
    console.error("Error generating performance trend report:", error);
    return null;
  }
}

/**
 * Generates a productivity analytics report
 * @param businessId - The business ID
 * @param startDate - Start date for the report period
 * @param endDate - End date for the report period
 * @returns Productivity analytics report
 */
export async function generateProductivityAnalyticsReport(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<ProductivityAnalyticsReport | null> {
  try {
    const supabase = await createClient();

    // Get activity summary for the period
    const activitySummary = await getStaffActivitySummary(
      businessId,
      startDate,
      endDate
    );

    // Get all staff for the business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role")
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (staffError || !staff) {
      console.error("Error getting staff:", staffError);
      return null;
    }

    // Calculate overall metrics
    const totalSessions = activitySummary.reduce(
      (sum, s) => sum + s.total_sessions,
      0
    );
    const totalActiveTime = activitySummary.reduce(
      (sum, s) => sum + s.total_session_duration_minutes,
      0
    );
    const averageProductivity =
      activitySummary.length > 0
        ? activitySummary.reduce(
            (sum, s) => sum + (s.average_session_duration_minutes || 0),
            0
          ) / activitySummary.length
        : 0;

    // Map activity summary to staff productivity
    const staffProductivity = activitySummary.map((activity) => {
      const staffMember = staff.find((s) => s.id === activity.staff_id);

      return {
        staff_id: activity.staff_id,
        name: activity.staff_name,
        role: activity.role,
        sessions_count: activity.total_sessions,
        average_productivity: activity.average_session_duration_minutes || 0,
        total_active_time: activity.total_session_duration_minutes,
        total_idle_time: 0, // Would need to be calculated from session data
        task_completion_rate: 0, // Would need to be calculated from task data
        most_used_features: activity.most_common_actions.map((a) => a.action),
        productivity_trend: "stable" as const, // Would need historical comparison
      };
    });

    // Generate productivity trends (daily averages)
    const productivityTrends = await getDailyProductivityTrends(
      businessId,
      startDate,
      endDate
    );

    // Get feature usage statistics
    const featureUsage = await getFeatureUsageStatistics(
      businessId,
      startDate,
      endDate
    );

    return {
      period: `${startDate} to ${endDate}`,
      total_sessions: totalSessions,
      average_productivity_score: Math.round(averageProductivity),
      total_active_time: totalActiveTime,
      total_idle_time: 0, // Would need to be calculated
      staff_productivity: staffProductivity,
      productivity_trends: productivityTrends,
      feature_usage: featureUsage,
    };
  } catch (error) {
    console.error("Error generating productivity analytics report:", error);
    return null;
  }
}

/**
 * Helper function to calculate working days between two dates
 */
function getWorkingDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;

  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
  }

  return workingDays;
}

/**
 * Helper function to get daily attendance trends
 */
async function getDailyAttendanceTrends(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<
  Array<{
    date: string;
    present_count: number;
    absent_count: number;
    late_count: number;
  }>
> {
  try {
    const supabase = await createClient();

    const { data: attendance, error } = await supabase
      .from("staff_attendance")
      .select("attendance_date, status")
      .eq("business_id", businessId)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)
      .order("attendance_date");

    if (error || !attendance) {
      return [];
    }

    const dailyTrends: Record<
      string,
      { present: number; absent: number; late: number }
    > = {};

    attendance.forEach((record) => {
      const date = record.attendance_date;
      if (!dailyTrends[date]) {
        dailyTrends[date] = { present: 0, absent: 0, late: 0 };
      }

      switch (record.status) {
        case "present":
          dailyTrends[date].present++;
          break;
        case "absent":
          dailyTrends[date].absent++;
          break;
        case "late":
          dailyTrends[date].late++;
          break;
      }
    });

    return Object.entries(dailyTrends).map(([date, counts]) => ({
      date,
      present_count: counts.present,
      absent_count: counts.absent,
      late_count: counts.late,
    }));
  } catch (error) {
    console.error("Error getting daily attendance trends:", error);
    return [];
  }
}

/**
 * Helper function to get weekly punctuality trends
 */
async function getWeeklyPunctualityTrends(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ week: string; average_punctuality: number }>> {
  // This would require more complex date calculations and aggregations
  // For now, return empty array as placeholder
  return [];
}

/**
 * Helper function to get daily productivity trends
 */
async function getDailyProductivityTrends(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<
  Array<{ date: string; average_productivity: number; active_sessions: number }>
> {
  // This would require aggregating session data by date
  // For now, return empty array as placeholder
  return [];
}

/**
 * Helper function to get feature usage statistics
 */
async function getFeatureUsageStatistics(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<
  Array<{ feature: string; usage_count: number; average_time_spent: number }>
> {
  // This would require analyzing activity logs and screen access data
  // For now, return empty array as placeholder
  return [];
}
