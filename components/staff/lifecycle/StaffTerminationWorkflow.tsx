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
  UserX,
  AlertTriangle,
  FileText,
  Key,
  Package,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react";

interface TerminationData {
  staffId: string;
  terminationType: "voluntary" | "involuntary" | "layoff" | "retirement";
  terminationDate: string;
  lastWorkingDay: string;
  reason: string;
  eligibleForRehire: boolean;
  finalPayDetails: {
    finalPayDate: string;
    outstandingPay: number;
    vacationPayout: number;
    severancePay: number;
  };
  accessRevocation: {
    systemAccess: string[];
    physicalAccess: string[];
    revocationDate: string;
  };
  equipmentReturn: {
    item: string;
    returned: boolean;
    condition: string;
  }[];
  exitInterview: {
    scheduled: boolean;
    date: string;
    interviewer: string;
    completed: boolean;
  };
  documentation: {
    terminationLetter: boolean;
    finalPayslip: boolean;
    benefitsInfo: boolean;
    nonCompete: boolean;
  };
}

interface StaffTerminationWorkflowProps {
  staffId: string;
  staffData: {
    name: string;
    position: string;
    department: string;
    startDate: string;
  };
  onComplete: (data: TerminationData) => void;
  onCancel: () => void;
}

export default function StaffTerminationWorkflow({
  staffId,
  staffData,
  onComplete,
  onCancel,
}: StaffTerminationWorkflowProps) {
  const [terminationData, setTerminationData] = useState<TerminationData>({
    staffId,
    terminationType: "voluntary",
    terminationDate: "",
    lastWorkingDay: "",
    reason: "",
    eligibleForRehire: true,
    finalPayDetails: {
      finalPayDate: "",
      outstandingPay: 0,
      vacationPayout: 0,
      severancePay: 0,
    },
    accessRevocation: {
      systemAccess: [],
      physicalAccess: [],
      revocationDate: "",
    },
    equipmentReturn: [],
    exitInterview: {
      scheduled: false,
      date: "",
      interviewer: "",
      completed: false,
    },
    documentation: {
      terminationLetter: false,
      finalPayslip: false,
      benefitsInfo: false,
      nonCompete: false,
    },
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: "termination-details", title: "Termination Details", icon: UserX },
    { id: "final-pay", title: "Final Pay", icon: FileText },
    { id: "access-revocation", title: "Access Revocation", icon: Key },
    { id: "equipment-return", title: "Equipment Return", icon: Package },
    { id: "exit-process", title: "Exit Process", icon: CheckCircle },
  ];

  const handleInputChange = (field: string, value: any) => {
    setTerminationData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedInputChange = (section: keyof TerminationData, field: string, value: any) => {
    setTerminationData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }));
  };

  const addEquipmentItem = () => {
    setTerminationData(prev => ({
      ...prev,
      equipmentReturn: [
        ...prev.equipmentReturn,
        { item: "", returned: false, condition: "" },
      ],
    }));
  };

  const updateEquipmentItem = (index: number, field: string, value: any) => {
    setTerminationData(prev => ({
      ...prev,
      equipmentReturn: prev.equipmentReturn.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (steps[stepIndex].id) {
      case "termination-details":
        if (!terminationData.terminationDate) newErrors.terminationDate = "Termination date is required";
        if (!terminationData.lastWorkingDay) newErrors.lastWorkingDay = "Last working day is required";
        if (!terminationData.reason) newErrors.reason = "Termination reason is required";
        break;
      case "final-pay":
        if (!terminationData.finalPayDetails.finalPayDate) {
          newErrors.finalPayDate = "Final pay date is required";
        }
        break;
      case "access-revocation":
        if (!terminationData.accessRevocation.revocationDate) {
          newErrors.revocationDate = "Access revocation date is required";
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
      onComplete(terminationData);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Termination Workflow</h1>
          <p className="text-muted-foreground">
            Terminating {staffData.name} - {staffData.position}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                index <= currentStep
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-muted-foreground"
              }`}
            >
              {index < currentStep ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <step.icon className="w-4 h-4" />
              )}
            </div>
            <span className="ml-2 text-sm font-medium">{step.title}</span>
            {index < steps.length - 1 && (
              <div className="w-8 h-0.5 bg-muted mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {React.createElement(steps[currentStep].icon, { className: "w-5 h-5 mr-2" })}
            {steps[currentStep].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step content would go here */}
          <p>Step content for {steps[currentStep].title}</p>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        <div className="space-x-2">
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleComplete}>Complete Termination</Button>
          )}
        </div>
      </div>
    </div>
  );
}