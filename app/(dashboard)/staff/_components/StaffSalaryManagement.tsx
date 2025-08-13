"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Edit,
  Save,
  X,
  Plus,
  History,
  TrendingUp,
  Calendar,
  CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { Staff, StaffSalary } from "@/types/staff";
import {
  fetchStaffSalary,
  fetchStaffSalaryHistory,
  updateStaffSalary,
  createStaffSalary,
} from "@/data/staff";

interface StaffSalaryManagementProps {
  staffId: string;
  staff: Staff;
}

export default function StaffSalaryManagement({
  staffId,
  staff,
}: StaffSalaryManagementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editData, setEditData] = useState<Partial<StaffSalary>>({});
  const queryClient = useQueryClient();

  // Fetch current salary
  const { data: currentSalary, isLoading: salaryLoading } = useQuery({
    queryKey: ["staff-salary", staffId],
    queryFn: () => fetchStaffSalary(staffId),
    retry: 1,
  });

  // Fetch salary history
  const { data: salaryHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["staff-salary-history", staffId],
    queryFn: () => fetchStaffSalaryHistory(staffId),
    enabled: showHistory,
    retry: 1,
  });

  // Update salary mutation
  const updateSalaryMutation = useMutation({
    mutationFn: (data: Partial<StaffSalary>) => {
      const salaryData = {
        ...data,
        business_id: staff.business_id,
        staff_id: staffId,
        salary_type: data.salary_type || "monthly",
        payment_frequency: data.payment_frequency || "monthly",
        commission_rate: data.commission_rate || 0,
        bonus_eligible: data.bonus_eligible || false,
        effective_date:
          data.effective_date || new Date().toISOString().split("T")[0],
        is_current: data.is_current || true,
      };

      return currentSalary
        ? updateStaffSalary(staffId, salaryData)
        : createStaffSalary(
            staffId,
            {
              ...salaryData,
              salary_type: salaryData.salary_type as SalaryType,
              payment_frequency: salaryData.payment_frequency as PaymentFrequency,
            } as Omit<
              StaffSalary,
              "id" | "staff_id" | "created_at" | "updated_at"
            >
          );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-salary", staffId] });
      queryClient.invalidateQueries({
        queryKey: ["staff-salary-history", staffId],
      });
      setIsEditing(false);
      setEditData({});
      toast.success("Salary information updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update salary information");
      console.error("Error updating salary:", error);
    },
  });

  const handleEdit = () => {
    setEditData(currentSalary || {});
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editData.base_salary || editData.base_salary <= 0) {
      toast.error("Please enter a valid base salary");
      return;
    }

    updateSalaryMutation.mutate({
      ...editData,
      effective_date: new Date().toISOString().split("T")[0],
      is_current: true,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "₦0";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateAnnualSalary = (salary: StaffSalary | undefined) => {
    if (!salary || !salary.base_salary) return 0;

    if (salary.salary_type === "annual") {
      return salary.base_salary;
    } else if (salary.salary_type === "monthly") {
      return salary.base_salary * 12;
    } else if (salary.salary_type === "hourly" && salary.hourly_rate) {
      return salary.hourly_rate * 40 * 52; // 40 hours/week * 52 weeks
    }
    return salary.base_salary * 12; // Default to monthly
  };

  const calculateMonthlySalary = (salary: StaffSalary | undefined) => {
    if (!salary || !salary.base_salary) return 0;

    if (salary.salary_type === "monthly") {
      return salary.base_salary;
    } else if (salary.salary_type === "annual") {
      return salary.base_salary / 12;
    } else if (salary.salary_type === "hourly" && salary.hourly_rate) {
      return (salary.hourly_rate * 40 * 52) / 12; // Convert hourly to monthly
    }
    return salary.base_salary; // Default to monthly
  };

  if (salaryLoading) {
    return <SalaryManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Current Salary Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Salary Information
          </CardTitle>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4 mr-2" />
                  {showHistory ? "Hide" : "Show"} History
                </Button>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={updateSalaryMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateSalaryMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!currentSalary && !isEditing ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Salary Information
              </h3>
              <p className="text-gray-600 mb-4">
                Set up salary information for {staff.first_name}{" "}
                {staff.last_name}
              </p>
              <Button onClick={handleEdit}>
                <Plus className="h-4 w-4 mr-2" />
                Add Salary Information
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Base Salary */}
              <div className="space-y-2">
                <Label htmlFor="base_salary">Monthly Salary (₦)</Label>
                {isEditing ? (
                  <Input
                    id="base_salary"
                    type="number"
                    placeholder="Enter monthly salary in Naira"
                    value={editData.base_salary || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        base_salary: parseFloat(e.target.value) || 0,
                        salary_type: "monthly", // Default to monthly
                      })
                    }
                  />
                ) : (
                  <div className="text-2xl font-bold text-green-600">
                    {currentSalary
                      ? formatCurrency(currentSalary.base_salary)
                      : "Not set"}
                  </div>
                )}
              </div>

              {/* Salary Type */}
              <div className="space-y-2">
                <Label htmlFor="salary_type">Salary Type</Label>
                {isEditing ? (
                  <Select
                    value={editData.salary_type || "annual"}
                    onValueChange={(value) =>
                      setEditData({
                        ...editData,
                        salary_type: value as "annual" | "hourly",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select salary type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">
                    {currentSalary?.salary_type === "annual"
                      ? "Annual Salary"
                      : currentSalary?.salary_type === "monthly"
                      ? "Monthly Salary"
                      : "Hourly Rate"}
                  </Badge>
                )}
              </div>

              {/* Hourly Rate (if applicable) */}
              {(isEditing
                ? editData.salary_type === "hourly"
                : currentSalary?.salary_type === "hourly") && (
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate</Label>
                  {isEditing ? (
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      placeholder="Enter hourly rate"
                      value={editData.hourly_rate || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          hourly_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  ) : (
                    <div className="text-lg font-semibold">
                      {currentSalary?.hourly_rate
                        ? formatCurrency(currentSalary.hourly_rate)
                        : "Not set"}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Frequency */}
              <div className="space-y-2">
                <Label htmlFor="payment_frequency">Payment Frequency</Label>
                {isEditing ? (
                  <Select
                    value={editData.payment_frequency || "monthly"}
                    onValueChange={(value) =>
                      setEditData({
                        ...editData,
                        payment_frequency: value as
                          | "weekly"
                          | "bi_weekly"
                          | "monthly",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {currentSalary?.payment_frequency || "Monthly"}
                  </Badge>
                )}
              </div>

              {/* Commission Rate */}
              <div className="space-y-2">
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                {isEditing ? (
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    max="100"
                    placeholder="Enter commission rate"
                    value={
                      editData.commission_rate
                        ? editData.commission_rate * 100
                        : ""
                    }
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        commission_rate: parseFloat(e.target.value) / 100 || 0,
                      })
                    }
                  />
                ) : (
                  <div className="text-lg font-semibold">
                    {currentSalary?.commission_rate
                      ? `${(currentSalary.commission_rate * 100).toFixed(2)}%`
                      : "0%"}
                  </div>
                )}
              </div>

              {/* Bonus Eligible */}
              <div className="space-y-2">
                <Label>Bonus Eligible</Label>
                {isEditing ? (
                  <Select
                    value={editData.bonus_eligible ? "yes" : "no"}
                    onValueChange={(value) =>
                      setEditData({
                        ...editData,
                        bonus_eligible: value === "yes",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bonus eligibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant={
                      currentSalary?.bonus_eligible ? "default" : "secondary"
                    }
                  >
                    {currentSalary?.bonus_eligible
                      ? "Eligible"
                      : "Not Eligible"}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Summary */}
      {currentSalary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Salary Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateMonthlySalary(currentSalary))}
                </div>
                <div className="text-sm text-gray-600">Monthly Salary</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculateAnnualSalary(currentSalary))}
                </div>
                <div className="text-sm text-gray-600">Annual Equivalent</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {currentSalary?.commission_rate
                    ? `${(currentSalary.commission_rate * 100).toFixed(1)}%`
                    : "0%"}
                </div>
                <div className="text-sm text-gray-600">Commission Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Salary History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : salaryHistory && salaryHistory.length > 0 ? (
              <div className="space-y-4">
                {salaryHistory.map((salary) => (
                  <div
                    key={salary.id}
                    className={`p-4 rounded-lg border ${
                      salary.is_current
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatCurrency(salary.base_salary)}
                          </span>
                          {salary.is_current && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {salary.salary_type === "annual"
                            ? "Annual Salary"
                            : salary.salary_type === "monthly"
                            ? "Monthly Salary"
                            : "Hourly Rate"}
                          {salary.commission_rate && (
                            <span className="ml-2">
                              • {(salary.commission_rate * 100).toFixed(1)}%
                              Commission
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(salary.effective_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {salary.payment_frequency}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No salary history available
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SalaryManagementSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
