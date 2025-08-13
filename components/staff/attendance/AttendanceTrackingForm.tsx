"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  X,
  Timer,
} from "lucide-react";
import { useFormValidation } from "@/hooks/useFormValidation";
import { attendanceSchema } from "@/lib/staff-form-validation";
import {
  FormErrorDisplay,
  SuccessDisplay,
} from "@/components/shared/FormErrorDisplay";
import {
  LoadingButton,
  FormLoadingOverlay,
} from "@/components/shared/LoadingStates";
import { useErrorHandler } from "@/hooks/useErrorHandler";

interface AttendanceTrackingFormProps {
  staffId: string;
  staffName: string;
  existingAttendance?: {
    id: string;
    attendanceDate: string;
    clockInTime?: string;
    clockOutTime?: string;
    status: "present" | "absent" | "late" | "early_departure";
    notes?: string;
  };
  onSave: (attendanceData: any) => Promise<void>;
  onCancel: () => void;
}

interface FormData {
  attendanceDate: string;
  clockInTime?: string;
  clockOutTime?: string;
  status: "present" | "absent" | "late" | "early_departure";
  notes?: string;
}

const statusOptions = [
  {
    value: "present",
    label: "Present",
    icon: CheckCircle,
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  },
  {
    value: "absent",
    label: "Absent",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  },
  {
    value: "late",
    label: "Late",
    icon: AlertTriangle,
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
  {
    value: "early_departure",
    label: "Early Departure",
    icon: Timer,
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  },
];

export function AttendanceTrackingForm({
  staffId,
  staffName,
  existingAttendance,
  onSave,
  onCancel,
}: AttendanceTrackingFormProps) {
  const { handleError, showSuccessToast, showErrorToast } = useErrorHandler();
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);

  const {
    values,
    errors,
    isSubmitting,
    setValue,
    handleSubmit,
    getFieldProps,
    clearErrors,
    reset,
  } = useFormValidation<FormData>({
    schema: attendanceSchema,
    onSubmit: async (data) => {
      try {
        const attendanceData = {
          ...data,
          staffId,
          id: existingAttendance?.id,
        };

        await onSave(attendanceData);

        setSaveSuccess(
          existingAttendance
            ? "Attendance record updated successfully!"
            : "Attendance record created successfully!"
        );
        showSuccessToast(
          existingAttendance
            ? "Attendance record updated successfully!"
            : "Attendance record created successfully!"
        );

        // Reset form if creating new record
        if (!existingAttendance) {
          setTimeout(() => {
            reset();
            setSaveSuccess(null);
          }, 2000);
        }
      } catch (error) {
        console.error("Error saving attendance record:", error);
        handleError(error as Error);
        throw error;
      }
    },
    onError: (formErrors) => {
      showErrorToast("Please fix the form errors and try again");
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Initialize form with existing data
  React.useEffect(() => {
    if (existingAttendance) {
      setValue("attendanceDate", existingAttendance.attendanceDate);
      setValue("clockInTime", existingAttendance.clockInTime || "");
      setValue("clockOutTime", existingAttendance.clockOutTime || "");
      setValue("status", existingAttendance.status);
      setValue("notes", existingAttendance.notes || "");
    } else {
      // Set default values for new record
      const today = new Date().toISOString().split("T")[0];
      setValue("attendanceDate", today);
      setValue("status", "present");
    }
  }, [existingAttendance, setValue]);

  const handleCancel = () => {
    clearErrors();
    setSaveSuccess(null);
    onCancel();
  };

  const handleStatusChange = (status: string) => {
    setValue("status", status as FormData["status"]);

    // Clear clock times for absent status
    if (status === "absent") {
      setValue("clockInTime", "");
      setValue("clockOutTime", "");
    }
  };

  const calculateWorkingHours = () => {
    if (values.clockInTime && values.clockOutTime) {
      const clockIn = new Date(
        `${values.attendanceDate}T${values.clockInTime}`
      );
      const clockOut = new Date(
        `${values.attendanceDate}T${values.clockOutTime}`
      );
      const diffMs = clockOut.getTime() - clockIn.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0) {
        return diffHours.toFixed(2);
      }
    }
    return null;
  };

  const workingHours = calculateWorkingHours();
  const selectedStatus = statusOptions.find(
    (option) => option.value === values.status
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {existingAttendance
              ? "Edit Attendance Record"
              : "Record Attendance"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {existingAttendance ? "Update" : "Create"} attendance record for{" "}
          {staffName}
        </p>
      </CardHeader>

      <CardContent>
        <FormLoadingOverlay
          isLoading={isSubmitting}
          message="Saving attendance record..."
        >
          {/* Success Message */}
          {saveSuccess && (
            <SuccessDisplay
              message={saveSuccess}
              className="mb-4"
              autoHide
              autoHideDelay={3000}
              onDismiss={() => setSaveSuccess(null)}
            />
          )}

          {/* Form Errors */}
          <FormErrorDisplay
            errors={errors}
            className="mb-4"
            onDismiss={clearErrors}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Attendance Date */}
            <div className="space-y-2">
              <Label
                htmlFor="attendanceDate"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Attendance Date *
              </Label>
              <Input
                id="attendanceDate"
                type="date"
                {...getFieldProps("attendanceDate")}
                disabled={isSubmitting}
                className={errors.attendanceDate ? "border-red-500" : ""}
              />
              {errors.attendanceDate && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.attendanceDate}
                </p>
              )}
            </div>

            {/* Attendance Status */}
            <div className="space-y-2">
              <Label>Attendance Status *</Label>
              <Select
                value={values.status || ""}
                onValueChange={handleStatusChange}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  className={errors.status ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select attendance status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.status}
                </p>
              )}

              {/* Status Badge */}
              {selectedStatus && (
                <div className="flex items-center gap-2">
                  <Badge className={selectedStatus.color}>
                    <selectedStatus.icon className="h-3 w-3 mr-1" />
                    {selectedStatus.label}
                  </Badge>
                </div>
              )}
            </div>

            {/* Clock Times - Only show if not absent */}
            {values.status !== "absent" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="clockInTime"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Clock In Time
                  </Label>
                  <Input
                    id="clockInTime"
                    type="time"
                    {...getFieldProps("clockInTime")}
                    disabled={isSubmitting}
                    className={errors.clockInTime ? "border-red-500" : ""}
                  />
                  {errors.clockInTime && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.clockInTime}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="clockOutTime"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Clock Out Time
                  </Label>
                  <Input
                    id="clockOutTime"
                    type="time"
                    {...getFieldProps("clockOutTime")}
                    disabled={isSubmitting}
                    className={errors.clockOutTime ? "border-red-500" : ""}
                  />
                  {errors.clockOutTime && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.clockOutTime}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Working Hours Display */}
            {workingHours && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    Working Hours: {workingHours} hours
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this attendance record..."
                {...getFieldProps("notes")}
                disabled={isSubmitting}
                className={errors.notes ? "border-red-500" : ""}
                rows={3}
              />
              {errors.notes && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.notes}
                </p>
              )}
            </div>

            {/* Attendance Guidelines */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Attendance Guidelines:
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Mark "Present" for on-time attendance</li>
                <li>• Mark "Late" if arrival is after scheduled start time</li>
                <li>
                  • Mark "Early Departure" if leaving before scheduled end time
                </li>
                <li>• Mark "Absent" for no-shows or approved absences</li>
                <li>• Clock times are optional for absent status</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isLoading={isSubmitting}
                loadingText={
                  existingAttendance ? "Updating..." : "Recording..."
                }
                icon="save"
              >
                {existingAttendance ? "Update Record" : "Record Attendance"}
              </LoadingButton>
            </div>
          </form>
        </FormLoadingOverlay>
      </CardContent>
    </Card>
  );
}
