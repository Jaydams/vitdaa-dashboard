"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Activity, Clock, UserPlus } from "lucide-react";

import StaffSignInInterface from "./StaffSignInInterface";
import { Staff } from "@/types/staff";
import { StaffSessionRecord } from "@/types/auth";

interface StaffSignInData {
  availableStaff: Staff[];
  activeStaffSessions: (StaffSessionRecord & { staff: Staff })[];
  businessOwnerId: string;
}

interface StaffSignInSectionProps {
  onOpenCreateDialog?: () => void;
}

function StaffSignInSkeleton() {
  return (
    <div className="space-y-6">
      {/* Sign In Section Skeleton */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Active Staff Section Skeleton */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-16 rounded" />
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffSignInSection({ onOpenCreateDialog }: StaffSignInSectionProps) {
  const [data, setData] = useState<StaffSignInData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/staff/active");

        if (!response.ok) {
          if (response.status === 401) {
            setError("Please log in to access staff management");
          } else if (response.status === 403) {
            setError(
              "Access denied. This feature is only available to business owners."
            );
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching staff data:", err);
        setError("Failed to load staff data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <StaffSignInSkeleton />;
  }

  if (error || !data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
              <Users className="h-8 w-8 opacity-50" />
            </div>
            <h3 className="text-lg font-medium mb-2">Unable to Load Staff Data</h3>
            <p className="text-sm">{error || "Please try again later."}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <StaffSignInInterface
      availableStaff={data.availableStaff}
      activeStaffSessions={data.activeStaffSessions}
      businessOwnerId={data.businessOwnerId}
      onOpenCreateDialog={onOpenCreateDialog}
    />
  );
}
