"use client";

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
} from "lucide-react";
import { StaffDocument, DocumentType } from "@/types/staff";

interface TrainingRecord {
  id: string;
  title: string;
  description: string;
  provider: string;
  completion_date: string;
  expiration_date?: string;
  certificate_url?: string;
  status: "completed" | "in_progress" | "expired" | "pending";
  hours: number;
  category: "safety" | "technical" | "soft_skills" | "compliance" | "other";
}

interface TrainingCertificationManagerProps {
  staffId: string;
  staffName: string;
  businessId: string;
  trainingRecords: TrainingRecord[];
  certificationDocuments: StaffDocument[];
  onAddTraining: (training: Omit<TrainingRecord, "id">) => Promise<void>;
  onUpdateTraining: (training: TrainingRecord) => Promise<void>;
  onDeleteTraining: (trainingId: string) => Promise<void>;
  onUploadCertificate: (file: File, trainingId: string) => Promise<void>;
  isLoading?: boolean;
  canEdit?: boolean;
}

interface TrainingFormData {
  title: string;
  description: string;
  provider: string;
  completion_date: string;
  expiration_date: string;
  hours: number;
  category: TrainingRecord["category"];
  status: TrainingRecord["status"];
}

const initialTrainingForm: TrainingFormData = {
  title: "",
  description: "",
  provider: "",
  completion_date: "",
  expiration_date: "",
  hours: 0,
  category: "technical",
  status: "completed",
};

