import { PenSquare, Trash2, ExternalLink, User, Mail, Phone, Calendar, Shield, Activity, Clock, Key, Settings, Eye, MoreHorizontal } from "lucide-react";
import StaffPinManagement from "../StaffPinManagement";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import Typography from "@/components/ui/typography";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Staff } from "@/types/staff";
import { StaffSessionRecord } from "@/types/auth";
import { SkeletonColumn } from "@/types/skeleton";
import { StaffWithSession } from "@/data/staff";
import { deleteStaff } from "@/actions/auth-actions";
import { toast } from "sonner";

const handleSwitchChange = () => {};

const handleDeleteStaff = async (staffId: string, staffName: string) => {
  try {
    const formData = new FormData();
    formData.append("staffId", staffId);
    
    await deleteStaff(formData);
    
    toast.success("Staff member deleted successfully", {
      description: `${staffName} has been removed from your team.`,
    });
  } catch (error) {
    console.error("Error deleting staff:", error);
    
    // Check if it's a specific error about active sessions
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as any).message;
      if (errorMessage && errorMessage.includes('active sessions')) {
        toast.error("Cannot delete staff member", {
          description: "This staff member has active sessions. Please sign them out first before deleting.",
        });
        return;
      }
    }
    
    toast.error("Failed to delete staff member", {
      description: "Please try again or contact support if the issue persists.",
    });
  }
};

export const columns: ColumnDef<StaffWithSession>[] = [
  {
    header: "Staff Member",
    cell: ({ row }) => (
      <Link
        href={`/staff/${row.original.id}`}
        className="flex gap-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800 -m-2 p-2 rounded-md transition-colors group"
      >
        <div className="size-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {row.original.first_name.charAt(0)}
            {row.original.last_name.charAt(0)}
          </span>
        </div>

        <div className="flex flex-col">
          <Typography className="font-semibold text-gray-900 dark:text-gray-100">
            {row.original.first_name} {row.original.last_name}
          </Typography>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant="secondary"
              className="text-xs capitalize bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            >
              {row.original.role}
            </Badge>
            <div
              className={`w-2 h-2 rounded-full ${
                row.original.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
            <span className="text-xs">
              {row.original.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </Link>
    ),
  },
  {
    header: "Contact",
    cell: ({ row }) => (
      <div className="space-y-1">
        {row.original.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
              {row.original.email}
            </span>
          </div>
        )}
        {row.original.phone_number && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3 w-3 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {row.original.phone_number}
            </span>
          </div>
        )}
        {!row.original.email && !row.original.phone_number && (
          <span className="text-sm text-muted-foreground">No contact info</span>
        )}
      </div>
    ),
  },
  {
    header: "Session",
    cell: ({ row }) => {
      const activeSession = row.original.activeSession;
      const isSignedIn = activeSession && activeSession.is_active;

      return (
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-400" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isSignedIn ? "Signed In" : "Signed Out"}
            </span>
            {isSignedIn && activeSession?.signed_in_at && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(activeSession.signed_in_at), "HH:mm")}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    header: "Permissions",
    cell: ({ row }) => {
      const totalPermissions = row.original.totalPermissions || 0;
      
      return (
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {totalPermissions} permissions
          </span>
        </div>
      );
    },
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <Link href={`/staff/${row.original.id}`} className="flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <StaffPinManagement staff={row.original} />
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Sheet>
                <SheetTrigger asChild>
                  <div className="flex items-center w-full cursor-pointer">
                    <Key className="mr-2 h-4 w-4" />
                    Manage Permissions
                  </div>
                </SheetTrigger>
                <SheetContent className="w-[600px] max-w-[90vw]">
                  <SheetHeader className="pb-6">
                    <SheetTitle>Manage Permissions</SheetTitle>
                    <SheetDescription>
                      Configure access permissions for {row.original.first_name} {row.original.last_name}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-6 px-1">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Current Role: {row.original.role}</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {row.original.totalPermissions || 0} active permissions
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Available Permissions</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {['orders:read', 'orders:create', 'orders:update', 'tables:read', 'tables:update', 'customers:read', 'payments:process', 'inventory:read', 'inventory:update', 'reports:read'].map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox id={permission} />
                              <Label htmlFor={permission} className="text-sm">
                                {permission.split(':')[1]} {permission.split(':')[0]}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <SheetFooter className="pt-6">
                    <SheetClose asChild>
                      <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white border-0">
                        Save Permissions
                      </Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Sheet>
                <SheetTrigger asChild>
                  <div className="flex items-center w-full cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Change Role
                  </div>
                </SheetTrigger>
                <SheetContent className="w-[500px] max-w-[90vw]">
                  <SheetHeader className="pb-6">
                    <SheetTitle>Change Staff Role</SheetTitle>
                    <SheetDescription>
                      Update the role for {row.original.first_name} {row.original.last_name}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-6 px-1">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Current Role</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {row.original.role}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Select New Role</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {['reception', 'kitchen', 'bar', 'accountant', 'storekeeper', 'waiter'].map((role) => (
                            <div key={role} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={role}
                                name="role"
                                value={role}
                                defaultChecked={role === row.original.role}
                                className="text-blue-600"
                              />
                              <Label htmlFor={role} className="text-sm capitalize">
                                {role}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <SheetFooter className="pt-6">
                    <SheetClose asChild>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                        Update Role
                      </Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Sheet>
                <SheetTrigger asChild>
                  <div className="flex items-center w-full cursor-pointer">
                    <PenSquare className="mr-2 h-4 w-4" />
                    Edit Staff
                  </div>
                </SheetTrigger>
                <SheetContent className="w-[500px] max-w-[90vw]">
                  <SheetHeader className="pb-6">
                    <SheetTitle>Edit Staff Member</SheetTitle>
                    <SheetDescription>
                      Update information for {row.original.first_name} {row.original.last_name}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-6 px-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          defaultValue={row.original.first_name}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          defaultValue={row.original.last_name}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        defaultValue={row.original.email || ""}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        defaultValue={row.original.phone_number || ""}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <SheetFooter className="pt-6">
                    <SheetClose asChild>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                        Save Changes
                      </Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <div className="flex items-center w-full cursor-pointer text-red-600 dark:text-red-400">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Staff
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader className="pb-4">
                    <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                      Are you sure you want to delete{" "}
                      <strong>{row.original.first_name} {row.original.last_name}</strong>? 
                      This action will:
                      <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
                        <li>Terminate all active sessions for this staff member</li>
                        <li>Permanently remove them from your team</li>
                        <li>Delete all associated data (cannot be undone)</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="pt-4">
                    <AlertDialogCancel className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteStaff(row.original.id, `${row.original.first_name} ${row.original.last_name}`)}
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                      Delete Staff Member
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const skeletonColumns: SkeletonColumn[] = [
  {
    header: "Staff Member",
    cell: (
      <div className="flex gap-3 items-center">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
    ),
  },
  {
    header: "Contact",
    cell: (
      <div className="space-y-2">
        <Skeleton className="w-40 h-4" />
        <Skeleton className="w-32 h-4" />
      </div>
    ),
  },
  {
    header: "Session",
    cell: (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <div className="space-y-1">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
    ),
  },
  {
    header: "Permissions",
    cell: (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="w-24 h-4" />
      </div>
    ),
  },
  {
    header: "Actions",
    cell: <Skeleton className="w-8 h-8" />,
  },
];
