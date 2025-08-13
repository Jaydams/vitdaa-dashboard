"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  ArrowRight,
  UserX,
  RotateCcw,
  Users,
  Calendar,
  FileText,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import Breadcrumb from "@/components/shared/Breadcrumb";
import StaffOnboardingWorkflow from "@/components/staff/lifecycle/StaffOnboardingWorkflow";
import StaffTransferWorkflow from "@/components/staff/lifecycle/StaffTransferWorkflow";

interface LifecycleAction {
  id: string;
  type: "onboarding" | "transfer" | "termination" | "rehire";
  staffId?: string;
  staffName?: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  createdAt: string;
  completedAt?: string;
}

export default function StaffLifecyclePage() {
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Mock data - replace with actual API calls
  const [lifecycleActions] = useState<LifecycleAction[]>([
    {
      id: "1",
      type: "onboarding",
      staffName: "John Smith",
      status: "in-progress",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      type: "transfer",
      staffId: "staff-123",
      staffName: "Sarah Johnson",
      status: "pending",
      createdAt: "2024-01-14",
    },
    {
      id: "3",
      type: "termination",
      staffId: "staff-456",
      staffName: "Mike Wilson",
      status: "completed",
      createdAt: "2024-01-10",
      completedAt: "2024-01-12",
    },
  ]);

  const handleStartOnboarding = () => {
    setActiveWorkflow("onboarding");
  };

  const handleStartTransfer = (staff: any) => {
    setSelectedStaff(staff);
    setActiveWorkflow("transfer");
  };

  const handleStartTermination = (staff: any) => {
    setSelectedStaff(staff);
    setActiveWorkflow("termination");
  };

  const handleWorkflowComplete = (data: unknown) => {
    console.log("Workflow completed:", data);
    setActiveWorkflow(null);
    setSelectedStaff(null);
    // Handle completion logic here
  };

  const handleWorkflowCancel = () => {
    setActiveWorkflow(null);
    setSelectedStaff(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "in-progress":
        return (
          <Badge variant="default" className="bg-blue-500">
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            Completed
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "onboarding":
        return <UserPlus className="h-4 w-4" />;
      case "transfer":
        return <ArrowRight className="h-4 w-4" />;
      case "termination":
        return <UserX className="h-4 w-4" />;
      case "rehire":
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (activeWorkflow === "onboarding") {
    return (
      <StaffOnboardingWorkflow
        businessId="current-business-id"
        onComplete={handleWorkflowComplete}
        onSave={(data) => console.log("Saving progress:", data)}
      />
    );
  }

  if (activeWorkflow === "transfer" && selectedStaff) {
    return (
      <StaffTransferWorkflow
        staffId={selectedStaff.id}
        currentStaffData={selectedStaff}
        onComplete={handleWorkflowComplete}
        onCancel={handleWorkflowCancel}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb
        items={[
          {
            label: "Staff Management",
            href: "/staff",
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: "Lifecycle Management",
            icon: <GitBranch className="h-4 w-4" />,
          },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Lifecycle Management</h1>
          <p className="text-gray-600">
            Manage staff onboarding, transfers, terminations, and rehiring
            processes
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="terminations">Terminations</TabsTrigger>
          <TabsTrigger value="rehiring">Rehiring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  onClick={handleStartOnboarding}
                  className="h-20 flex flex-col items-center gap-2"
                  variant="outline"
                >
                  <UserPlus className="h-6 w-6" />
                  <span>New Onboarding</span>
                </Button>
                <Button
                  onClick={() =>
                    handleStartTransfer({
                      id: "demo-staff",
                      name: "Demo Staff",
                      position: "Server",
                      department: "Service",
                      manager: "John Manager",
                      salary: 15.5,
                    })
                  }
                  className="h-20 flex flex-col items-center gap-2"
                  variant="outline"
                >
                  <ArrowRight className="h-6 w-6" />
                  <span>Staff Transfer</span>
                </Button>
                <Button
                  onClick={() =>
                    handleStartTermination({
                      id: "demo-staff",
                      name: "Demo Staff",
                      position: "Server",
                      department: "Service",
                      startDate: "2023-01-15",
                    })
                  }
                  className="h-20 flex flex-col items-center gap-2"
                  variant="outline"
                >
                  <UserX className="h-6 w-6" />
                  <span>Termination</span>
                </Button>
                <Button
                  className="h-20 flex flex-col items-center gap-2"
                  variant="outline"
                >
                  <RotateCcw className="h-6 w-6" />
                  <span>Rehire Staff</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Lifecycle Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lifecycleActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getActionIcon(action.type)}
                      <div>
                        <p className="font-medium">
                          {action.type.charAt(0).toUpperCase() +
                            action.type.slice(1)}{" "}
                          - {action.staffName}
                        </p>
                        <p className="text-sm text-gray-600">
                          Started on{" "}
                          {new Date(action.createdAt).toLocaleDateString()}
                          {action.completedAt &&
                            ` • Completed on ${new Date(
                              action.completedAt
                            ).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(action.status)}
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Staff Onboarding</CardTitle>
              <p className="text-gray-600">
                Streamlined onboarding process for new staff members
              </p>
            </CardHeader>
            <CardContent>
              <Button onClick={handleStartOnboarding} className="mb-4">
                <UserPlus className="h-4 w-4 mr-2" />
                Start New Onboarding
              </Button>

              <div className="space-y-4">
                <h3 className="font-medium">Active Onboarding Processes</h3>
                {lifecycleActions
                  .filter((action) => action.type === "onboarding")
                  .map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{action.staffName}</p>
                        <p className="text-sm text-gray-600">
                          Started{" "}
                          {new Date(action.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(action.status)}
                        <Button variant="outline" size="sm">
                          Continue
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <CardTitle>Staff Transfers</CardTitle>
              <p className="text-gray-600">
                Manage role changes and department transfers
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lifecycleActions
                  .filter((action) => action.type === "transfer")
                  .map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{action.staffName}</p>
                        <p className="text-sm text-gray-600">
                          Transfer requested{" "}
                          {new Date(action.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(action.status)}
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terminations">
          <Card>
            <CardHeader>
              <CardTitle>Staff Terminations</CardTitle>
              <p className="text-gray-600">
                Handle staff departures and exit processes
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lifecycleActions
                  .filter((action) => action.type === "termination")
                  .map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{action.staffName}</p>
                        <p className="text-sm text-gray-600">
                          Process started{" "}
                          {new Date(action.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(action.status)}
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rehiring">
          <Card>
            <CardHeader>
              <CardTitle>Staff Rehiring</CardTitle>
              <p className="text-gray-600">
                Rehire former staff members with historical data restoration
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <RotateCcw className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  No rehiring processes currently active
                </p>
                <Button className="mt-4" variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Rehiring Process
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
