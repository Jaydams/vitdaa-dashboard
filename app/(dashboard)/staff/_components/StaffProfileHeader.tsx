"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Settings,
  MoreHorizontal,
  Edit,
  UserX,
  UserCheck,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

import { Staff } from "@/types/staff";

interface StaffProfileHeaderProps {
  staff: Staff;
}

export default function StaffProfileHeader({ staff }: StaffProfileHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "default" : "secondary";
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? "Active" : "Inactive";
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? "🟢" : "🔴";
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      reception: "Reception",
      kitchen: "Kitchen Staff",
      bar: "Bar Staff",
      accountant: "Accountant",
    };
    return roleMap[role] || role;
  };

  const handleStatusToggle = async () => {
    setIsLoading(true);
    const newStatus = !staff.is_active;
    const statusText = newStatus ? "activated" : "deactivated";

    try {
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: newStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update staff status");
      }

      toast.success(`Staff member ${statusText} successfully`);

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Failed to toggle staff status:", error);
      toast.error(
        `Failed to ${newStatus ? "activate" : "deactivate"} staff member`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between">
          {/* Left Section - Profile Info */}
          <div className="flex items-start gap-6">
            {/* Profile Image */}
            <Avatar className="w-24 h-24 ring-2 ring-gray-200 ring-offset-2">
              <AvatarImage
                src={staff.profile_image_url}
                alt={`${staff.first_name} ${staff.last_name}`}
                className="object-cover"
              />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(staff.first_name, staff.last_name)}
              </AvatarFallback>
            </Avatar>

            {/* Basic Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {staff.first_name} {staff.last_name}
                </h1>
                <p className="text-lg text-gray-600 capitalize">
                  {getRoleDisplayName(staff.role)}
                </p>
                {staff.department && (
                  <p className="text-sm text-gray-500 capitalize">
                    {staff.department} Department
                  </p>
                )}
              </div>

              {/* Status and Employee Info */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge
                  variant={getStatusColor(staff.is_active)}
                  className="text-xs flex items-center gap-1 transition-all duration-200"
                >
                  <span className="text-xs animate-pulse">
                    {getStatusIcon(staff.is_active)}
                  </span>
                  {getStatusText(staff.is_active)}
                </Badge>

                {staff.employee_id && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>ID: {staff.employee_id}</span>
                  </div>
                )}

                {staff.employment_start_date && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Started{" "}
                      {format(
                        new Date(staff.employment_start_date),
                        "MMM dd, yyyy"
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="flex items-center gap-6 flex-wrap">
                {staff.email && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={`mailto:${staff.email}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        <span className="truncate max-w-48">{staff.email}</span>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to send email to {staff.email}</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {staff.phone_number && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={`tel:${staff.phone_number}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{staff.phone_number}</span>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to call {staff.phone_number}</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {staff.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate max-w-48">
                      {staff.address.city}, {staff.address.state}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleStatusToggle}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : staff.is_active ? (
                    <>
                      <UserX className="w-4 h-4 mr-2" />
                      Deactivate Staff
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Activate Staff
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Permissions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Additional Info Row */}
        {(staff.emergency_contact_name || staff.notes) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.emergency_contact_name && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Emergency Contact
                  </h4>
                  <p className="text-sm text-gray-600">
                    {staff.emergency_contact_name}
                    {staff.emergency_contact_relationship &&
                      ` (${staff.emergency_contact_relationship})`}
                  </p>
                  {staff.emergency_contact_phone && (
                    <p className="text-sm text-gray-500">
                      {staff.emergency_contact_phone}
                    </p>
                  )}
                </div>
              )}

              {staff.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Notes
                  </h4>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {staff.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
