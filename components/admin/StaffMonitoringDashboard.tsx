"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Monitor, Activity, Users, Settings } from "lucide-react";
import StaffActivitySummaryComponent from "./StaffActivitySummary";
import SessionManagementDashboard from "./SessionManagementDashboard";

interface StaffMonitoringDashboardProps {
  businessId: string;
}

export default function StaffMonitoringDashboard({
  businessId,
}: StaffMonitoringDashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-6 w-6" />
                Staff Monitoring & Management
              </CardTitle>
              <CardDescription>
                Monitor staff activity, manage active sessions, and track
                performance metrics
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              Refresh All Data
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Sessions
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Tracking
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <SessionManagementDashboard
            key={`sessions-${refreshKey}`}
            businessId={businessId}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <StaffActivitySummaryComponent
            key={`activity-${refreshKey}`}
            businessId={businessId}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Settings</CardTitle>
              <CardDescription>
                Configure staff monitoring and activity tracking settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Session Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-3">
                    Session Management
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Auto Session Timeout</p>
                        <p className="text-sm text-gray-600">
                          Automatically sign out inactive staff after 8 hours
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">8 hours</div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Idle Time Warning</p>
                        <p className="text-sm text-gray-600">
                          Mark sessions as idle after 30 minutes of inactivity
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">30 minutes</div>
                    </div>
                  </div>
                </div>

                {/* Activity Tracking Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-3">
                    Activity Tracking
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Activity Log Retention</p>
                        <p className="text-sm text-gray-600">
                          Keep activity logs for 90 days
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">90 days</div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Real-time Monitoring</p>
                        <p className="text-sm text-gray-600">
                          Track page visits and actions in real-time
                        </p>
                      </div>
                      <div className="text-sm text-green-600">Enabled</div>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Long Session Alerts</p>
                        <p className="text-sm text-gray-600">
                          Get notified when staff sessions exceed 10 hours
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">Disabled</div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Idle Session Alerts</p>
                        <p className="text-sm text-gray-600">
                          Get notified when staff are idle for over 1 hour
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">Disabled</div>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Data Management</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      Export Activity Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Export Session Reports
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-700"
                    >
                      Clear Old Activity Logs
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
