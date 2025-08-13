"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar,
  AlertTriangle,
  Clock,
  Bell,
  FileText,
  RefreshCw,
} from "lucide-react";
import { StaffDocument, DocumentType } from "@/types/staff";

interface DocumentExpirationTrackerProps {
  staffId: string;
  documents: StaffDocument[];
}

interface ExpirationAlert {
  document: StaffDocument;
  daysUntilExpiry: number;
  status: "expired" | "expiring_soon" | "valid";
}

export function DocumentExpirationTracker({
  staffId,
  documents,
}: DocumentExpirationTrackerProps) {
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlert[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processExpirationData();
  }, [documents]);

  const processExpirationData = () => {
    const today = new Date();
    const alerts: ExpirationAlert[] = [];

    documents.forEach((document) => {
      if (document.expiration_date) {
        const expiryDate = new Date(document.expiration_date);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        let status: "expired" | "expiring_soon" | "valid";
        if (daysUntilExpiry < 0) {
          status = "expired";
        } else if (daysUntilExpiry <= 30) {
          status = "expiring_soon";
        } else {
          status = "valid";
        }

        alerts.push({
          document,
          daysUntilExpiry,
          status,
        });
      }
    });

    // Sort by urgency: expired first, then expiring soon, then by days until expiry
    alerts.sort((a, b) => {
      if (a.status === "expired" && b.status !== "expired") return -1;
      if (b.status === "expired" && a.status !== "expired") return 1;
      if (a.status === "expiring_soon" && b.status === "valid") return -1;
      if (b.status === "expiring_soon" && a.status === "valid") return 1;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

    setExpirationAlerts(alerts);
  };

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

  const getStatusBadge = (alert: ExpirationAlert) => {
    switch (alert.status) {
      case "expired":
        return (
          <Badge variant="destructive" className="flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case "expiring_soon":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            {alert.daysUntilExpiry} days left
          </Badge>
        );
      case "valid":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <Calendar className="h-3 w-3 mr-1" />
            {alert.daysUntilExpiry} days left
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      processExpirationData();
      setLoading(false);
    }, 1000);
  };

  const expiredCount = expirationAlerts.filter(
    (alert) => alert.status === "expired"
  ).length;
  const expiringSoonCount = expirationAlerts.filter(
    (alert) => alert.status === "expiring_soon"
  ).length;
  const validCount = expirationAlerts.filter(
    (alert) => alert.status === "valid"
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Expired</p>
                <p className="text-2xl font-bold text-red-700">
                  {expiredCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">
                  Expiring Soon
                </p>
                <p className="text-2xl font-bold text-yellow-700">
                  {expiringSoonCount}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Valid</p>
                <p className="text-2xl font-bold text-green-700">
                  {validCount}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {expiredCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Urgent:</strong> {expiredCount} document(s) have expired and
            need immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {expiringSoonCount > 0 && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>Reminder:</strong> {expiringSoonCount} document(s) will
            expire within 30 days.
          </AlertDescription>
        </Alert>
      )}

      {/* Expiration Tracking Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Document Expiration Tracking
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expirationAlerts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No documents with expiration dates
              </h3>
              <p className="text-gray-600">
                Documents without expiration dates don't require tracking.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expirationAlerts.map((alert) => (
                    <TableRow key={alert.document.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">
                              {alert.document.document_name}
                            </div>
                            {alert.document.is_required && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getDocumentTypeLabel(alert.document.document_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(alert.document.expiration_date!)}
                      </TableCell>
                      <TableCell>{getStatusBadge(alert)}</TableCell>
                      <TableCell>
                        {alert.status === "expired" && (
                          <Badge variant="destructive">High</Badge>
                        )}
                        {alert.status === "expiring_soon" && (
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-700 border-yellow-200"
                          >
                            Medium
                          </Badge>
                        )}
                        {alert.status === "valid" && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Low
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Expirations Timeline */}
      {expirationAlerts.filter((alert) => alert.status !== "expired").length >
        0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Upcoming Expirations Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expirationAlerts
                .filter((alert) => alert.status !== "expired")
                .slice(0, 5)
                .map((alert, index) => (
                  <div
                    key={alert.document.id}
                    className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          alert.status === "expiring_soon"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      ></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {alert.document.document_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getDocumentTypeLabel(alert.document.document_type)} •
                        Expires {formatDate(alert.document.expiration_date!)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {alert.daysUntilExpiry} days
                      </div>
                      <div className="text-xs text-gray-500">remaining</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