export function TrainingCertificationManager({
  staffId,
  staffName,
  businessId,
  trainingRecords,
  certificationDocuments,
  onAddTraining,
  onUpdateTraining,
  onDeleteTraining,
  onUploadCertificate,
  isLoading = false,
  canEdit = true,
}: TrainingCertificationManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingRecord | null>(
    null
  );
  const [trainingForm, setTrainingForm] =
    useState<TrainingFormData>(initialTrainingForm);
  const [uploadingCertificate, setUploadingCertificate] = useState<
    string | null
  >(null);

  const getStatusIcon = (status: TrainingRecord["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "expired":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <GraduationCap className="h-4 w-4 text-gray-500" />;
    }
  };
  const getStatusColor = (status: TrainingRecord["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: TrainingRecord["category"]) => {
    switch (category) {
      case "safety":
        return <AlertTriangle className="h-4 w-4" />;
      case "technical":
        return <GraduationCap className="h-4 w-4" />;
      case "compliance":
        return <FileText className="h-4 w-4" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  const isTrainingExpired = (training: TrainingRecord) => {
    if (!training.expiration_date || training.status === "expired")
      return false;
    const expirationDate = new Date(training.expiration_date);
    const today = new Date();
    return expirationDate < today;
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const expiration = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCreateTraining = async () => {
    if (!trainingForm.title.trim()) return;

    const newTraining: Omit<TrainingRecord, "id"> = {
      ...trainingForm,
      status: isTrainingExpired({ ...trainingForm } as TrainingRecord)
        ? "expired"
        : trainingForm.status,
    };

    await onAddTraining(newTraining);
    setTrainingForm(initialTrainingForm);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateTraining = async () => {
    if (!editingTraining || !trainingForm.title.trim()) return;

    const updatedTraining: TrainingRecord = {
      ...editingTraining,
      ...trainingForm,
      status: isTrainingExpired({ ...trainingForm } as TrainingRecord)
        ? "expired"
        : trainingForm.status,
    };

    await onUpdateTraining(updatedTraining);
    setEditingTraining(null);
    setTrainingForm(initialTrainingForm);
  };

  const startEditing = (training: TrainingRecord) => {
    setEditingTraining(training);
    setTrainingForm({
      title: training.title,
      description: training.description,
      provider: training.provider,
      completion_date: training.completion_date,
      expiration_date: training.expiration_date || "",
      hours: training.hours,
      category: training.category,
      status: training.status,
    });
  };

  const cancelEditing = () => {
    setEditingTraining(null);
    setTrainingForm(initialTrainingForm);
  };

  const handleCertificateUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    trainingId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCertificate(trainingId);
    try {
      await onUploadCertificate(file, trainingId);
    } finally {
      setUploadingCertificate(null);
    }
  };

  const completedTrainings = trainingRecords.filter(
    (t) => t.status === "completed"
  );
  const inProgressTrainings = trainingRecords.filter(
    (t) => t.status === "in_progress"
  );
  const expiredTrainings = trainingRecords.filter(
    (t) => t.status === "expired" || isTrainingExpired(t)
  );
  const expiringTrainings = trainingRecords.filter((t) => {
    if (!t.expiration_date || t.status === "expired") return false;
    const days = getDaysUntilExpiration(t.expiration_date);
    return days <= 30 && days > 0;
  });

  const totalHours = trainingRecords.reduce(
    (sum, training) => sum + training.hours,
    0
  );

  const TrainingForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="training-title">Training Title</Label>
        <Input
          id="training-title"
          placeholder="Enter training title..."
          value={trainingForm.title}
          onChange={(e) =>
            setTrainingForm({ ...trainingForm, title: e.target.value })
          }
        />
      </div>

      <div>
        <Label htmlFor="training-description">Description</Label>
        <Textarea
          id="training-description"
          placeholder="Describe the training content..."
          value={trainingForm.description}
          onChange={(e) =>
            setTrainingForm({ ...trainingForm, description: e.target.value })
          }
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="provider">Training Provider</Label>
          <Input
            id="provider"
            placeholder="Provider name..."
            value={trainingForm.provider}
            onChange={(e) =>
              setTrainingForm({ ...trainingForm, provider: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="hours">Training Hours</Label>
          <Input
            id="hours"
            type="number"
            min="0"
            step="0.5"
            value={trainingForm.hours}
            onChange={(e) =>
              setTrainingForm({
                ...trainingForm,
                hours: Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={trainingForm.category}
            onValueChange={(value: TrainingRecord["category"]) =>
              setTrainingForm({ ...trainingForm, category: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="soft_skills">Soft Skills</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={trainingForm.status}
            onValueChange={(value: TrainingRecord["status"]) =>
              setTrainingForm({ ...trainingForm, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="completion-date">Completion Date</Label>
          <Input
            id="completion-date"
            type="date"
            value={trainingForm.completion_date}
            onChange={(e) =>
              setTrainingForm({
                ...trainingForm,
                completion_date: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label htmlFor="expiration-date">Expiration Date (Optional)</Label>
          <Input
            id="expiration-date"
            type="date"
            value={trainingForm.expiration_date}
            onChange={(e) =>
              setTrainingForm({
                ...trainingForm,
                expiration_date: e.target.value,
              })
            }
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={
            editingTraining ? cancelEditing : () => setIsCreateDialogOpen(false)
          }
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={
            editingTraining ? handleUpdateTraining : handleCreateTraining
          }
          disabled={!trainingForm.title.trim() || isLoading}
        >
          {editingTraining ? "Update Training" : "Add Training"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Training & Certifications
          </h2>
          <p className="text-muted-foreground">
            Manage training records and certifications for {staffName}
          </p>
        </div>
        {canEdit && (
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Training
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Training Record</DialogTitle>
              </DialogHeader>
              <TrainingForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Training Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Trainings</p>
                <p className="text-2xl font-bold">{trainingRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">
                  {completedTrainings.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">
                  {inProgressTrainings.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringTrainings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Alert */}
      {expiringTrainings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Certifications Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringTrainings.map((training) => (
                <div
                  key={training.id}
                  className="flex items-center justify-between"
                >
                  <span className="font-medium">{training.title}</span>
                  <span className="text-sm text-orange-700">
                    Expires in{" "}
                    {getDaysUntilExpiration(training.expiration_date!)} days
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Records */}
      <Card>
        <CardHeader>
          <CardTitle>Training Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trainingRecords.map((training) => {
            const isExpired = isTrainingExpired(training);
            const daysUntilExpiration = training.expiration_date
              ? getDaysUntilExpiration(training.expiration_date)
              : null;

            return (
              <div
                key={training.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(training.category)}
                      <h3 className="font-semibold">{training.title}</h3>
                      <Badge className={getStatusColor(training.status)}>
                        {training.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {training.category.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>

                    {training.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {training.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Provider:</span>
                        <p className="text-muted-foreground">
                          {training.provider}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Hours:</span>
                        <p className="text-muted-foreground">
                          {training.hours}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Completed:</span>
                        <p className="text-muted-foreground">
                          {new Date(
                            training.completion_date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      {training.expiration_date && (
                        <div>
                          <span className="font-medium">Expires:</span>
                          <p
                            className={`text-muted-foreground ${
                              isExpired
                                ? "text-red-600"
                                : daysUntilExpiration &&
                                  daysUntilExpiration <= 30
                                ? "text-orange-600"
                                : ""
                            }`}
                          >
                            {new Date(
                              training.expiration_date
                            ).toLocaleDateString()}
                            {daysUntilExpiration !== null && (
                              <span className="ml-1">
                                (
                                {isExpired
                                  ? "Expired"
                                  : `${daysUntilExpiration} days`}
                                )
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Certificate Upload/Download */}
                    <div className="flex items-center gap-2 mt-3">
                      {training.certificate_url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={training.certificate_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            View Certificate
                          </a>
                        </Button>
                      ) : (
                        canEdit && (
                          <div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                handleCertificateUpload(e, training.id)
                              }
                              className="hidden"
                              id={`certificate-${training.id}`}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              disabled={uploadingCertificate === training.id}
                            >
                              <label
                                htmlFor={`certificate-${training.id}`}
                                className="cursor-pointer"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {uploadingCertificate === training.id
                                  ? "Uploading..."
                                  : "Upload Certificate"}
                              </label>
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(training)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteTraining(training.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {trainingRecords.length === 0 && (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Training Records
              </h3>
              <p className="text-muted-foreground mb-4">
                Start tracking professional development by adding the first
                training record.
              </p>
              {canEdit && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Training
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Training Dialog */}
      <Dialog
        open={!!editingTraining}
        onOpenChange={(open) => !open && cancelEditing()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Training Record</DialogTitle>
          </DialogHeader>
          <TrainingForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
