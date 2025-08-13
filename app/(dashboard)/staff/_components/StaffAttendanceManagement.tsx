"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceTracking } from "@/components/staff/attendance-tracking";
import { AttendanceReports } from "@/components/staff/attendance-reports";
import { Staff } from "@/types/staff";

interface StaffAttendanceManagementProps {
  staffId: string;
  staff: Staff;
}

export default function StaffAttendanceManagement({
  staffId,
  staff,
}: StaffAttendanceManagementProps) {
  const [activeTab, setActiveTab] = useState("tracking");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Attendance Management
        </h2>
        <p className="text-muted-foreground">
          Track {staff.first_name}&apos;s attendance, clock in/out times, and
          generate reports
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value)}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="tracking">Time Tracking</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-6">
          <AttendanceTracking staffId={staffId} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AttendanceReports staffId={staffId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
