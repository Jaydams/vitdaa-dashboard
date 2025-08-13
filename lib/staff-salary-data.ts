import { createClient } from "@/lib/supabase/server";
import { StaffSalary, SalaryType, PaymentFrequency } from "@/types/staff";

/**
 * Creates a new salary record for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param salaryData - The salary information
 * @returns The created salary record or null if failed
 */
export async function createStaffSalary(
  staffId: string,
  businessId: string,
  salaryData: {
    base_salary?: number;
    hourly_rate?: number;
    salary_type: SalaryType;
    payment_frequency: PaymentFrequency;
    commission_rate?: number;
    bonus_eligible?: boolean;
    effective_date: string;
  }
): Promise<StaffSalary | null> {
  try {
    const supabase = await createClient();

    // First, mark any existing current salary as not current
    await supabase
      .from("staff_salary")
      .update({ is_current: false, end_date: salaryData.effective_date })
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("is_current", true);

    // Create new salary record
    const { data: salary, error } = await supabase
      .from("staff_salary")
      .insert({
        staff_id: staffId,
        business_id: businessId,
        base_salary: salaryData.base_salary,
        hourly_rate: salaryData.hourly_rate,
        salary_type: salaryData.salary_type,
        payment_frequency: salaryData.payment_frequency,
        commission_rate: salaryData.commission_rate || 0,
        bonus_eligible: salaryData.bonus_eligible || false,
        effective_date: salaryData.effective_date,
        is_current: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating staff salary:", error);
      return null;
    }

    return salary as StaffSalary;
  } catch (error) {
    console.error("Error creating staff salary:", error);
    return null;
  }
}

/**
 * Gets the current salary information for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @returns Current salary record or null if not found
 */
export async function getCurrentStaffSalary(
  staffId: string,
  businessId: string
): Promise<StaffSalary | null> {
  try {
    const supabase = await createClient();

    const { data: salary, error } = await supabase
      .from("staff_salary")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("is_current", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No current salary found
        return null;
      }
      console.error("Error getting current staff salary:", error);
      return null;
    }

    return salary as StaffSalary;
  } catch (error) {
    console.error("Error getting current staff salary:", error);
    return null;
  }
}

/**
 * Gets salary history for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of salary records ordered by effective date (newest first)
 */
export async function getStaffSalaryHistory(
  staffId: string,
  businessId: string,
  limit: number = 50
): Promise<StaffSalary[]> {
  try {
    const supabase = await createClient();

    const { data: salaries, error } = await supabase
      .from("staff_salary")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .order("effective_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error getting staff salary history:", error);
      return [];
    }

    return salaries || [];
  } catch (error) {
    console.error("Error getting staff salary history:", error);
    return [];
  }
}

/**
 * Updates an existing salary record
 * @param salaryId - The salary record ID
 * @param businessId - The business ID
 * @param updates - The fields to update
 * @returns Updated salary record or null if failed
 */
export async function updateStaffSalary(
  salaryId: string,
  businessId: string,
  updates: Partial<{
    base_salary: number;
    hourly_rate: number;
    salary_type: SalaryType;
    payment_frequency: PaymentFrequency;
    commission_rate: number;
    bonus_eligible: boolean;
    end_date: string;
  }>
): Promise<StaffSalary | null> {
  try {
    const supabase = await createClient();

    const { data: salary, error } = await supabase
      .from("staff_salary")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", salaryId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      console.error("Error updating staff salary:", error);
      return null;
    }

    return salary as StaffSalary;
  } catch (error) {
    console.error("Error updating staff salary:", error);
    return null;
  }
}

/**
 * Ends a current salary record (sets end_date and is_current to false)
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param endDate - The end date for the salary
 * @returns True if successful, false otherwise
 */
export async function endCurrentStaffSalary(
  staffId: string,
  businessId: string,
  endDate: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("staff_salary")
      .update({
        is_current: false,
        end_date: endDate,
        updated_at: new Date().toISOString(),
      })
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .eq("is_current", true);

    if (error) {
      console.error("Error ending current staff salary:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error ending current staff salary:", error);
    return false;
  }
}

/**
 * Gets all current salaries for a business
 * @param businessId - The business ID
 * @returns Array of current salary records with staff information
 */
export async function getBusinessCurrentSalaries(businessId: string): Promise<
  (StaffSalary & {
    staff: { first_name: string; last_name: string; role: string };
  })[]
