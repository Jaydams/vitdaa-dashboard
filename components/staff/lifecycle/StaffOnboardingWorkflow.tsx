"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  FileText,
  CheckCircle,
  Clock,
  Upload,
  AlertTriangle,
  Users,
  Calendar,
  Shield,
  BookOpen,
  Camera,
  Phone,
  Mail,
  MapPin,
  Building,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  documents?: string[];
  fields?: string[];
}

interface StaffOnboardingData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  employmentInfo: {
    position: string;
    department: string;
    startDate: string;
    employmentType: string;
    salary: number;
    manager: string;
  };
  documents: {
    id: string;
    profilePhoto: File | null;
    resume: File | null;
    identification: File | null;
    bankDetails: File | null;
    contracts: File | null;
    certifications: File[];
  };
  training: {
    completedModules: string[];
    scheduledSessions: string[];
    certificationStatus: Record<string, boolean>;
  };
  equipment: {
    assignedItems: string[];
    receivedItems: string[];
    pendingItems: string[];
  };
}

interface StaffOnboardingWorkflowProps {
  businessId: string;
  onComplete: (data: StaffOnboardingData) => void;
  onSave: (data: Partial<StaffOnboardingData>) => void;
  initialData?: Partial<StaffOnboardingData>;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "personal-info",
    title: "Personal Information",
    description: "Basic personal details and emergency contacts",
    required: true,
    completed: false,
    fields: [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "dateOfBirth",
      "emergencyContact",
    ],
  },
  {
    id: "employment-details",
    title: "Employment Details",
    description: "Position, salary, and reporting structure",
    required: true,
    completed: false,
    fields: [
      "position",
      "department",
      "startDate",
      "employmentType",
      "salary",
      "manager",
    ],
  },
  {
    id: "document-collection",
    title: "Document Collection",
    description: "Upload required documents and identification",
    required: true,
    completed: false,
    documents: [
      "profilePhoto",
      "resume",
      "identification",
      "bankDetails",
      "contracts",
    ],
  },
  {
    id: "training-orientation",
    title: "Training & Orientation",
    description: "Complete mandatory training modules",
    required: true,
    completed: false,
  },
  {
    id: "equipment-assignment",
    title: "Equipment Assignment",
    description: "Assign and distribute necessary equipment",
    required: false,
    completed: false,
  },
  {
    id: "final-review",
    title: "Final Review",
    description: "Review all information and complete onboarding",
    required: true,
    completed: false,
  },
];

