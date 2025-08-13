import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import {
  getStaffAttendance,
  getStaffAttendanceSummary,
} from "@/lib/staff-shifts-data";

/**
 * Get attendance reports for a staff member
 * GET /api/staff/[staffId]/attendance/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&type=summary|detailed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const businessId = await getServerBusinessOwnerId();
    if (!businessId) {
      return NextResponse.json(
        { error: "Unauthorized - Business owner not found" },
        { status: 401 }
      );
    }

    const { staffId } = params;
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const reportType = searchParams.get("type") || "summary";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify staff belongs to this business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, role, employment_start_date")
      .eq("id", staffId)
      .eq("business_id", businessId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    if (reportType === "summary") {
      // Get attendance summary
      const summary = await getStaffAttendanceSummary(
        staffId,
        businessId,
        startDate,
        endDate
      );

      if (!summary) {
        return NextResponse.json(
          { error: "Failed to generate attendance summary" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        staff: {
          id: staff.id,
          name: `${staff.first_name} ${staff.last_name}`,
          role: staff.role,
          employment_start_date: staff.employment_start_date,
        },
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        summary,
      });
    } else if (reportType === "detailed") {
      // Get detailed attendance records
      const attendanceRecords = await getStaffAttendance(
        staffId,
        businessId,
        startDate,
        endDate
      );

      // Get associated shift information
      const shiftIds = attendanceRecords
        .filter((record) => record.shift_id)
        .map((record) => record.shift_id);

      let shifts: any[] = [];
      if (shiftIds.length > 0) {
        const { data: shiftData } = await supabase
          .from("staff_shifts")
          .select("id, shift_date, scheduled_start_time, scheduled_end_time")
          .in("id", shiftIds);

        shifts = shiftData || [];
      }

      // Combine attendance with shift data
      const detailedRecords = attendanceRecords.map((record) => ({
        ...record,
        shift: record.shift_id
          ? shifts.find((shift) => shift.id === record.shift_id)
          : null,
      }));

      // Calculate additional metrics
      const totalDays = attendanceRecords.length;
      const workingDays = attendanceRecords.filter(
        (r) => r.status === "present"
      ).length;
      const lateDays = attendanceRecords.filter(
        (r) => r.status === "late"
      ).length;
      const absentDays = attendanceRecords.filter(
        (r) => r.status === "absent"
      ).length;
      const earlyDepartures = attendanceRecords.filter(
        (r) => r.status === "early_departure"
      ).length;

      const totalHours = attendanceRecords.reduce(
        (sum, r) => sum + (r.total_hours_worked || 0),
        0
      );
      const totalOvertime = attendanceRecords.reduce(
        (sum, r) => sum + (r.overtime_hours || 0),
        0
      );

      return NextResponse.json({
        staff: {
          id: staff.id,
          name: `${staff.first_name} ${staff.last_name}`,
          role: staff.role,
          employment_start_date: staff.employment_start_date,
        },
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        metrics: {
          total_days: totalDays,
          working_days: workingDays,
          late_days: lateDays,
          absent_days: absentDays,
          early_departures: earlyDepartures,
          total_hours: Math.round(totalHours * 100) / 100,
          total_overtime: Math.round(totalOvertime * 100) / 100,
          average_hours_per_day:
            totalDays > 0
              ? Math.round((totalHours / totalDays) * 100) / 100
              : 0,
          punctuality_rate:
            totalDays > 0
              ? Math.round(
                  ((totalDays - lateDays - earlyDepartures) / totalDays) * 100
                )
              : 100,
        },
        records: detailedRecords,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid report type. Use 'summary' or 'detailed'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error generating attendance report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
