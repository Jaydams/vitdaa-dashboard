import { useState, useEffect, useCallback } from "react";
import { StaffSalary } from "@/types/staff";

interface PayrollCalculation {
  base_pay: number;
  commission: number;
  total: number;
  salary_type: string;
}

interface UseStaffSalaryReturn {
  currentSalary: StaffSalary | null;
  salaryHistory: StaffSalary[];
  loading: boolean;
  error: string | null;
  createSalary: (salaryData: Partial<StaffSalary>) => Promise<void>;
  updateSalary: (salaryData: Partial<StaffSalary>) => Promise<void>;
  calculatePayroll: (
    hoursWorked: number,
    includeCommission?: boolean,
    commissionAmount?: number
  ) => Promise<PayrollCalculation | null>;
  refreshSalaryData: () => Promise<void>;
}

export function useStaffSalary(staffId: string): UseStaffSalaryReturn {
  const [currentSalary, setCurrentSalary] = useState<StaffSalary | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<StaffSalary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSalaryData = useCallback(async () => {
    if (!staffId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/staff/${staffId}/salary?includeHistory=true`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch salary data");
      }

      const data = await response.json();
      setCurrentSalary(data.currentSalary);
      setSalaryHistory(data.salaryHistory || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  const createSalary = async (salaryData: Partial<StaffSalary>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/${staffId}/salary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salaryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create salary");
      }

      const newSalary = await response.json();
      setCurrentSalary(newSalary);

      // Refresh salary history
      await fetchSalaryData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSalary = async (salaryData: Partial<StaffSalary>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/${staffId}/salary`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salaryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update salary");
      }

      const updatedSalary = await response.json();
      setCurrentSalary(updatedSalary);

      // Refresh salary history
      await fetchSalaryData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const calculatePayroll = async (
    hoursWorked: number,
    includeCommission: boolean = false,
    commissionAmount: number = 0
  ): Promise<PayrollCalculation | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/${staffId}/salary/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hoursWorked,
          includeCommission,
          commissionAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to calculate payroll");
      }

      const calculation = await response.json();
      return calculation;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshSalaryData = async () => {
    await fetchSalaryData();
  };

  useEffect(() => {
    fetchSalaryData();
  }, [staffId, fetchSalaryData]);

  return {
    currentSalary,
    salaryHistory,
    loading,
    error,
    createSalary,
    updateSalary,
    calculatePayroll,
    refreshSalaryData,
  };
}
