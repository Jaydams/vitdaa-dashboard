"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Save, X } from "lucide-react";
import { useFormValidation } from "@/hooks/useFormValidation";
import { shiftScheduleSchema } from "@/lib/staff-form-validation";
import {
  FormErrorDisplay,
  SuccessDisplay,
} from "@/components/shared/FormErrorDisplay";
import {
  LoadingButton,
  FormLoadingOverlay,
} from "@/components/shared/LoadingStates";
import { useErrorHandler } from "@/hooks/useErrorHandler";

interface ShiftScheduleFormProps {
  staffId: string;
  staffName: string;
  existingShift?: {
    id: string;
    shiftDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    breakDurationMinutes: number;
    notes?: string;
  };
  onSave: (shiftData: any) => Promise<void>;
  onCancel: () => void;
}

interface FormData {
  shiftDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  breakDurationMinutes: number;
  notes?: string;
}

export function ShiftScheduleForm({
  staffId,
  staffName,
  existingShift,
  onSave,
  onCancel,
}: ShiftScheduleFormProps) {
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
    schema: shiftScheduleSchema,
    onSubmit: async (data) => {
      try {
        const shiftData = {
          ...data,
          staffId,
          id: existingShift?.id,
        };

        await onSave(shiftData);

        setSaveSuccess(
          existingShift
            ? "Shift schedule updated successfully!"
            : "Shift schedule created successfully!"
        );
        showSuccessToast(
          existingShift
            ? "Shift schedule updated successfully!"
            : "Shift schedule created successfully!"
        );

        // Reset form if creating new shift
        if (!existingShift) {
          setTimeout(() => {
            reset();
            setSaveSuccess(null);
          }, 2000);
        }
      } catch (error) {
        console.error("Error saving shift schedule:", error);
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
    if (existingShift) {
      setValue("shiftDate", existingShift.shiftDate);
      setValue("scheduledStartTime", existingShift.scheduledStartTime);
      setValue("scheduledEndTime", existingShift.scheduledEndTime);
      setValue("breakDurationMinutes", existingShift.breakDurationMinutes);
      setValue("notes", existingShift.notes || "");
    } else {
      // Set default values for new shift
      const today = new Date().toISOString().split("T")[0];
      setValue("shiftDate", today);
      setValue("scheduledStartTime", "09:00");
      setValue("scheduledEndTime", "17:00");
      setValue("breakDurationMinutes", 60);
    }
  }, [existingShift, setValue]);

  const handleCancel = () => {
    clearErrors();
    setSaveSuccess(null);
    onCancel();
  };

  const calculateShiftDuration = () => {
    if (values.scheduledStartTime && values.scheduledEndTime) {
      const start = new Date(`2000-01-01T${values.scheduledStartTime}:00`);
      const end = new Date(`2000-01-01T${values.scheduledEndTime}:00`);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0) {
        const workingHours =
          diffHours - (values.breakDurationMinutes || 0) / 60;
        return {
          totalHours: diffHours.toFixed(1),
          workingHours: workingHours.toFixed(1),
        };
      }
    }
    return null;
  };

  const duration = calculateShiftDuration();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {existingShift ? "Edit Shift Schedule" : "Schedule New Shift"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {existingShift ? "Update" : "Create"} shift schedule for {staffName}
        </p>
      </CardHeader>

      <CardContent>
        <FormLoadingOverlay
          isLoading={isSubmitting}
          message="Saving shift schedule..."
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
            {/* Shift Date */}
            <div className="space-y-2">
              <Label htmlFor="shiftDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Shift Date *
              </Label>
              <Input
                id="shiftDate"
                type="date"
                {...getFieldProps("shiftDate")}
                disabled={isSubmitting}
                className={errors.shiftDate ? "border-red-500" : ""}
              />
              {errors.shiftDate && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.shiftDate}
                </p>
              )}
            </div>

            {/* Time Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="scheduledStartTime"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Start Time *
                </Label>
                <Input
                  id="scheduledStartTime"
                  type="time"
                  {...getFieldProps("scheduledStartTime")}
                  disabled={isSubmitting}
                  className={errors.scheduledStartTime ? "border-red-500" : ""}
                />
                {errors.scheduledStartTime && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.scheduledStartTime}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="scheduledEndTime"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  End Time *
                </Label>
                <Input
                  id="scheduledEndTime"
                  type="time"
                  {...getFieldProps("scheduledEndTime")}
                  disabled={isSubmitting}
                  className={errors.scheduledEndTime ? "border-red-500" : ""}
                />
                {errors.scheduledEndTime && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.scheduledEndTime}
                  </p>
                )}
              </div>
            </div>

            {/* Break Duration */}
            <div className="space-y-2">
              <Label htmlFor="breakDurationMinutes">
                Break Duration (minutes)
              </Label>
              <Input
                id="breakDurationMinutes"
                type="number"
                min="0"
                max="480"
                step="15"
                {...getFieldProps("breakDurationMinutes")}
                disabled={isSubmitting}
                className={errors.breakDurationMinutes ? "border-red-500" : ""}
              />
              {errors.breakDurationMinutes && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.breakDurationMinutes}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Standard break duration (e.g., 30, 60, or 90 minutes)
              </p>
            </div>

            {/* Shift Duration Display */}
            {duration && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    Shift Summary:
                  </span>
                </div>
                <div className="mt-2 text-sm text-blue-800 dark:text-blue-200">
                  <p>Total shift duration: {duration.totalHours} hours</p>
                  <p>
                    Working hours (excluding breaks): {duration.workingHours}{" "}
                    hours
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any special instructions or notes for this shift..."
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
                loadingText={existingShift ? "Updating..." : "Creating..."}
                icon="save"
              >
                {existingShift ? "Update Shift" : "Create Shift"}
              </LoadingButton>
            </div>
          </form>
        </FormLoadingOverlay>
      </CardContent>
    </Card>
  );
}
