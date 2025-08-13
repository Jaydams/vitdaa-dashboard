"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit,
  Save,
  RefreshCw,
  UserCheck,
  UserX
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { Staff } from "@/types/staff";

interface StaffPermissionsManagementProps {
  staffId: string;
  staff: Staff;
}

interface Permission {
  id: string;
  permission_name: string;
  is_granted: boolean;
  granted_at: string;
  expires_at?: string;
  notes?: string;
  granted_by: string;
}

interface RoleTemplate {
  role_name: string;
  permissions: string[];
  description: string;
}

export default function StaffPermissionsManagement({
  staffId,
  staff,
}: StaffPermissionsManagementProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [newPermission, setNewPermission] = useState({
    permission_name: "",
    is_granted: true,
    expires_at: "",
    notes: "",
  });
  const [isAddingPermission, setIsAddingPermission] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(staff.role);

  const queryClient = useQueryClient();

  // Fetch staff permissions
  const {
    data: permissionsData,
    isLoading: isLoadingPermissions,
    error: permissionsError,
  } = useQuery({
    queryKey: ["staff-permissions", staffId],
    queryFn: async () => {
      const response = await fetch(`/api/staff/${staffId}/permissions`);
      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }
      return response.json();
    },
  });

  // Fetch available role templates
  const {
    data: roleTemplates,
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ["role-templates"],
    queryFn: async () => {
      const response = await fetch("/api/role-templates");
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
  });

  const permissions = permissionsData?.permissions || [];
  const availablePermissions = permissionsData?.availablePermissions || [];

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async (permissionData: {
      permission_name: string;
      is_granted: boolean;
      expires_at?: string;
      notes?: string;
    }) => {
      const response = await fetch(`/api/staff/${staffId}/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(permissionData),
      });
      if (!response.ok) {
        throw new Error("Failed to update permission");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", staffId] });
      toast.success("Permission updated successfully");
      setNewPermission({
        permission_name: "",
        is_granted: true,
        expires_at: "",
        notes: "",
      });
      setIsAddingPermission(false);
    },
    onError: (error) => {
      toast.error("Failed to update permission");
      console.error("Error updating permission:", error);
    },
  });

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: async (permissionName: string) => {
      const response = await fetch(`/api/staff/${staffId}/permissions?permission=${permissionName}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete permission");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", staffId] });
      toast.success("Permission removed successfully");
    },
    onError: (error) => {
      toast.error("Failed to remove permission");
      console.error("Error deleting permission:", error);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      const response = await fetch(`/api/staff/${staffId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!response.ok) {
        throw new Error("Failed to update role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", staffId] });
      queryClient.invalidateQueries({ queryKey: ["staff", staffId] });
      toast.success("Role updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update role");
      console.error("Error updating role:", error);
    },
  });

  const handleAddPermission = () => {
    if (!newPermission.permission_name) {
      toast.error("Please select a permission");
      return;
    }

    updatePermissionsMutation.mutate(newPermission);
  };

  const handleDeletePermission = (permissionName: string) => {
    deletePermissionMutation.mutate(permissionName);
  };

  const handleRoleChange = (newRole: string) => {
    updateRoleMutation.mutate(newRole);
  };

  const getPermissionStatusColor = (isGranted: boolean) => {
    return isGranted
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  const getPermissionStatusIcon = (isGranted: boolean) => {
    return isGranted ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
  };

  if (isLoadingPermissions) {
    return <StaffPermissionsSkeleton />;
  }

  if (permissionsError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Permissions
            </h3>
            <p className="text-gray-600 mb-4">
              Failed to load permissions for this staff member.
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Role and Permissions Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="text-sm capitalize">
                    {staff.role}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingPermission(false)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Total Permissions</Label>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {permissions.filter((p: Permission) => p.is_granted).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Active Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {permissions.filter((p: Permission) => p.is_granted).slice(0, 5).map((permission: Permission) => (
                <div key={permission.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {permission.permission_name.split(':')[1]} {permission.permission_name.split(':')[0]}
                  </span>
                  <Badge className={getPermissionStatusColor(permission.is_granted)}>
                    {getPermissionStatusIcon(permission.is_granted)}
                    Active
                  </Badge>
                </div>
              ))}
              {permissions.filter((p: Permission) => p.is_granted).length > 5 && (
                <div className="text-sm text-muted-foreground">
                  +{permissions.filter((p: Permission) => p.is_granted).length - 5} more permissions
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Denied Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {permissions.filter((p: Permission) => !p.is_granted).slice(0, 5).map((permission: Permission) => (
                <div key={permission.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {permission.permission_name.split(':')[1]} {permission.permission_name.split(':')[0]}
                  </span>
                  <Badge className={getPermissionStatusColor(permission.is_granted)}>
                    {getPermissionStatusIcon(permission.is_granted)}
                    Denied
                  </Badge>
                </div>
              ))}
              {permissions.filter((p: Permission) => !p.is_granted).length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No denied permissions
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Current Role</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {staff.role}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Change Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleTemplates?.map((template: RoleTemplate) => (
                      <SelectItem key={template.role_name} value={template.role_name}>
                        {template.role_name.charAt(0).toUpperCase() + template.role_name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleRoleChange(selectedRole)}
                disabled={selectedRole === staff.role}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Update Role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Permission Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Add New Permission */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Add New Permission</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingPermission(!isAddingPermission)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAddingPermission ? "Cancel" : "Add Permission"}
                </Button>
              </div>
              
              {isAddingPermission && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Permission</Label>
                      <Select
                        value={newPermission.permission_name}
                        onValueChange={(value) => setNewPermission(prev => ({ ...prev, permission_name: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select permission" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePermissions.map((permission: string) => (
                            <SelectItem key={permission} value={permission}>
                              {permission.split(':')[1]} {permission.split(':')[0]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Select
                        value={newPermission.is_granted ? "grant" : "deny"}
                        onValueChange={(value) => setNewPermission(prev => ({ ...prev, is_granted: value === "grant" }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grant">Grant</SelectItem>
                          <SelectItem value="deny">Deny</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Expires At (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={newPermission.expires_at}
                        onChange={(e) => setNewPermission(prev => ({ ...prev, expires_at: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Notes (Optional)</Label>
                      <Input
                        value={newPermission.notes}
                        onChange={(e) => setNewPermission(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add notes..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddPermission}
                      disabled={!newPermission.permission_name}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Add Permission
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingPermission(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Current Permissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Current Permissions</h4>
              <div className="space-y-3">
                {permissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No permissions assigned</p>
                  </div>
                ) : (
                  permissions.map((permission: Permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {permission.permission_name.split(':')[1]} {permission.permission_name.split(':')[0]}
                          </span>
                          <Badge className={getPermissionStatusColor(permission.is_granted)}>
                            {getPermissionStatusIcon(permission.is_granted)}
                            {permission.is_granted ? "Granted" : "Denied"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Granted: {new Date(permission.granted_at).toLocaleDateString()}</span>
                          {permission.expires_at && (
                            <span>Expires: {new Date(permission.expires_at).toLocaleDateString()}</span>
                          )}
                          {permission.notes && (
                            <span>Notes: {permission.notes}</span>
                          )}
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md">
                          <AlertDialogHeader className="pb-4">
                            <AlertDialogTitle>Remove Permission</AlertDialogTitle>
                            <AlertDialogDescription className="pt-2">
                              Are you sure you want to remove the permission "{permission.permission_name}" from {staff.first_name} {staff.last_name}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="pt-4">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePermission(permission.permission_name)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove Permission
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffPermissionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
