"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import StaffProfileHeader from "./StaffProfileHeader";
import StaffProfileManagement from "./StaffProfileManagement";
import StaffSalaryManagement from "./StaffSalaryManagement";
import StaffScheduleManagement from "./StaffScheduleManagement";
import StaffAttendanceManagement from "./StaffAttendanceManagement";
import StaffPerformanceManagement from "./StaffPerformanceManagement";
import StaffSessionMonitoring from "./StaffSessionMonitoring";
import StaffDocumentManagement from "./StaffDocumentManagement";
import StaffPermissionsManagement from "./StaffPermissionsManagement";

import { StaffProfileHubProps } from "@/types/staff";
import { fetchStaffById } from "@/data/staff";

export default function StaffProfileHub({
  staffId,
  initialTab = "profile",
}: StaffProfileHubProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const {
    data: staff,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["staff", staffId],
    queryFn: () => fetchStaffById(staffId),
    retry: 1,
  });

  if (isLoading) {
    return <StaffProfileHubSkeleton />;
  }

  if (isError || !staff) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/staff">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Staff
            </Button>
          </Link>
        </div>

        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Staff Member Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The staff member you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view them.
          </p>
          <Link href="/staff">
            <Button>Return to Staff List</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/staff">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Staff
          </Button>
        </Link>
      </div>

      {/* Staff Profile Header */}
      <StaffProfileHeader staff={staff} />

      {/* Tabbed Interface */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <StaffProfileManagement staffId={staffId} staff={staff} />
        </TabsContent>

        <TabsContent value="salary" className="space-y-6">
          <StaffSalaryManagement staffId={staffId} staff={staff} />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <StaffScheduleManagement staffId={staffId} staff={staff} />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <StaffAttendanceManagement staffId={staffId} staff={staff} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <StaffPerformanceManagement staffId={staffId} staff={staff} />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <StaffSessionMonitoring staffId={staffId} staff={staff} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <StaffDocumentManagement staffId={staffId} staff={staff} />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <StaffPermissionsManagement staffId={staffId} staff={staff} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StaffProfileHubSkeleton() {
  return (
    <div className="space-y-6">
      {/* Navigation Skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Header Skeleton */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start gap-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