> {
  try {
    const supabase = await createClient();

    const { data: salaries, error } = await supabase
      .from("staff_salary")
      .select(
        `
        *,
        staff:staff_id (
          first_name,
          last_name,
          role
        )
      `
      )
      .eq("business_id", businessId)
      .eq("is_current", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting business current salaries:", error);
      return [];
    }

    return salaries || [];
  } catch (error) {
    console.error("Error getting business current salaries:", error);
    return [];
  }
}

/**
 * Calculates total compensation for a staff member based on hours worked
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param hoursWorked - Number of hours worked
 * @param includeCommission - Whether to include commission (default: false)
 * @param commissionAmount - Commission amount if applicable
 * @returns Calculated compensation or null if no salary found
 */
export async function calculateStaffCompensation(
  staffId: string,
  businessId: string,
  hoursWorked: number,
  includeCommission: boolean = false,
  commissionAmount: number = 0
): Promise<{
  base_pay: number;
  commission: number;
  total: number;
  salary_type: SalaryType;
} | null> {
  try {
    const currentSalary = await getCurrentStaffSalary(staffId, businessId);

    if (!currentSalary) {
      return null;
    }

    let basePay = 0;

    switch (currentSalary.salary_type) {
      case "hourly":
        basePay = (currentSalary.hourly_rate || 0) * hoursWorked;
        break;
      case "monthly":
        // Assuming 160 hours per month (4 weeks * 40 hours)
        const hourlyEquivalent = (currentSalary.base_salary || 0) / 160;
        basePay = hourlyEquivalent * hoursWorked;
        break;
      case "annual":
        // Assuming 2080 hours per year (52 weeks * 40 hours)
        const annualHourlyEquivalent = (currentSalary.base_salary || 0) / 2080;
        basePay = annualHourlyEquivalent * hoursWorked;
        break;
    }

    const commission =
      includeCommission && currentSalary.bonus_eligible
        ? commissionAmount * (currentSalary.commission_rate / 100)
        : 0;

    return {
      base_pay: Math.round(basePay * 100) / 100, // Round to 2 decimal places
      commission: Math.round(commission * 100) / 100,
      total: Math.round((basePay + commission) * 100) / 100,
      salary_type: currentSalary.salary_type,
    };
  } catch (error) {
    console.error("Error calculating staff compensation:", error);
    return null;
  }
}

/**
 * Gets salary statistics for a business
 * @param businessId - The business ID
 * @returns Salary statistics or null if failed
 */
export async function getBusinessSalaryStatistics(businessId: string): Promise<{
  total_staff_with_salary: number;
  average_hourly_rate: number;
  average_monthly_salary: number;
  total_monthly_payroll: number;
  salary_type_distribution: Record<SalaryType, number>;
} | null> {
  try {
    const salaries = await getBusinessCurrentSalaries(businessId);

    if (salaries.length === 0) {
      return {
        total_staff_with_salary: 0,
        average_hourly_rate: 0,
        average_monthly_salary: 0,
        total_monthly_payroll: 0,
        salary_type_distribution: { hourly: 0, monthly: 0, annual: 0 },
      };
    }

    let totalHourlyRates = 0;
    let hourlyCount = 0;
    let totalMonthlySalaries = 0;
    let monthlyCount = 0;
    let totalMonthlyPayroll = 0;

    const salaryTypeDistribution: Record<SalaryType, number> = {
      hourly: 0,
      monthly: 0,
      annual: 0,
    };

    for (const salary of salaries) {
      salaryTypeDistribution[salary.salary_type]++;

      switch (salary.salary_type) {
        case "hourly":
          if (salary.hourly_rate) {
            totalHourlyRates += salary.hourly_rate;
            hourlyCount++;
            // Assume 160 hours per month for payroll calculation
            totalMonthlyPayroll += salary.hourly_rate * 160;
          }
          break;
        case "monthly":
          if (salary.base_salary) {
            totalMonthlySalaries += salary.base_salary;
            monthlyCount++;
            totalMonthlyPayroll += salary.base_salary;
          }
          break;
        case "annual":
          if (salary.base_salary) {
            const monthlySalary = salary.base_salary / 12;
            totalMonthlySalaries += monthlySalary;
            monthlyCount++;
            totalMonthlyPayroll += monthlySalary;
          }
          break;
      }
    }

    return {
      total_staff_with_salary: salaries.length,
      average_hourly_rate: hourlyCount > 0 ? totalHourlyRates / hourlyCount : 0,
      average_monthly_salary:
        monthlyCount > 0 ? totalMonthlySalaries / monthlyCount : 0,
      total_monthly_payroll: totalMonthlyPayroll,
      salary_type_distribution: salaryTypeDistribution,
    };
  } catch (error) {
    console.error("Error getting business salary statistics:", error);
    return null;
  }
}
