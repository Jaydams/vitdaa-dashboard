"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download,
  Trash2,
  Plus,
} from "lucide-react";
import { StaffDocument, DocumentType } from "@/types/staff";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { DocumentList } from "./DocumentList";
import { ComplianceMonitor } from "./ComplianceMonitor";
import { DocumentExpirationTracker } from "./DocumentExpirationTracker";

interface DocumentManagementProps {
  staffId: string;
  staffName: string;
  isReadOnly?: boolean;
}

interface ComplianceStatus {
  status: "compliant" | "needs_attention" | "non_compliant";
  total_documents: number;
  required_documents: number;
  expired_documents: number;
  expiring_soon_documents: number;
  missing_required_types: DocumentType[];
}

export function DocumentManagement({
  staffId,
  staffName,
  isReadOnly = false,
}: DocumentManagementProps) {
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [complianceStatus, setComplianceStatus] =
    useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<
    DocumentType | "all"
  >("all");

  useEffect(() => {
    fetchDocuments();
    fetchComplianceStatus();
  }, [staffId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/staff/documents?staffId=${staffId}`);
      if (!response.ok) throw new Error("Failed to fetch documents");

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to load documents");
    }
  };

  const fetchComplianceStatus = async () => {
    try {
      const response = await fetch(
        `/api/staff/documents/compliance?staffId=${staffId}`
      );
      if (!response.ok) throw new Error("Failed to fetch compliance status");

      const data = await response.json();
      setComplianceStatus(data.complianceStatus);
    } catch (error) {
      console.error("Error fetching compliance status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploaded = (newDocument: StaffDocument) => {
    setDocuments((prev) => [newDocument, ...prev]);
    setShowUploadForm(false);
    fetchComplianceStatus(); // Refresh compliance status
  };

  const handleDocumentDeleted = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    fetchComplianceStatus(); // Refresh compliance status
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "text-green-600 bg-green-50";
      case "needs_attention":
        return "text-yellow-600 bg-yellow-50";
      case "non_compliant":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4" />;
      case "needs_attention":
        return <AlertTriangle className="h-4 w-4" />;
      case "non_compliant":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredDocuments =
    selectedDocumentType === "all"
      ? documents
      : documents.filter((doc) => doc.document_type === selectedDocumentType);

  const documentTypes: { value: DocumentType | "all"; label: string }[] = [
    { value: "all", label: "All Documents" },
    { value: "contract", label: "Contracts" },
    { value: "id_document", label: "ID Documents" },
    { value: "tax_form", label: "Tax Forms" },
    { value: "certification", label: "Certifications" },
    { value: "training_record", label: "Training Records" },
    { value: "other", label: "Other" },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Compliance Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Management</h2>
          <p className="text-gray-600">Manage documents for {staffName}</p>
        </div>

        {complianceStatus && (
          <Badge
            variant="outline"
            className={`px-3 py-1 ${getComplianceStatusColor(
              complianceStatus.status
            )}`}
          >
            {getComplianceIcon(complianceStatus.status)}
            <span className="ml-2 capitalize">
              {complianceStatus.status.replace("_", " ")}
            </span>
          </Badge>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Compliance Overview */}
      {complianceStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {complianceStatus.total_documents}
                </div>
                <div className="text-sm text-gray-600">Total Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {complianceStatus.required_documents}
                </div>
                <div className="text-sm text-gray-600">Required Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {complianceStatus.expired_documents}
                </div>
                <div className="text-sm text-gray-600">Expired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {complianceStatus.expiring_soon_documents}
                </div>
                <div className="text-sm text-gray-600">Expiring Soon</div>
              </div>
            </div>

            {complianceStatus.missing_required_types.length > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Missing required documents:{" "}
                  {complianceStatus.missing_required_types.join(", ")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="expiration">Expiration Tracking</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Library</CardTitle>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedDocumentType}
                    onChange={(e) =>
                      setSelectedDocumentType(
                        e.target.value as DocumentType | "all"
                      )
                    }
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {!isReadOnly && (
                    <Button onClick={() => setShowUploadForm(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DocumentList
                documents={filteredDocuments}
                onDocumentDeleted={handleDocumentDeleted}
                isReadOnly={isReadOnly}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceMonitor
            staffId={staffId}
            complianceStatus={complianceStatus}
          />
        </TabsContent>

        <TabsContent value="expiration">
          <DocumentExpirationTracker staffId={staffId} documents={documents} />
        </TabsContent>

        <TabsContent value="upload">
          {!isReadOnly ? (
            <DocumentUploadForm
              staffId={staffId}
              onDocumentUploaded={handleDocumentUploaded}
              onCancel={() => setShowUploadForm(false)}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">
                  Document upload is not available in read-only mode.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Form Modal */}
      {showUploadForm && !isReadOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <DocumentUploadForm
              staffId={staffId}
              onDocumentUploaded={handleDocumentUploaded}
              onCancel={() => setShowUploadForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
