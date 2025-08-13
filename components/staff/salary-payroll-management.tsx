"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  StaffSalary,
  SalaryType,
  PaymentFrequency,
  Staff,
} from "@/types/staff";
import { formatAmount } from "@/helpers/formatAmount";
import { useStaffSalary } from "@/hooks/useStaffSalary";
import {
  DollarSign,
  Edit,
  History,
  Calculator,
  TrendingUp,
  AlertCircle,
  Plus,
  Save,
  X,
  Loader2,
} from "lucide-react";

interface SalaryPayrollManagementProps {
  staff: Staff;
}

interface PayrollCalculation {
  base_pay: number;
  commission: number;
  total: number;
  salary_type: string;
}

export function SalaryPayrollManagement({
  staff,
}: SalaryPayrollManagementProps) {
  const {
    currentSalary,
    salaryHistory,
    loading,
    error,
    createSalary,
    updateSalary,
    calculatePayroll: calculatePayrollAPI,
  } = useStaffSalary(staff.id);

  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StaffSalary>>({});
  const [createForm, setCreateForm] = useState<Partial<StaffSalary>>({
    salary_type: "hourly",
    payment_frequency: "weekly",
    commission_rate: 0,
    bonus_eligible: false,
    effective_date: new Date().toISOString().split("T")[0],
  });
  const [payrollCalculation, setPayrollCalculation] =
    useState<PayrollCalculation | null>(null);
  const [calculationInputs, setCalculationInputs] = useState({
    hoursWorked: 40,
    commissionAmount: 0,
    includeCommission: false,
  });
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (currentSalary && isEditing) {
      setEditForm(currentSalary);
    }
  }, [currentSalary, isEditing]);

  const handleEditSalary = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!currentSalary) return;

    try {
      await updateSalary(editForm);
      setIsEditing(false);
      setEditForm({});
    } catch {
      // Error is handled by the hook
    }
  };

  const handleCreateSalary = async () => {
    // Validate required fields
    const validationErrors: string[] = [];

    if (!createForm.salary_type) {
      validationErrors.push("Salary type is required");
    }

    if (!createForm.payment_frequency) {
      validationErrors.push("Payment frequency is required");
    }

    if (!createForm.effective_date) {
      validationErrors.push("Effective date is required");
    }

    if (
      createForm.salary_type === "hourly" &&
      (!createForm.hourly_rate || createForm.hourly_rate <= 0)
    ) {
      validationErrors.push("Valid hourly rate is required");
    }

    if (
      createForm.salary_type !== "hourly" &&
      (!createForm.base_salary || createForm.base_salary <= 0)
    ) {
      validationErrors.push("Valid base salary is required");
    }

    if (validationErrors.length > 0) {
      // Show validation errors to user
      console.error("Validation errors:", validationErrors);
      return;
    }

    try {
      await createSalary({
        ...createForm,
        staff_id: staff.id,
        business_id: staff.business_id,
        is_current: true,
      } as Partial<StaffSalary>);
      setIsCreating(false);
      setCreateForm({
        salary_type: "hourly",
        payment_frequency: "weekly",
        commission_rate: 0,
        bonus_eligible: false,
        effective_date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Error creating salary:", error);
      // Error is handled by the hook
    }
  };

  const calculatePayroll = async () => {
    if (!currentSalary) return;

    setLocalLoading(true);
    try {
      const { hoursWorked, commissionAmount, includeCommission } =
        calculationInputs;

      const calculation = await calculatePayrollAPI(
        hoursWorked,
        includeCommission,
        commissionAmount
      );

      if (calculation) {
        setPayrollCalculation(calculation);
      }
    } catch {
      // Error is handled by the hook
    } finally {
      setLocalLoading(false);
    }
  };

  const getSalaryDisplayValue = (salary: StaffSalary) => {
    if (salary.salary_type === "hourly") {
      return `$${salary.hourly_rate || 0}/hour`;
    }
    return `$${formatAmount(salary.base_salary || 0)}/${salary.salary_type}`;
  };

  const getPaymentFrequencyLabel = (frequency: PaymentFrequency) => {
    switch (frequency) {
      case "weekly":
        return "Weekly";
      case "bi_weekly":
        return "Bi-weekly";
      case "monthly":
        return "Monthly";
      default:
        return frequency;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current Salary</TabsTrigger>
          <TabsTrigger value="history">Salary History</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Calculator</TabsTrigger>
          <TabsTrigger value="commission">Commission & Bonus</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Current Salary Information
              </CardTitle>
              {currentSalary ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditSalary}
                  disabled={isEditing || loading}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Salary
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Salary Information</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="salary_type">Salary Type</Label>
                          <Select
                            value={createForm.salary_type}
                            onValueChange={(value: SalaryType) =>
                              setCreateForm({
                                ...createForm,
                                salary_type: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="payment_frequency">
                            Payment Frequency
                          </Label>
                          <Select
                            value={createForm.payment_frequency}
                            onValueChange={(value: PaymentFrequency) =>
                              setCreateForm({
                                ...createForm,
                                payment_frequency: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="bi_weekly">
                                Bi-weekly
                              </SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {createForm.salary_type === "hourly" ? (
                        <div>
                          <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                          <Input
                            id="hourly_rate"
                            type="number"
                            step="0.01"
                            value={createForm.hourly_rate || ""}
                            onChange={(e) =>
                              setCreateForm({
                                ...createForm,
                                hourly_rate: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="base_salary">Base Salary ($)</Label>
                          <Input
                            id="base_salary"
                            type="number"
                            step="0.01"
                            value={createForm.base_salary || ""}
                            onChange={(e) =>
                              setCreateForm({
                                ...createForm,
                                base_salary: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="commission_rate">
                            Commission Rate (%)
                          </Label>
                          <Input
                            id="commission_rate"
                            type="number"
                            step="0.01"
                            value={createForm.commission_rate || 0}
                            onChange={(e) =>
                              setCreateForm({
                                ...createForm,
                                commission_rate:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            id="bonus_eligible"
                            checked={createForm.bonus_eligible || false}
                            onCheckedChange={(checked) =>
                              setCreateForm({
                                ...createForm,
                                bonus_eligible: checked,
                              })
                            }
                          />
                          <Label htmlFor="bonus_eligible">Bonus Eligible</Label>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="effective_date">Effective Date</Label>
                        <Input
                          id="effective_date"
                          type="date"
                          value={createForm.effective_date || ""}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              effective_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreating(false)}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleCreateSalary} disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create"
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {currentSalary ? (
                <div className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit_salary_type">Salary Type</Label>
                          <Select
                            value={editForm.salary_type}
                            onValueChange={(value: SalaryType) =>
                              setEditForm({ ...editForm, salary_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="edit_payment_frequency">
                            Payment Frequency
                          </Label>
                          <Select
                            value={editForm.payment_frequency}
                            onValueChange={(value: PaymentFrequency) =>
                              setEditForm({
                                ...editForm,
                                payment_frequency: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="bi_weekly">
                                Bi-weekly
                              </SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {editForm.salary_type === "hourly" ? (
                        <div>
                          <Label htmlFor="edit_hourly_rate">
                            Hourly Rate ($)
                          </Label>
                          <Input
                            id="edit_hourly_rate"
                            type="number"
                            step="0.01"
                            value={editForm.hourly_rate || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                hourly_rate: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="edit_base_salary">
                            Base Salary ($)
                          </Label>
                          <Input
                            id="edit_base_salary"
                            type="number"
                            step="0.01"
                            value={editForm.base_salary || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                base_salary: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit_commission_rate">
                            Commission Rate (%)
                          </Label>
                          <Input
                            id="edit_commission_rate"
                            type="number"
                            step="0.01"
                            value={editForm.commission_rate || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                commission_rate:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            id="edit_bonus_eligible"
                            checked={editForm.bonus_eligible || false}
                            onCheckedChange={(checked) =>
                              setEditForm({
                                ...editForm,
                                bonus_eligible: checked,
                              })
                            }
                          />
                          <Label htmlFor="edit_bonus_eligible">
                            Bonus Eligible
                          </Label>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={loading}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={loading}>
                          <Save className="h-4 w-4 mr-2" />
                          {loading ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Salary Amount
                          </Label>
                          <p className="text-2xl font-bold">
                            {getSalaryDisplayValue(currentSalary)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Payment Frequency
                          </Label>
                          <p className="text-sm">
                            {getPaymentFrequencyLabel(
                              currentSalary.payment_frequency
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Effective Date
                          </Label>
                          <p className="text-sm">
                            {new Date(
                              currentSalary.effective_date
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Commission Rate
                          </Label>
                          <p className="text-sm">
                            {currentSalary.commission_rate}%
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Bonus Eligible
                          </Label>
                          <Badge
                            variant={
                              currentSalary.bonus_eligible
                                ? "default"
                                : "secondary"
                            }
                          >
                            {currentSalary.bonus_eligible ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Status
                          </Label>
                          <Badge
                            variant={
                              currentSalary.is_current ? "default" : "secondary"
                            }
                          >
                            {currentSalary.is_current
                              ? "Current"
                              : "Historical"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No salary information available for this staff member.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Salary History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salaryHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Salary Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryHistory.map((salary) => (
                      <TableRow key={salary.id}>
                        <TableCell>
                          {new Date(salary.effective_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {salary.end_date
                            ? new Date(salary.end_date).toLocaleDateString()
                            : "Current"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {salary.salary_type}
                        </TableCell>
                        <TableCell>{getSalaryDisplayValue(salary)}</TableCell>
                        <TableCell>{salary.commission_rate}%</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              salary.is_current ? "default" : "secondary"
                            }
                          >
                            {salary.is_current ? "Current" : "Historical"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No salary history available.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Payroll Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSalary ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="hours_worked">Hours Worked</Label>
                      <Input
                        id="hours_worked"
                        type="number"
                        step="0.5"
                        value={calculationInputs.hoursWorked}
                        onChange={(e) =>
                          setCalculationInputs({
                            ...calculationInputs,
                            hoursWorked: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="commission_amount">
                        Commission Amount ($)
                      </Label>
                      <Input
                        id="commission_amount"
                        type="number"
                        step="0.01"
                        value={calculationInputs.commissionAmount}
                        onChange={(e) =>
                          setCalculationInputs({
                            ...calculationInputs,
                            commissionAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={!currentSalary.bonus_eligible}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="include_commission"
                        checked={calculationInputs.includeCommission}
                        onCheckedChange={(checked) =>
                          setCalculationInputs({
                            ...calculationInputs,
                            includeCommission: checked,
                          })
                        }
                        disabled={!currentSalary.bonus_eligible}
                      />
                      <Label htmlFor="include_commission">
                        Include Commission
                      </Label>
                    </div>
                  </div>

                  <Button
                    onClick={calculatePayroll}
                    disabled={loading || localLoading}
                    className="w-full"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {localLoading ? "Calculating..." : "Calculate Payroll"}
                  </Button>

                  {payrollCalculation && (
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Payroll Calculation Results
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <Label className="text-sm font-medium text-muted-foreground">
                              Base Pay
                            </Label>
                            <p className="text-2xl font-bold">
                              ${formatAmount(payrollCalculation.base_pay)}
                            </p>
                          </div>
                          <div className="text-center">
                            <Label className="text-sm font-medium text-muted-foreground">
                              Commission
                            </Label>
                            <p className="text-2xl font-bold">
                              ${formatAmount(payrollCalculation.commission)}
                            </p>
                          </div>
                          <div className="text-center">
                            <Label className="text-sm font-medium text-muted-foreground">
                              Total Pay
                            </Label>
                            <p className="text-3xl font-bold text-primary">
                              ${formatAmount(payrollCalculation.total)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Please set up salary information first to use the payroll
                    calculator.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Commission & Bonus Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSalary ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Commission Rate
                        </Label>
                        <p className="text-2xl font-bold">
                          {currentSalary.commission_rate}%
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Bonus Eligible
                        </Label>
                        <Badge
                          variant={
                            currentSalary.bonus_eligible
                              ? "default"
                              : "secondary"
                          }
                          className="ml-2"
                        >
                          {currentSalary.bonus_eligible ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Payment Frequency
                        </Label>
                        <p className="text-lg">
                          {getPaymentFrequencyLabel(
                            currentSalary.payment_frequency
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Last Updated
                        </Label>
                        <p className="text-sm">
                          {new Date(
                            currentSalary.updated_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentSalary.bonus_eligible && (
                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-4">
                        Commission Calculator
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="sales_amount">Sales Amount ($)</Label>
                          <Input
                            id="sales_amount"
                            type="number"
                            step="0.01"
                            placeholder="Enter sales amount"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Commission Rate
                          </Label>
                          <p className="text-lg font-medium pt-2">
                            {currentSalary.commission_rate}%
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Estimated Commission
                          </Label>
                          <p className="text-lg font-bold text-primary pt-2">
                            $0.00
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Please set up salary information first to track commission
                    and bonuses.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
