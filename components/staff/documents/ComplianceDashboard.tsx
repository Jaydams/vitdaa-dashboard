"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { DocumentType } from "@/types/staff";

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

interface StaffComplianceItem {
  staff_id: string;
  staff_name: string;
  role: string;
  status: "compliant" | "needs_attention" | "non_compliant";
  total_documents: number;
  expired_documents: number;
  expiring_soon_documents: number;
  missing_required_types: DocumentType[];
}

export function ComplianceDashboard() {
  const [overview, setOverview] = useState<BusinessComplianceOverview | null>(
    null
  );
  const [documentStats, setDocumentStats] = useState<DocumentStatistics | null>(
    null
  );
  const [staffCompliance, setStaffCompliance] = useState<StaffComplianceItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewResponse, statsResponse] = await Promise.all([
        fetch("/api/staff/documents/compliance?type=overview"),
        fetch("/api/staff/documents/compliance?type=statistics"),
      ]);

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setOverview(overviewData.overview);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setDocumentStats(statsData.statistics);
      }

      // TODO: Implement staff-level compliance endpoint
      // For now, we'll use mock data
      setStaffCompliance([]);
    } catch (error) {
      console.error("Error fetching compliance data:", error);
      setError("Failed to load compliance data");
    } finally {
      setLoading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4" />;
      case "needs_attention":
        return <Clock className="h-4 w-4" />;
      case "non_compliant":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
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
            <span className="ml-2">Loading compliance dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-gray-600">
            Monitor document compliance across your organization
          </p>
        </div>
        <Button onClick={fetchComplianceData} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Overall Compliance
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {overview.compliance_percentage}%
                  </p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
              <Progress
                value={overview.compliance_percentage}
                className="mt-3"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Staff
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {overview.total_staff}
                  </p>
                </div>
                <Users className="h-8 w-8 text-gray-500" />
              </div>
              <div className="mt-3 text-sm text-gray-600">
                {overview.compliant_staff} compliant,{" "}
                {overview.non_compliant_staff} non-compliant
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">
                    Expired Documents
                  </p>
                  <p className="text-3xl font-bold text-red-700">
                    {overview.total_expired_documents}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div className="mt-3 text-sm text-red-600">
                Require immediate attention
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">
                    Expiring Soon
                  </p>
                  <p className="text-3xl font-bold text-yellow-700">
                    {overview.total_expiring_soon_documents}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="mt-3 text-sm text-yellow-600">Within 30 days</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Staff Compliance Breakdown */}
      {overview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Staff Compliance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {overview.compliant_staff}
                </div>
                <div className="text-sm font-medium text-green-800 mb-1">
                  Compliant Staff
                </div>
                <div className="text-xs text-green-600">
                  {overview.total_staff > 0
                    ? Math.round(
                        (overview.compliant_staff / overview.total_staff) * 100
                      )
                    : 0}
                  % of total staff
                </div>
              </div>

              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {overview.needs_attention_staff}
                </div>
                <div className="text-sm font-medium text-yellow-800 mb-1">
                  Needs Attention
                </div>
                <div className="text-xs text-yellow-600">
                  {overview.total_staff > 0
                    ? Math.round(
                        (overview.needs_attention_staff /
                          overview.total_staff) *
                          100
                      )
                    : 0}
                  % of total staff
                </div>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {overview.non_compliant_staff}
                </div>
                <div className="text-sm font-medium text-red-800 mb-1">
                  Non-Compliant
                </div>
                <div className="text-xs text-red-600">
                  {overview.total_staff > 0
                    ? Math.round(
                        (overview.non_compliant_staff / overview.total_staff) *
                          100
                      )
                    : 0}
                  % of total staff
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Statistics by Type */}
      {documentStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Statistics by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(documentStats).map(([type, stats]) => (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">
                      {getDocumentTypeLabel(type)}
                    </h4>
                    <Badge variant="outline">{stats.total}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Valid</span>
                      <span className="font-medium">
                        {stats.total - stats.expired - stats.expiring_soon}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-600">Expiring Soon</span>
                      <span className="font-medium">{stats.expiring_soon}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Expired</span>
                      <span className="font-medium">{stats.expired}</span>
                    </div>
                  </div>

                  {/* Progress bar for this document type */}
                  <div className="mt-3">
                    <Progress
                      value={
                        stats.total > 0
                          ? ((stats.total - stats.expired) / stats.total) * 100
                          : 100
                      }
                      className="h-2"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {stats.total > 0
                        ? Math.round(
                            ((stats.total - stats.expired) / stats.total) * 100
                          )
                        : 100}
                      % valid
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {overview &&
        (overview.total_expired_documents > 0 ||
          overview.total_expiring_soon_documents > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overview.total_expired_documents > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Urgent:</strong>{" "}
                      {overview.total_expired_documents} document(s) have
                      expired and require immediate renewal or replacement.
                    </AlertDescription>
                  </Alert>
                )}

                {overview.total_expiring_soon_documents > 0 && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Upcoming:</strong>{" "}
                      {overview.total_expiring_soon_documents} document(s) will
                      expire within the next 30 days. Plan for renewal.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Recommended Actions:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • Review expired documents and initiate renewal process
                    </li>
                    <li>• Contact staff members with expiring documents</li>
                    <li>• Update document expiration tracking system</li>
                    <li>• Schedule regular compliance reviews</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Individual Staff Compliance Table */}
      {staffCompliance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Individual Staff Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffCompliance.map((staff) => (
                    <TableRow key={staff.staff_id}>
                      <TableCell className="font-medium">
                        {staff.staff_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{staff.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(staff.status)}
                        >
                          {getStatusIcon(staff.status)}
                          <span className="ml-1 capitalize">
                            {staff.status.replace("_", " ")}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {staff.total_documents} total
                      </TableCell>
                      <TableCell className="text-sm">
                        {staff.expired_documents > 0 && (
                          <span className="text-red-600">
                            {staff.expired_documents} expired
                          </span>
                        )}
                        {staff.expiring_soon_documents > 0 && (
                          <span className="text-yellow-600">
                            {staff.expired_documents > 0 && ", "}
                            {staff.expiring_soon_documents} expiring
                          </span>
                        )}
                        {staff.expired_documents === 0 &&
                          staff.expiring_soon_documents === 0 && (
                            <span className="text-green-600">No issues</span>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
