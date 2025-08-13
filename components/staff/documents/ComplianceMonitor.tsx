"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Calendar,
  TrendingUp,
  Shield,
} from "lucide-react";
import { DocumentType } from "@/types/staff";

interface ComplianceMonitorProps {
  staffId: string;
  complianceStatus: {
    status: "compliant" | "needs_attention" | "non_compliant";
    total_documents: number;
    required_documents: number;
    expired_documents: number;
    expiring_soon_documents: number;
    missing_required_types: DocumentType[];
  } | null;
}

interface BusinessComplianceOverview {
  total_staff: number;
  compliant_staff: number;
  needs_attention_staff: number;
  non_compliant_staff: number;
  total_expired_documents: number;
  total_expiring_soon_documents: number;
  compliance_percentage: number;
}

interface DocumentStatistics {
  [key: string]: {
    total: number;
    expired: number;
    expiring_soon: number;
  };
}

export function ComplianceMonitor({
  staffId,
  complianceStatus,
}: ComplianceMonitorProps) {
  const [businessOverview, setBusinessOverview] =
    useState<BusinessComplianceOverview | null>(null);
  const [documentStats, setDocumentStats] = useState<DocumentStatistics | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      const [overviewResponse, statsResponse] = await Promise.all([
        fetch("/api/staff/documents/compliance?type=overview"),
        fetch("/api/staff/documents/compliance?type=statistics"),
      ]);

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setBusinessOverview(overviewData.overview);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setDocumentStats(statsData.statistics);
      }
    } catch (error) {
      console.error("Error fetching business compliance data:", error);
      setError("Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "needs_attention":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "non_compliant":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "text-green-600 bg-green-50 border-green-200";
      case "needs_attention":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "non_compliant":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      contract: "Contracts",
      id_document: "ID Documents",
      tax_form: "Tax Forms",
      certification: "Certifications",
      training_record: "Training Records",
      other: "Other Documents",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading compliance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Individual Staff Compliance Status */}
      {complianceStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Individual Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(complianceStatus.status)}
                  <span className="text-lg font-medium capitalize">
                    {complianceStatus.status.replace("_", " ")}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={getStatusColor(complianceStatus.status)}
                >
                  {complianceStatus.status === "compliant" && "✓ Compliant"}
                  {complianceStatus.status === "needs_attention" &&
                    "⚠ Needs Attention"}
                  {complianceStatus.status === "non_compliant" &&
                    "✗ Non-Compliant"}
                </Badge>
              </div>

              {/* Document Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {complianceStatus.total_documents}
                  </div>
                  <div className="text-sm text-blue-800">Total Documents</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {complianceStatus.required_documents}
                  </div>
                  <div className="text-sm text-green-800">Required</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {complianceStatus.expired_documents}
                  </div>
                  <div className="text-sm text-red-800">Expired</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {complianceStatus.expiring_soon_documents}
                  </div>
                  <div className="text-sm text-yellow-800">Expiring Soon</div>
                </div>
              </div>

              {/* Missing Required Documents Alert */}
              {complianceStatus.missing_required_types.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Missing Required Documents:</strong>{" "}
                    {complianceStatus.missing_required_types
                      .map((type) => getDocumentTypeLabel(type))
                      .join(", ")}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Items */}
              {(complianceStatus.expired_documents > 0 ||
                complianceStatus.expiring_soon_documents > 0) && (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Action Required:</strong>{" "}
                    {complianceStatus.expired_documents > 0 &&
                      `${complianceStatus.expired_documents} document(s) have expired. `}
                    {complianceStatus.expiring_soon_documents > 0 &&
                      `${complianceStatus.expiring_soon_documents} document(s) expire within 30 days.`}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business-Wide Compliance Overview */}
      {businessOverview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Business Compliance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Compliance Percentage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Overall Compliance Rate
                  </span>
                  <span className="text-sm text-gray-600">
                    {businessOverview.compliance_percentage}%
                  </span>
                </div>
                <Progress
                  value={businessOverview.compliance_percentage}
                  className="h-2"
                />
              </div>

              {/* Staff Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {businessOverview.total_staff}
                  </div>
                  <div className="text-sm text-gray-800">Total Staff</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {businessOverview.compliant_staff}
                  </div>
                  <div className="text-sm text-green-800">Compliant</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {businessOverview.needs_attention_staff}
                  </div>
                  <div className="text-sm text-yellow-800">Needs Attention</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {businessOverview.non_compliant_staff}
                  </div>
                  <div className="text-sm text-red-800">Non-Compliant</div>
                </div>
              </div>

              {/* Document Issues Summary */}
              {(businessOverview.total_expired_documents > 0 ||
                businessOverview.total_expiring_soon_documents > 0) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Business-wide: {businessOverview.total_expired_documents}{" "}
                    expired documents,{" "}
                    {businessOverview.total_expiring_soon_documents} expiring
                    soon
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Type Statistics */}
      {documentStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Statistics by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(documentStats).map(([type, stats]) => (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {getDocumentTypeLabel(type)}
                    </h4>
                    <Badge variant="outline">{stats.total} total</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {stats.total - stats.expired - stats.expiring_soon}
                      </div>
                      <div className="text-gray-600">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-600">
                        {stats.expiring_soon}
                      </div>
                      <div className="text-gray-600">Expiring Soon</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">
                        {stats.expired}
                      </div>
                      <div className="text-gray-600">Expired</div>
                    </div>
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
