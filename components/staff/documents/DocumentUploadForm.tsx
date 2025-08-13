"use client";

import React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { DocumentType, StaffDocument } from "@/types/staff";
import {
  useFormValidation,
  useFileUploadValidation,
} from "@/hooks/useFormValidation";
import { documentUploadSchema } from "@/lib/staff-form-validation";
import {
  FormErrorDisplay,
  SuccessDisplay,
} from "@/components/shared/FormErrorDisplay";
import {
  LoadingButton,
  FormLoadingOverlay,
} from "@/components/shared/LoadingStates";
import { useErrorHandler } from "@/hooks/useErrorHandler";

interface DocumentUploadFormProps {
  staffId: string;
  onDocumentUploaded: (document: StaffDocument) => void;
  onCancel: () => void;
}

interface FormData {
  documentType: DocumentType;
  documentName: string;
  expirationDate?: string;
  isRequired: boolean;
  file: File;
}

const documentTypeOptions = [
  { value: "contract", label: "Employment Contract" },
  { value: "id_document", label: "ID Document" },
  { value: "tax_form", label: "Tax Form" },
  { value: "certification", label: "Certification" },
  { value: "training_record", label: "Training Record" },
  { value: "other", label: "Other" },
];

export function DocumentUploadForm({
  staffId,
  onDocumentUploaded,
  onCancel,
}: DocumentUploadFormProps) {
  const { handleError, showSuccessToast, showErrorToast } = useErrorHandler();
  const [uploadSuccess, setUploadSuccess] = React.useState<string | null>(null);

  const fileUpload = useFileUploadValidation({
    maxSize: 10,
    allowedTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    required: true,
    onFileSelect: (file) => {
      // Auto-populate document name if empty
      if (!values.documentName) {
        setValue("documentName", file.name.split(".")[0]);
      }
    },
    onError: (error) => {
      showErrorToast(error);
    },
  });

  const {
    values,
    errors,
    isSubmitting,
    setValue,
    handleSubmit,
    getFieldProps,
    clearErrors,
  } = useFormValidation<FormData>({
    schema: documentUploadSchema,
    onSubmit: async (data) => {
      // Validate file separately since it's handled by the file upload hook
      if (!fileUpload.validate()) {
        throw new Error("Please select a valid file");
      }

      try {
        // First, upload the file
        const uploadFormData = new FormData();
        uploadFormData.append("file", fileUpload.file!);
        uploadFormData.append("staffId", staffId);
        uploadFormData.append("documentType", data.documentType);

        const uploadResponse = await fetch("/api/staff/documents/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          throw new Error(uploadError.error || "Failed to upload file");
        }

        const uploadData = await uploadResponse.json();

        // Then, create the document record
        const documentData = {
          staffId,
          documentType: data.documentType,
          documentName: data.documentName,
          fileUrl: uploadData.fileUrl,
          fileSize: uploadData.fileSize,
          mimeType: uploadData.mimeType,
          expirationDate: data.expirationDate || null,
          isRequired: data.isRequired,
        };

        const createResponse = await fetch("/api/staff/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(documentData),
        });

        if (!createResponse.ok) {
          const createError = await createResponse.json();
          throw new Error(
            createError.error || "Failed to create document record"
          );
        }

        const { document } = await createResponse.json();

        // Show success message
        setUploadSuccess("Document uploaded successfully!");
        showSuccessToast("Document uploaded successfully!");

        // Call the callback after a short delay to show success message
        setTimeout(() => {
          onDocumentUploaded(document);
        }, 1500);
      } catch (error) {
        console.error("Error uploading document:", error);
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous success messages
    setUploadSuccess(null);

    // Add file to form data for validation
    const formDataWithFile = {
      ...values,
      file: fileUpload.file!,
    };

    // Validate and submit
    await handleSubmit();
  };

  const handleCancel = () => {
    clearErrors();
    fileUpload.removeFile();
    setUploadSuccess(null);
    onCancel();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Document
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <FormLoadingOverlay
          isLoading={isSubmitting}
          message="Uploading document..."
        >
          {/* Success Message */}
          {uploadSuccess && (
            <SuccessDisplay
              message={uploadSuccess}
              className="mb-4"
              autoHide
              autoHideDelay={2000}
              onDismiss={() => setUploadSuccess(null)}
            />
          )}

          {/* Form Errors */}
          <FormErrorDisplay
            errors={errors}
            className="mb-4"
            onDismiss={clearErrors}
          />

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* File Upload Area */}
            <div className="space-y-2">
              <Label>Document File *</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  fileUpload.isDragging
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : fileUpload.hasError
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                    : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                }`}
                onDragEnter={fileUpload.handleDragOver}
                onDragLeave={fileUpload.handleDragLeave}
                onDragOver={fileUpload.handleDragOver}
                onDrop={fileUpload.handleDrop}
              >
                {fileUpload.file ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 ml-1" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {fileUpload.file.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {fileUpload.formatFileSize(fileUpload.file.size)}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fileUpload.removeFile}
                      disabled={isSubmitting}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500" />
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Drag and drop a file here, or click to select
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      PDF, Word, or image files up to 10MB
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                      onChange={fileUpload.handleInputChange}
                      className="hidden"
                      id="file-input"
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("file-input")?.click()
                      }
                      disabled={isSubmitting}
                    >
                      Select File
                    </Button>
                  </div>
                )}
              </div>
              {fileUpload.error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {fileUpload.error}
                </p>
              )}
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type *</Label>
              <Select
                value={values.documentType || ""}
                onValueChange={(value: DocumentType) =>
                  setValue("documentType", value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger
                  className={errors.documentType ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.documentType && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.documentType}
                </p>
              )}
            </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="documentName">Document Name *</Label>
              <Input
                id="documentName"
                {...getFieldProps("documentName")}
                placeholder="Enter document name"
                disabled={isSubmitting}
                className={errors.documentName ? "border-red-500" : ""}
              />
              {errors.documentName && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.documentName}
                </p>
              )}
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
              <Input
                id="expirationDate"
                type="date"
                {...getFieldProps("expirationDate")}
                disabled={isSubmitting}
                className={errors.expirationDate ? "border-red-500" : ""}
              />
              {errors.expirationDate && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.expirationDate}
                </p>
              )}
            </div>

            {/* Required Document Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={values.isRequired || false}
                onCheckedChange={(checked) =>
                  setValue("isRequired", checked as boolean)
                }
                disabled={isSubmitting}
              />
              <Label htmlFor="isRequired" className="text-sm">
                This is a required document
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
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
                loadingText="Uploading..."
                icon="upload"
                disabled={!fileUpload.file || !fileUpload.isValid}
              >
                Upload Document
              </LoadingButton>
            </div>
          </form>
        </FormLoadingOverlay>
      </CardContent>
    </Card>
  );
}
