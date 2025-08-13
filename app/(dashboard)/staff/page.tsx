"use client";

import { useState } from "react";
import { Metadata } from "next";
import { Users, Shield, UserPlus, Activity, Settings } from "lucide-react";

import PageTitle from "@/components/shared/PageTitle";
import StaffFilters from "./_components/StaffFilters";
import StaffTable from "./_components/staff-table";
import StaffSignInSection from "./_components/StaffSignInSection";
import StaffPinSuccessHandler from "./_components/StaffPinSuccessHandler";
import CreateStaffForm from "./_components/CreateStaffForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function StaffPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const handleCreateSuccess = () => {
    // Trigger refetch by incrementing the trigger
    setRefetchTrigger(prev => prev + 1);
    // Close the dialog
    setIsCreateDialogOpen(false);
  };

  const handleCreateCancel = () => {
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Staff Management
                </h1>
                <p className="text-muted-foreground">
                  Manage your team members, roles, and access permissions
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
              <Shield className="h-3 w-3 mr-1" />
              Secure Access
            </Badge>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Staff</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Active Sessions</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">5</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Available</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">7</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Messages for PIN Operations */}
      <StaffPinSuccessHandler />

      {/* Staff Management Sections */}
      <div className="space-y-8">
        {/* Sign In Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Staff Sessions
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage active staff sessions and sign in new team members
              </p>
            </div>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              <Settings className="h-3 w-3 mr-1" />
              Session Management
            </Badge>
          </div>
          <StaffSignInSection onOpenCreateDialog={() => setIsCreateDialogOpen(true)} />
        </section>

        <Separator />

        {/* All Staff Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Staff Members
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                View and manage all staff members, their roles, and permissions
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
              <Shield className="h-3 w-3 mr-1" />
              Role Management
            </Badge>
          </div>
          <StaffFilters onOpenCreateDialog={() => setIsCreateDialogOpen(true)} />
          <StaffTable refetchTrigger={refetchTrigger} />
        </section>
      </div>

      {/* Create Staff Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Staff Member
            </DialogTitle>
          </DialogHeader>
          <CreateStaffForm 
            onSuccess={handleCreateSuccess}
            onCancel={handleCreateCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