export default function StaffOnboardingWorkflow({
  businessId,
  onComplete,
  onSave,
  initialData,
}: StaffOnboardingWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<StaffOnboardingData>({
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
      },
    },
    employmentInfo: {
      position: "",
      department: "",
      startDate: "",
      employmentType: "full-time",
      salary: 0,
      manager: "",
    },
    documents: {
      id: "",
      profilePhoto: null,
      resume: null,
      identification: null,
      bankDetails: null,
      contracts: null,
      certifications: [],
    },
    training: {
      completedModules: [],
      scheduledSessions: [],
      certificationStatus: {},
    },
    equipment: {
      assignedItems: [],
      receivedItems: [],
      pendingItems: [],
    },
    ...initialData,
  });

  const [steps, setSteps] = useState<OnboardingStep[]>(ONBOARDING_STEPS);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate progress
  const completedSteps = steps.filter((step) => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  // Update step completion status
  useEffect(() => {
    const updatedSteps = steps.map((step) => {
      switch (step.id) {
        case "personal-info":
          return {
            ...step,
            completed: !!(
              onboardingData.personalInfo.firstName &&
              onboardingData.personalInfo.lastName &&
              onboardingData.personalInfo.email &&
              onboardingData.personalInfo.phone
            ),
          };
        case "employment-details":
          return {
            ...step,
            completed: !!(
              onboardingData.employmentInfo.position &&
              onboardingData.employmentInfo.department &&
              onboardingData.employmentInfo.startDate
            ),
          };
        case "document-collection":
          return {
            ...step,
            completed: !!(
              onboardingData.documents.profilePhoto &&
              onboardingData.documents.identification
            ),
          };
        default:
          return step;
      }
    });
    setSteps(updatedSteps);
  }, [onboardingData]);

  const handleInputChange = (
    section: keyof StaffOnboardingData,
    field: string,
    value: any
  ) => {
    setOnboardingData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleNestedInputChange = (
    section: keyof StaffOnboardingData,
    nestedField: string,
    field: string,
    value: any
  ) => {
    setOnboardingData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedField]: {
          ...(prev[section] as any)[nestedField],
          [field]: value,
        },
      },
    }));
  };

  const handleFileUpload = (field: string, file: File | null) => {
    setOnboardingData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file,
      },
    }));
  };

  const validateStep = (stepIndex: number): boolean => {
    const step = steps[stepIndex];
    const newErrors: Record<string, string> = {};

    switch (step.id) {
      case "personal-info":
        if (!onboardingData.personalInfo.firstName) {
          newErrors.firstName = "First name is required";
        }
        if (!onboardingData.personalInfo.lastName) {
          newErrors.lastName = "Last name is required";
        }
        if (!onboardingData.personalInfo.email) {
          newErrors.email = "Email is required";
        }
        if (!onboardingData.personalInfo.phone) {
          newErrors.phone = "Phone number is required";
        }
        break;
      case "employment-details":
        if (!onboardingData.employmentInfo.position) {
          newErrors.position = "Position is required";
        }
        if (!onboardingData.employmentInfo.department) {
          newErrors.department = "Department is required";
        }
        if (!onboardingData.employmentInfo.startDate) {
          newErrors.startDate = "Start date is required";
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
      onSave(onboardingData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (validateStep(currentStep)) {
      setLoading(true);
      try {
        await onComplete(onboardingData);
      } catch (error) {
        console.error("Error completing onboarding:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderPersonalInfoStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={onboardingData.personalInfo.firstName}
            onChange={(e) =>
              handleInputChange("personalInfo", "firstName", e.target.value)
            }
            className={errors.firstName ? "border-red-500" : ""}
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={onboardingData.personalInfo.lastName}
            onChange={(e) =>
              handleInputChange("personalInfo", "lastName", e.target.value)
            }
            className={errors.lastName ? "border-red-500" : ""}
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={onboardingData.personalInfo.email}
            onChange={(e) =>
              handleInputChange("personalInfo", "email", e.target.value)
            }
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>
        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={onboardingData.personalInfo.phone}
            onChange={(e) =>
              handleInputChange("personalInfo", "phone", e.target.value)
            }
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={onboardingData.personalInfo.address}
          onChange={(e) =>
            handleInputChange("personalInfo", "address", e.target.value)
          }
        />
      </div>

      <div>
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={onboardingData.personalInfo.dateOfBirth}
          onChange={(e) =>
            handleInputChange("personalInfo", "dateOfBirth", e.target.value)
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergencyName">Contact Name</Label>
              <Input
                id="emergencyName"
                value={onboardingData.personalInfo.emergencyContact.name}
                onChange={(e) =>
                  handleNestedInputChange(
                    "personalInfo",
                    "emergencyContact",
                    "name",
                    e.target.value
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="emergencyRelationship">Relationship</Label>
              <Input
                id="emergencyRelationship"
                value={
                  onboardingData.personalInfo.emergencyContact.relationship
                }
                onChange={(e) =>
                  handleNestedInputChange(
                    "personalInfo",
                    "emergencyContact",
                    "relationship",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
          <div>
            <Label htmlFor="emergencyPhone">Phone Number</Label>
            <Input
              id="emergencyPhone"
              value={onboardingData.personalInfo.emergencyContact.phone}
              onChange={(e) =>
                handleNestedInputChange(
                  "personalInfo",
                  "emergencyContact",
                  "phone",
                  e.target.value
                )
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEmploymentDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="position">Position *</Label>
          <Input
            id="position"
            value={onboardingData.employmentInfo.position}
            onChange={(e) =>
              handleInputChange("employmentInfo", "position", e.target.value)
            }
            className={errors.position ? "border-red-500" : ""}
          />
          {errors.position && (
            <p className="text-red-500 text-sm mt-1">{errors.position}</p>
          )}
        </div>
        <div>
          <Label htmlFor="department">Department *</Label>
          <Select
            value={onboardingData.employmentInfo.department}
            onValueChange={(value) =>
              handleInputChange("employmentInfo", "department", value)
            }
          >
            <SelectTrigger
              className={errors.department ? "border-red-500" : ""}
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
          {errors.department && (
            <p className="text-red-500 text-sm mt-1">{errors.department}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={onboardingData.employmentInfo.startDate}
            onChange={(e) =>
              handleInputChange("employmentInfo", "startDate", e.target.value)
            }
            className={errors.startDate ? "border-red-500" : ""}
          />
          {errors.startDate && (
            <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
          )}
        </div>
        <div>
          <Label htmlFor="employmentType">Employment Type</Label>
          <Select
            value={onboardingData.employmentInfo.employmentType}
            onValueChange={(value) =>
              handleInputChange("employmentInfo", "employmentType", value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full Time</SelectItem>
              <SelectItem value="part-time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="temporary">Temporary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="salary">Salary (per hour)</Label>
          <Input
            id="salary"
            type="number"
            step="0.01"
            value={onboardingData.employmentInfo.salary}
            onChange={(e) =>
              handleInputChange(
                "employmentInfo",
                "salary",
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
        <div>
          <Label htmlFor="manager">Reporting Manager</Label>
          <Input
            id="manager"
            value={onboardingData.employmentInfo.manager}
            onChange={(e) =>
              handleInputChange("employmentInfo", "manager", e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );

  const renderDocumentCollectionStep = () => (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Please upload the required documents. All files should be in PDF, JPG,
          or PNG format and under 5MB.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Profile Photo *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileUpload("profilePhoto", e.target.files?.[0] || null)
              }
            />
            {onboardingData.documents.profilePhoto && (
              <p className="text-sm text-green-600 mt-2">
                ✓ {onboardingData.documents.profilePhoto.name}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resume/CV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) =>
                handleFileUpload("resume", e.target.files?.[0] || null)
              }
            />
            {onboardingData.documents.resume && (
              <p className="text-sm text-green-600 mt-2">
                ✓ {onboardingData.documents.resume.name}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Identification *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                handleFileUpload("identification", e.target.files?.[0] || null)
              }
            />
            {onboardingData.documents.identification && (
              <p className="text-sm text-green-600 mt-2">
                ✓ {onboardingData.documents.identification.name}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building className="h-4 w-4" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                handleFileUpload("bankDetails", e.target.files?.[0] || null)
              }
            />
            {onboardingData.documents.bankDetails && (
              <p className="text-sm text-green-600 mt-2">
                ✓ {onboardingData.documents.bankDetails.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTrainingStep = () => (
    <div className="space-y-6">
      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertDescription>
          Complete the mandatory training modules before proceeding. Some
          modules may require scheduling.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Required Training Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                id: "food-safety",
                title: "Food Safety & Hygiene",
                required: true,
              },
              {
                id: "customer-service",
                title: "Customer Service Excellence",
                required: true,
              },
              {
                id: "pos-system",
                title: "POS System Training",
                required: true,
              },
              {
                id: "emergency-procedures",
                title: "Emergency Procedures",
                required: true,
              },
              {
                id: "company-policies",
                title: "Company Policies & Procedures",
                required: false,
              },
            ].map((module) => (
              <div
                key={module.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={onboardingData.training.completedModules.includes(
                      module.id
                    )}
                    onCheckedChange={(checked) => {
                      const updatedModules = checked
                        ? [
                            ...onboardingData.training.completedModules,
                            module.id,
                          ]
                        : onboardingData.training.completedModules.filter(
                            (m) => m !== module.id
                          );
                      handleInputChange(
                        "training",
                        "completedModules",
                        updatedModules
                      );
                    }}
                  />
                  <div>
                    <p className="font-medium">{module.title}</p>
                    {module.required && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {onboardingData.training.completedModules.includes(module.id)
                    ? "Completed"
                    : "Start"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEquipmentStep = () => (
    <div className="space-y-6">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          Review and confirm receipt of assigned equipment and materials.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Equipment Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: "uniform", title: "Uniform & Apron", category: "Clothing" },
            { id: "name-tag", title: "Name Tag", category: "Identification" },
            {
              id: "pos-login",
              title: "POS System Login",
              category: "Technology",
            },
            { id: "locker", title: "Staff Locker", category: "Storage" },
            {
              id: "handbook",
              title: "Employee Handbook",
              category: "Documentation",
            },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-600">{item.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={onboardingData.equipment.receivedItems.includes(
                    item.id
                  )}
                  onCheckedChange={(checked) => {
                    const updatedItems = checked
                      ? [...onboardingData.equipment.receivedItems, item.id]
                      : onboardingData.equipment.receivedItems.filter(
                          (i) => i !== item.id
                        );
                    handleInputChange(
                      "equipment",
                      "receivedItems",
                      updatedItems
                    );
                  }}
                />
                <span className="text-sm">Received</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderFinalReviewStep = () => (
    <div className="space-y-6">
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Review all information before completing the onboarding process.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Name:</strong> {onboardingData.personalInfo.firstName}{" "}
              {onboardingData.personalInfo.lastName}
            </p>
            <p>
              <strong>Email:</strong> {onboardingData.personalInfo.email}
            </p>
            <p>
              <strong>Phone:</strong> {onboardingData.personalInfo.phone}
            </p>
            <p>
              <strong>Emergency Contact:</strong>{" "}
              {onboardingData.personalInfo.emergencyContact.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Position:</strong>{" "}
              {onboardingData.employmentInfo.position}
            </p>
            <p>
              <strong>Department:</strong>{" "}
              {onboardingData.employmentInfo.department}
            </p>
            <p>
              <strong>Start Date:</strong>{" "}
              {onboardingData.employmentInfo.startDate}
            </p>
            <p>
              <strong>Employment Type:</strong>{" "}
              {onboardingData.employmentInfo.employmentType}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completion Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center justify-between">
                <span>{step.title}</span>
                {step.completed ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStepContent = () => {
    switch (steps[currentStep]?.id) {
      case "personal-info":
        return renderPersonalInfoStep();
      case "employment-details":
        return renderEmploymentDetailsStep();
      case "document-collection":
        return renderDocumentCollectionStep();
      case "training-orientation":
        return renderTrainingStep();
      case "equipment-assignment":
        return renderEquipmentStep();
      case "final-review":
        return renderFinalReviewStep();
      default:
        return <div>Step not found</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="h-6 w-6" />
            Staff Onboarding Workflow
          </CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Step {currentStep + 1} of {steps.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    index === currentStep
                      ? "bg-blue-50 border-blue-200"
                      : step.completed
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {step.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : index === currentStep ? (
                      <Clock className="h-4 w-4 text-blue-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{step.title}</p>
                      {step.required && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-xl">
              {steps[currentStep]?.title}
            </CardTitle>
            <p className="text-gray-600">{steps[currentStep]?.description}</p>
          </CardHeader>
          <CardContent>{renderStepContent()}</CardContent>
          <div className="p-6 border-t flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onSave(onboardingData)}>
                Save Progress
              </Button>
              {currentStep === steps.length - 1 ? (
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? "Completing..." : "Complete Onboarding"}
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
