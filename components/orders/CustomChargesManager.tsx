"use client";

import { useState, useCallback } from "react";
import { Plus, X, Percent, DollarSign } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomCharge } from "@/types/order";

interface CustomChargesManagerProps {
  charges: CustomCharge[];
  onChargesChange: (charges: CustomCharge[]) => void;
  subtotal: number;
  disabled?: boolean;
}

interface AddChargeFormData {
  charge_name: string;
  charge_type: "percentage" | "fixed";
  charge_value: number;
}

interface FormErrors {
  charge_name?: string;
  charge_type?: string;
  charge_value?: string;
}

export function CustomChargesManager({
  charges,
  onChargesChange,
  subtotal,
  disabled = false,
}: CustomChargesManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AddChargeFormData>({
    charge_name: "",
    charge_type: "fixed",
    charge_value: 0,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const calculateChargeAmount = useCallback(
    (type: "percentage" | "fixed", value: number): number => {
      if (type === "percentage") {
        return Math.round((subtotal * value) / 100);
      }
      return Math.round(value * 100); // Convert to cents
    },
    [subtotal]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.charge_name.trim()) {
      newErrors.charge_name = "Charge name is required";
    }

    if (formData.charge_value <= 0) {
      newErrors.charge_value = "Charge value must be greater than 0";
    }

    if (formData.charge_type === "percentage" && formData.charge_value > 100) {
      newErrors.charge_value = "Percentage cannot exceed 100%";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleAddCharge = useCallback(() => {
    if (!validateForm()) return;

    const calculated_amount = calculateChargeAmount(
      formData.charge_type,
      formData.charge_value
    );

    const newCharge: CustomCharge = {
      id: `temp-${Date.now()}`, // Temporary ID for new charges
      charge_name: formData.charge_name.trim(),
      charge_type: formData.charge_type,
      charge_value: formData.charge_value,
      calculated_amount,
    };

    onChargesChange([...charges, newCharge]);

    // Reset form
    setFormData({
      charge_name: "",
      charge_type: "fixed",
      charge_value: 0,
    });
    setErrors({});
    setIsAddDialogOpen(false);
  }, [formData, charges, onChargesChange, validateForm, calculateChargeAmount]);

  const handleRemoveCharge = useCallback(
    (chargeId: string) => {
      onChargesChange(charges.filter((charge) => charge.id !== chargeId));
    },
    [charges, onChargesChange]
  );

  const formatAmount = useCallback((amount: number): string => {
    return `₦${(amount / 100).toFixed(2)}`;
  }, []);

  const formatChargeValue = useCallback(
    (charge: CustomCharge): string => {
      if (charge.charge_type === "percentage") {
        return `${charge.charge_value}%`;
      }
      return formatAmount(charge.charge_value * 100);
    },
    [formatAmount]
  );

  const totalCustomCharges = charges.reduce(
    (sum, charge) => sum + charge.calculated_amount,
    0
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Custom Charges</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Charge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Custom Charge</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="charge_name">Charge Name</Label>
                <Input
                  id="charge_name"
                  placeholder="e.g., Delivery Fee, Service Charge"
                  value={formData.charge_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      charge_name: e.target.value,
                    }))
                  }
                  className={errors.charge_name ? "border-red-500" : ""}
                />
                {errors.charge_name && (
                  <p className="text-sm text-red-500">{errors.charge_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="charge_type">Charge Type</Label>
                <Select
                  value={formData.charge_type}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setFormData((prev) => ({ ...prev, charge_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="charge_value">
                  {formData.charge_type === "percentage"
                    ? "Percentage (%)"
                    : "Amount (₦)"}
                </Label>
                <div className="relative">
                  <Input
                    id="charge_value"
                    type="number"
                    min="0"
                    max={
                      formData.charge_type === "percentage" ? "100" : undefined
                    }
                    step={
                      formData.charge_type === "percentage" ? "0.1" : "0.01"
                    }
                    placeholder={
                      formData.charge_type === "percentage" ? "10" : "500.00"
                    }
                    value={formData.charge_value || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        charge_value: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className={
                      errors.charge_value ? "border-red-500 pr-8" : "pr-8"
                    }
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {formData.charge_type === "percentage" ? (
                      <Percent className="h-4 w-4 text-gray-400" />
                    ) : (
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
                {errors.charge_value && (
                  <p className="text-sm text-red-500">{errors.charge_value}</p>
                )}
                {formData.charge_value > 0 && (
                  <p className="text-sm text-gray-600">
                    Calculated amount:{" "}
                    {formatAmount(
                      calculateChargeAmount(
                        formData.charge_type,
                        formData.charge_value
                      )
                    )}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddCharge}>Add Charge</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-3">
        {charges.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No custom charges added
          </p>
        ) : (
          <>
            {charges.map((charge) => (
              <div
                key={charge.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{charge.charge_name}</span>
                    <Badge
                      variant={
                        charge.charge_type === "percentage"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {formatChargeValue(charge)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatAmount(charge.calculated_amount)}
                  </p>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCharge(charge.id!)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {charges.length > 0 && (
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-semibold">Total Custom Charges:</span>
                <span className="font-semibold text-lg">
                  {formatAmount(totalCustomCharges)}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
