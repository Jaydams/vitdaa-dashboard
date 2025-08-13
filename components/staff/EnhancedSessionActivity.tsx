"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  BarChart3,
  Clock,
  Eye,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import RealTimeActivityMonitor from "./RealTimeActivityMonitor";
import SessionHistoryAnalytics from "./SessionHistoryAnalytics";

interface EnhancedSessionActivityProps {
  businessId: string;
  staffId?: string; // If provided, shows individual staff analytics
  staffName?: string;
  showRealTimeMonitor?: boolean;
  showHistoryAnalytics?: boolean;
  defaultTab?: "realtime" | "analytics";
}

export default function EnhancedSessionActivity({
  businessId,
  staffId,
  staffName,
  showRealTimeMonitor = true,
  showHistoryAnalytics = true,
  defaultTab = "realtime",
}: EnhancedSessionActivityProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // If both staffId and no restrictions, show both tabs
  // If only businessId (no staffId), show only real-time monitor
  // If staffId provided, can show both but default to analytics
  const showTabs = showRealTimeMonitor && showHistoryAnalytics;
  const showIndividualAnalytics = staffId && staffName && showHistoryAnalytics;
  const showBusinessMonitor = showRealTimeMonitor;

  if (!showTabs) {
    // Single view mode
    if (showIndividualAnalytics) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Session Activity</h2>
          </div>
          <SessionHistoryAnalytics
            businessId={businessId}
            staffId={staffId!}
            staffName={staffName!}
          />
        </div>
      );
    }

    if (showBusinessMonitor) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Real-Time Activity Monitor</h2>
          </div>
          <RealTimeActivityMonitor businessId={businessId} />
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Enhanced Session Activity</h2>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Live Monitoring
          </Badge>
          {showIndividualAnalytics && (
            <Badge variant="outline" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Analytics
            </Badge>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          {showBusinessMonitor && (
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Real-Time Monitor
            </TabsTrigger>
          )}
          {showIndividualAnalytics && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics & History
            </TabsTrigger>
          )}
        </TabsList>

        {showBusinessMonitor && (
          <TabsContent value="realtime" className="space-y-4">
            <RealTimeActivityMonitor businessId={businessId} />
          </TabsContent>
        )}

        {showIndividualAnalytics && (
          <TabsContent value="analytics" className="space-y-4">
            <SessionHistoryAnalytics
              businessId={businessId}
              staffId={staffId!}
              staffName={staffName!}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Specialized components for different use cases

export function BusinessActivityMonitor({
  businessId,
}: {
  businessId: string;
}) {
  return (
    <EnhancedSessionActivity
      businessId={businessId}
      showRealTimeMonitor={true}
      showHistoryAnalytics={false}
    />
  );
}

export function StaffActivityAnalytics({
  businessId,
  staffId,
  staffName,
}: {
  businessId: string;
  staffId: string;
  staffName: string;
}) {
  return (
    <EnhancedSessionActivity
      businessId={businessId}
      staffId={staffId}
      staffName={staffName}
      showRealTimeMonitor={false}
      showHistoryAnalytics={true}
      defaultTab="analytics"
    />
  );
}

export function ComprehensiveActivityView({
  businessId,
  staffId,
  staffName,
}: {
  businessId: string;
  staffId?: string;
  staffName?: string;
}) {
  return (
    <EnhancedSessionActivity
      businessId={businessId}
      staffId={staffId}
      staffName={staffName}
      showRealTimeMonitor={true}
      showHistoryAnalytics={!!staffId && !!staffName}
      defaultTab={staffId ? "analytics" : "realtime"}
    />
  );
}
