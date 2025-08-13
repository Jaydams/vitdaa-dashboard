"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  User,
  Building,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface StaffTransferData {
  staffId: string;
  currentPosition: string;
  currentDepartment: string;
  currentManager: string;
  newPosition: string;
  newDepartment: string;
  newManager: string;
  transferDate: string;
  transferReason: string;
  salaryChange: {
    hasChange: boolean;
    newSalary: number;
    effectiveDate: string;
  };
  accessUpdates: {
    revokeAccess: string[];
    grantAccess: string[];
  };
  handoverTasks: {
    task: string;
    assignedTo: string;
    dueDate: string;
    completed: boolean;
  }[];
  approvals: {
    currentManager: boolean;
    newManager: boolean;
    hr: boolean;
  };
}

interface StaffTransferWorkflowProps {
  staffId: string;
  currentStaffData: {
    name: string;
    position: string;
    department: string;
    manager: string;
    salary: number;
  };
  onComplete: (data: StaffTransferData) => void;
  onCancel: () => void;
}

export default function StaffTransferWorkflow({
  staffId,
  currentStaffData,
  onComplete,
  onCancel,
}: StaffTransferWorkflowProps) {
  const [transferData, setTransferData] = useState<StaffTransferData>({
    staffId,
    currentPosition: currentStaffData.position,
    currentDepartment: currentStaffData.department,
    currentManager: currentStaffData.manager,
    newPosition: "",
    newDepartment: "",
    newManager: "",
    transferDate: "",
    transferReason: "",
    salaryChange: {
      hasChange: false,
      newSalary: currentStaffData.salary,
      effectiveDate: "",
    },
    accessUpdates: {
      revokeAccess: [],
      grantAccess: [],
    },
    handoverTasks: [],
    approvals: {
      currentManager: false,
      newManager: false,
      hr: false,
    },
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: "transfer-details", title: "Transfer Details", icon: ArrowRight },
    { id: "salary-changes", title: "Salary Changes", icon: FileText },
    { id: "access-updates", title: "Access Updates", icon: Building },
    { id: "handover-tasks", title: "Handover Tasks", icon: CheckCircle },
    { id: "approvals", title: "Approvals", icon: User },
  ];

  const handleInputChange = (field: string, value: any) => {
    setTransferData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedInputChange = (
    section: keyof StaffTransferData,
    field: string,
    value: any
  ) => {
    setTransferData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }));
  };

  const addHandoverTask = () => {
    setTransferData((prev) => ({
      ...prev,
      handoverTasks: [
        ...prev.handoverTasks,
        {
          task: "",
          assignedTo: "",
          dueDate: "",
          completed: false,
        },
      ],
    }));
  };

  const updateHandoverTask = (index: number, field: string, value: any) => {
    setTransferData((prev) => ({
      ...prev,
      handoverTasks: prev.handoverTasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      ),
    }));
  };

  const removeHandoverTask = (index: number) => {
    setTransferData((prev) => ({
      ...prev,
      handoverTasks: prev.handoverTasks.filter((_, i) => i !== index),
    }));
  };

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (steps[stepIndex].id) {
      case "transfer-details":
        if (!transferData.newPosition)
          newErrors.newPosition = "New position is required";
        if (!transferData.newDepartment)
          newErrors.newDepartment = "New department is required";
        if (!transferData.transferDate)
          newErrors.transferDate = "Transfer date is required";
        if (!transferData.transferReason)
          newErrors.transferReason = "Transfer reason is required";
        break;
      case "salary-changes":
        if (transferData.salaryChange.hasChange) {
          if (!transferData.salaryChange.newSalary)
            newErrors.newSalary = "New salary is required";
          if (!transferData.salaryChange.effectiveDate)
            newErrors.effectiveDate = "Effective date is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (validateStep(currentStep)) {
      onComplete(transferData);
    }
  };

  const renderTransferDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <p className="font-medium">{currentStaffData.name}</p>
            </div>
            <div>
              <Label>Current Position</Label>
              <p className="font-medium">{transferData.currentPosition}</p>
            </div>
            <div>
              <Label>Current Department</Label>
              <p className="font-medium">{transferData.currentDepartment}</p>
            </div>
            <div>
              <Label>Current Manager</Label>
              <p className="font-medium">{transferData.currentManager}</p>
            </div>
          </CardContent>
        </Card>

        {/* New Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newPosition">New Position *</Label>
              <Input
                id="newPosition"
                value={transferData.newPosition}
                onChange={(e) =>
                  handleInputChange("newPosition", e.target.value)
                }
                className={errors.newPosition ? "border-red-500" : ""}
              />
              {errors.newPosition && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.newPosition}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="newDepartment">New Department *</Label>
              <Select
                value={transferData.newDepartment}
                onValueChange={(value) =>
                  handleInputChange("newDepartment", value)
                }
              >
                <SelectTrigger
                  className={errors.newDepartment ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
              {errors.newDepartment && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.newDepartment}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="newManager">New Manager</Label>
              <Input
                id="newManager"
                value={transferData.newManager}
                onChange={(e) =>
                  handleInputChange("newManager", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transferDate">Transfer Date *</Label>
          <Input
            id="transferDate"
            type="date"
            value={transferData.transferDate}
            onChange={(e) => handleInputChange("transferDate", e.target.value)}
            className={errors.transferDate ? "border-red-500" : ""}
          />
          {errors.transferDate && (
            <p className="text-red-500 text-sm mt-1">{errors.transferDate}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="transferReason">Transfer Reason *</Label>
        <Textarea
          id="transferReason"
          value={transferData.transferReason}
          onChange={(e) => handleInputChange("transferReason", e.target.value)}
          className={errors.transferReason ? "border-red-500" : ""}
          placeholder="Explain the reason for this transfer..."
        />
        {errors.transferReason && (
          <p className="text-red-500 text-sm mt-1">{errors.transferReason}</p>
        )}
      </div>
    </div>
  );

  const renderSalaryChangesStep = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hasSalaryChange"
          checked={transferData.salaryChange.hasChange}
          onCheckedChange={(checked) =>
            handleNestedInputChange("salaryChange", "hasChange", checked)
          }
        />
        <Label htmlFor="hasSalaryChange">
          This transfer includes a salary change
        </Label>
      </div>

      {transferData.salaryChange.hasChange && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Salary Change Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Current Salary</Label>
                <p className="font-medium">${currentStaffData.salary}/hour</p>
              </div>
              <div>
                <Label htmlFor="newSalary">New Salary *</Label>
                <Input
                  id="newSalary"
                  type="number"
                  step="0.01"
                  value={transferData.salaryChange.newSalary}
                  onChange={(e) =>
                    handleNestedInputChange(
                      "salaryChange",
                      "newSalary",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className={errors.newSalary ? "border-red-500" : ""}
                />
                {errors.newSalary && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.newSalary}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="effectiveDate">Effective Date *</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={transferData.salaryChange.effectiveDate}
                onChange={(e) =>
                  handleNestedInputChange(
                    "salaryChange",
                    "effectiveDate",
                    e.target.value
                  )
                }
                className={errors.effectiveDate ? "border-red-500" : ""}
              />
              {errors.effectiveDate && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.effectiveDate}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAccessUpdatesStep = () => (
    <div className="space-y-6">
      <Alert>
        <Building className="h-4 w-4" />
        <AlertDescription>
          Review and update system access permissions for the new role.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">
              Revoke Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Kitchen Management System",
              "Inventory Management",
              "Staff Scheduling",
              "Financial Reports",
              "Admin Panel",
            ].map((access) => (
              <div key={access} className="flex items-center space-x-2">
                <Checkbox
                  checked={transferData.accessUpdates.revokeAccess.includes(
                    access
                  )}
                  onCheckedChange={(checked) => {
                    const updated = checked
                      ? [...transferData.accessUpdates.revokeAccess, access]
                      : transferData.accessUpdates.revokeAccess.filter(
                          (a) => a !== access
                        );
                    handleNestedInputChange(
                      "accessUpdates",
                      "revokeAccess",
                      updated
                    );
                  }}
                />
                <Label className="text-sm">{access}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-600">
              Grant Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Service Management System",
              "Customer Management",
              "Order Processing",
              "Delivery Tracking",
              "Training Materials",
            ].map((access) => (
              <div key={access} className="flex items-center space-x-2">
                <Checkbox
                  checked={transferData.accessUpdates.grantAccess.includes(
                    access
                  )}
                  onCheckedChange={(checked) => {
                    const updated = checked
                      ? [...transferData.accessUpdates.grantAccess, access]
                      : transferData.accessUpdates.grantAccess.filter(
                          (a) => a !== access
                        );
                    handleNestedInputChange(
                      "accessUpdates",
                      "grantAccess",
                      updated
                    );
                  }}
                />
                <Label className="text-sm">{access}</Label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderHandoverTasksStep = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Handover Tasks</h3>
        <Button onClick={addHandoverTask} variant="outline">
          Add Task
        </Button>
      </div>

      <div className="space-y-4">
        {transferData.handoverTasks.map((task, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`task-${index}`}>Task Description</Label>
                  <Input
                    id={`task-${index}`}
                    value={task.task}
                    onChange={(e) =>
                      updateHandoverTask(index, "task", e.target.value)
                    }
                    placeholder="Describe the task..."
                  />
                </div>
                <div>
                  <Label htmlFor={`assignedTo-${index}`}>Assigned To</Label>
                  <Input
                    id={`assignedTo-${index}`}
                    value={task.assignedTo}
                    onChange={(e) =>
                      updateHandoverTask(index, "assignedTo", e.target.value)
                    }
                    placeholder="Staff member name..."
                  />
                </div>
                <div>
                  <Label htmlFor={`dueDate-${index}`}>Due Date</Label>
                  <Input
                    id={`dueDate-${index}`}
                    type="date"
                    value={task.dueDate}
                    onChange={(e) =>
                      updateHandoverTask(index, "dueDate", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) =>
                      updateHandoverTask(index, "completed", checked)
                    }
                  />
                  <Label className="text-sm">Task completed</Label>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeHandoverTask(index)}
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {transferData.handoverTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No handover tasks added yet. Click "Add Task" to create one.
          </div>
        )}
      </div>
    </div>
  );

  const renderApprovalsStep = () => (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          All required approvals must be obtained before the transfer can be
          completed.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Current Manager Approval</h4>
                <p className="text-sm text-gray-600">
                  {transferData.currentManager}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={transferData.approvals.currentManager}
                  onCheckedChange={(checked) =>
                    handleNestedInputChange(
                      "approvals",
                      "currentManager",
                      checked
                    )
                  }
                />
                {transferData.approvals.currentManager ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">New Manager Approval</h4>
                <p className="text-sm text-gray-600">
                  {transferData.newManager || "To be assigned"}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={transferData.approvals.newManager}
                  onCheckedChange={(checked) =>
                    handleNestedInputChange("approvals", "newManager", checked)
                  }
                />
                {transferData.approvals.newManager ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">HR Approval</h4>
                <p className="text-sm text-gray-600">
                  Human Resources Department
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={transferData.approvals.hr}
                  onCheckedChange={(checked) =>
                    handleNestedInputChange("approvals", "hr", checked)
                  }
                />
                {transferData.approvals.hr ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case "transfer-details":
        return renderTransferDetailsStep();
      case "salary-changes":
        return renderSalaryChangesStep();
      case "access-updates":
        return renderAccessUpdatesStep();
      case "handover-tasks":
        return renderHandoverTasksStep();
      case "approvals":
        return renderApprovalsStep();
      default:
        return <div>Step not found</div>;
    }
  };

  const allApprovalsReceived = Object.values(transferData.approvals).every(
    Boolean
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ArrowRight className="h-6 w-6" />
            Staff Transfer Workflow
          </CardTitle>
          <p className="text-gray-600">
            Transfer {currentStaffData.name} from{" "}
            {transferData.currentDepartment} to a new role
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      index === currentStep
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{step.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-xl">
              {steps[currentStep].title}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderStepContent()}</CardContent>
          <div className="p-6 border-t flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
            </div>
            <div className="flex gap-2">
              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleComplete}
                  disabled={!allApprovalsReceived}
                >
                  Complete Transfer
                </Button>
              ) : (
                <Button onClick={handleNext}>Next</Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
