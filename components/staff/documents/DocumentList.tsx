"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Download,
  Eye,
  Trash2,
  MoreVertical,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { StaffDocument, DocumentType } from "@/types/staff";

interface DocumentListProps {
  documents: StaffDocument[];
  onDocumentDeleted: (documentId: string) => void;
  isReadOnly?: boolean;
}

export function DocumentList({
  documents,
  onDocumentDeleted,
  isReadOnly = false,
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getDocumentTypeLabel = (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      contract: "Contract",
      id_document: "ID Document",
      tax_form: "Tax Form",
      certification: "Certification",
      training_record: "Training Record",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return null;

    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return {
        status: "expired",
        label: "Expired",
        color: "bg-red-100 text-red-800",
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: "expiring_soon",
        label: `${daysUntilExpiry} days left`,
        color: "bg-yellow-100 text-yellow-800",
        icon: <Clock className="h-3 w-3" />,
      };
    } else {
      return {
        status: "valid",
        label: "Valid",
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle className="h-3 w-3" />,
      };
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDownload = async (document: StaffDocument) => {
    try {
      const response = await fetch(
        `/api/staff/documents/${document.id}/download`
      );
      if (!response.ok) {
        throw new Error("Failed to generate download link");
      }

      const data = await response.json();
      window.open(data.downloadUrl, "_blank");
    } catch (error) {
      console.error("Error downloading document:", error);
      setError("Failed to download document");
    }
  };

  const handleView = async (document: StaffDocument) => {
    try {
      const response = await fetch(
        `/api/staff/documents/${document.id}/download`
      );
      if (!response.ok) {
        throw new Error("Failed to generate view link");
      }

      const data = await response.json();
      window.open(data.downloadUrl, "_blank");
    } catch (error) {
      console.error("Error viewing document:", error);
      setError("Failed to view document");
    }
  };

  const handleDelete = async (documentId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingId(documentId);
    setError(null);

    try {
      const response = await fetch(`/api/staff/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete document");
      }

      onDocumentDeleted(documentId);
    } catch (error) {
      console.error("Error deleting document:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete document"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No documents found
          </h3>
          <p className="text-gray-600">
            No documents have been uploaded for this staff member yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => {
              const expirationStatus = getExpirationStatus(
                document.expiration_date
              );

              return (
                <TableRow key={document.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">
                          {document.document_name}
                        </div>
                        {document.is_required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getDocumentTypeLabel(document.document_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatFileSize(document.file_size)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(document.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {document.expiration_date ? (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(document.expiration_date)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">No expiration</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {expirationStatus ? (
                      <Badge
                        variant="outline"
                        className={`${expirationStatus.color} border-0`}
                      >
                        {expirationStatus.icon}
                        <span className="ml-1">{expirationStatus.label}</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-800"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        No expiration
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === document.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(document)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        {!isReadOnly && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(document.id)}
                            className="text-red-600"
                            disabled={deletingId === document.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deletingId === document.id
                              ? "Deleting..."
                              : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
